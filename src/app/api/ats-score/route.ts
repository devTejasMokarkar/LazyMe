import { NextRequest, NextResponse } from "next/server";
import { resumeToPlainText } from "@/features/ai/utils/resume-text";
import { genericWords } from "@/features/ai/utils/ats-words";
import { logger } from "@/lib/logger";

function tokenize(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\+\#\.\-]/g, " ").split(/\s+/);
  return words.filter(w => w.length > 2 && !genericWords.has(w)).map(normalizeWord);
}

function extractPhrases(words: string[], maxLen = 3): string[] {
  const phrases: string[] = [];
  for (let len = 2; len <= maxLen; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const chunk = words.slice(i, i + len);
      if (chunk.every(w => genericWords.has(w))) continue;
      const phrase = chunk.join(" ");
      if (phrase.length > 4) phrases.push(phrase);
    }
  }
  return phrases;
}

function normalizeWord(w: string): string {
  if (w.endsWith("s") && w.length > 4) return w.slice(0, -1);
  return w;
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();
    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const resumeText = typeof resume === "string" ? resume : resumeToPlainText(resume);

    // Extract structured resume fields
    const titleInResume = (resume.title || "").trim();
    const summaryText = resume.summary || "";
    const skillsList: string[] = (() => {
      if (Array.isArray(resume.skills)) return resume.skills.map((s: string) => s.toLowerCase().trim());
      if (resume.skills && typeof resume.skills === 'object') {
        const allSkills: string[] = [];
        for (const val of Object.values(resume.skills)) {
          if (Array.isArray(val)) allSkills.push(...val.map((s: string) => s.toLowerCase().trim()));
        }
        return allSkills;
      }
      return [];
    })();
    const experienceItems = Array.isArray(resume.experience) ? resume.experience : [];
    const bulletTexts: string[] = experienceItems.flatMap((e: any) =>
      (Array.isArray(e.bullets) ? e.bullets : []).map((b: string) => b.toLowerCase())
    );

    // Extract JD title
    const jdLower = jobDescription.toLowerCase();
    const titleMatch = jdLower.match(/(?:^|role|position|title)[:\s]+([^\n,]{1,60})/i);
    const titleInJd = titleMatch
      ? titleMatch[1].trim()
      : jdLower.split("\n")[0].trim().slice(0, 60);

    // Tokenize JD into words and phrases
    const jdWords = tokenize(jobDescription);
    const jdPhrases = extractPhrases(jdWords);
    const jdTermSet = new Set([...jdWords, ...jdPhrases]);
    const allJdTerms = Array.from(jdTermSet);

    if (allJdTerms.length === 0) {
      return NextResponse.json({
        overall_score: 50,
        breakdown: {
          title_match: { score: 0, max: 30 },
          experience_keywords: { score: 0, max: 25 },
          skills_keywords: { score: 0, max: 15 },
          summary_keywords: { score: 0, max: 10 },
          format_structure: { score: 8, max: 8 },
          section_headers: { score: 5, max: 5 },
          dates_consistency: { score: 4, max: 4 },
          education_match: { score: 2, max: 2 },
          quantified_achievements: { score: 1, max: 1 },
        },
        missing_keywords: [],
        found_keywords: [],
        title_in_resume: titleInResume,
        title_in_jd: titleInJd,
        weak_sections: [],
      });
    }

    // Track which JD terms are found anywhere in the resume
    const foundInResume = new Set<string>();

    // ─── 1. TITLE MATCH ───────────────────────────────────────────────────
    const titleResumeWords = tokenize(titleInResume);
    const titleSummaryWords = tokenize(summaryText);
    const titlePool = new Set([...titleResumeWords, ...titleSummaryWords, ...extractPhrases(titleResumeWords), ...extractPhrases(titleSummaryWords)]);
    const titleMatches = allJdTerms.filter(t => titlePool.has(t));
    titleMatches.forEach(t => foundInResume.add(t));

    // ─── 2. KEYWORDS IN BULLETS ──────────────────────────────────────────
    const bulletTokens = tokenize(bulletTexts.join(" "));
    const bulletTokenSet = new Set([...bulletTokens, ...extractPhrases(bulletTokens)]);
    const bulletMatches = allJdTerms.filter(t => bulletTokenSet.has(t));
    bulletMatches.forEach(t => foundInResume.add(t));

    // ─── 3. SKILLS SECTION ───────────────────────────────────────────────
    const skillsCombined = skillsList.join(" ");
    const skillsTokens = tokenize(skillsCombined);
    const skillsTokenSet = new Set([...skillsTokens, ...extractPhrases(skillsTokens)]);
    const skillsMatches = allJdTerms.filter(t => skillsTokenSet.has(t));
    skillsMatches.forEach(t => foundInResume.add(t));

    // ─── 4. SUMMARY ──────────────────────────────────────────────────────
    const summaryTokens = tokenize(summaryText);
    const summaryTokenSet = new Set([...summaryTokens, ...extractPhrases(summaryTokens)]);
    const summaryMatches = allJdTerms.filter(t => summaryTokenSet.has(t));

    // ─── 5. FORMAT STRUCTURE (8 pts) ──────────────────────────────────────
    const hasColumns = resumeText.includes("\t") || /│/.test(resumeText) || /\|.*\|/.test(resumeText);
    const formatScore = hasColumns ? 4 : 8;

    // ─── 6. SECTION HEADERS (5 pts) ───────────────────────────────────────
    const hasAllCapsHeaders = /^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)/m.test(resumeText);
    const headerScore = hasAllCapsHeaders ? 5 : 3;

    // ─── 7. DATES CONSISTENCY (4 pts) ─────────────────────────────────────
    const dateMatches = resumeText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\b/gi);
    const dateScore = dateMatches && dateMatches.length >= 2 ? 4 : 2;

    // ─── 8. EDUCATION (2 pts) ─────────────────────────────────────────────
    const hasEducation = Array.isArray(resume.education) && resume.education.length > 0;
    const educationScore = hasEducation ? 2 : 0;

    // ─── 9. QUANTIFIED ACHIEVEMENTS (1 pt) ────────────────────────────────
    const hasNumbers = bulletTexts.some(b => /\d+/.test(b));
    const quantifiedScore = hasNumbers ? 1 : 0;

    // ─── TOTAL ────────────────────────────────────────────────────────────
    const totalFoundAcrossAllSections = foundInResume.size;
    const keywordCoveragePct = allJdTerms.length > 0
      ? Math.round((totalFoundAcrossAllSections / allJdTerms.length) * 100)
      : 100;
    const overallScore = Math.min(100, keywordCoveragePct);

    // Section coverage percentages (0-100 scale)
    const sectionPct = (matches: string[]) => allJdTerms.length > 0
      ? Math.round((new Set(matches).size / allJdTerms.length) * 100)
      : 0;

    // ─── WEAK SECTIONS ────────────────────────────────────────────────────
    const weakSections: string[] = [];
    if (sectionPct(titleMatches) < 30) weakSections.push("title_match");
    if (sectionPct(bulletMatches) < 30) weakSections.push("experience_keywords");
    if (sectionPct(skillsMatches) < 30) weakSections.push("skills_keywords");
    if (sectionPct(summaryMatches) < 30) weakSections.push("summary_keywords");
    if (formatScore < 6) weakSections.push("format_structure");
    if (headerScore < 4) weakSections.push("section_headers");
    if (dateScore < 3) weakSections.push("dates_consistency");
    if (educationScore === 0) weakSections.push("education_match");
    if (quantifiedScore === 0) weakSections.push("quantified_achievements");

    const foundKeywords = Array.from(foundInResume).slice(0, 30);
    const missingKeywords = allJdTerms.filter(t => !foundInResume.has(t)).slice(0, 30);

    return NextResponse.json({
      overall_score: overallScore,
      breakdown: {
        title_match: { score: sectionPct(titleMatches), max: 100 },
        experience_keywords: { score: sectionPct(bulletMatches), max: 100 },
        skills_keywords: { score: sectionPct(skillsMatches), max: 100 },
        summary_keywords: { score: sectionPct(summaryMatches), max: 100 },
        format_structure: { score: formatScore, max: 8 },
        section_headers: { score: headerScore, max: 5 },
        dates_consistency: { score: dateScore, max: 4 },
        education_match: { score: educationScore, max: 2 },
        quantified_achievements: { score: quantifiedScore, max: 1 },
      },
      missing_keywords: missingKeywords,
      found_keywords: foundKeywords,
      title_in_resume: titleInResume,
      title_in_jd: titleInJd,
      weak_sections: weakSections,
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "ATS score error:");
    return NextResponse.json({ error: "Failed to score ATS" }, { status: 500 });
  }
}
