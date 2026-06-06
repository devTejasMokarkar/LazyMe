import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// ── Deterministic local scoring for recalculation ──
// This is instant, free, and guaranteed to reflect keyword additions.

const GENERIC_WORDS = new Set([
  "the","and","for","with","that","this","from","have","will","are","you","your","our","can",
  "has","was","been","were","but","not","all","any","its","get","let","may","use","new","one",
  "two","who","how","why","what","when","where","which","about","also","back","been","come",
  "does","each","even","find","first","give","good","great","help","here","high","just","keep",
  "know","last","long","look","made","make","many","more","most","much","must","name","need",
  "next","only","other","over","part","plan","play","same","some","sure","take","tell","than",
  "them","then","they","time","upon","very","want","well","work","year","able","best","both",
  "call","case","date","done","down","full","hand","into","job","key","lead","like","line",
  "lot","own","per","role","run","set","show","side","team","top","try","way","end",
  "experience","years","required","preferred","strong","ability","understanding","knowledge",
  "working","including","using","across","ensure","maintain","etc","responsibilities","qualifications",
]);

function tokenize(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\+\#\.\-]/g, " ").split(/\s+/);
  return words.filter(w => w.length > 2 && !GENERIC_WORDS.has(w)).map(normalizeWord);
}

function extractPhrases(words: string[], maxLen = 3): string[] {
  const phrases: string[] = [];
  for (let len = 2; len <= maxLen; len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const chunk = words.slice(i, i + len);
      if (chunk.every(w => GENERIC_WORDS.has(w))) continue;
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

    // Tokenize JD
    const jdWords = tokenize(jobDescription);
    const jdPhrases = extractPhrases(jdWords);
    const jdTermSet = new Set([...jdWords, ...jdPhrases]);
    const allJdTerms = Array.from(jdTermSet);

    if (allJdTerms.length === 0) {
      return NextResponse.json({
        overall_score: 50,
        missing_keywords: [],
        found_keywords: [],
        title_in_resume: titleInResume,
        title_in_jd: titleInJd,
        weak_sections: [],
      });
    }

    const foundInResume = new Set<string>();

    // Title match
    const titleResumeWords = tokenize(titleInResume);
    const titleSummaryWords = tokenize(summaryText);
    const titlePool = new Set([...titleResumeWords, ...titleSummaryWords, ...extractPhrases(titleResumeWords), ...extractPhrases(titleSummaryWords)]);
    allJdTerms.filter(t => titlePool.has(t)).forEach(t => foundInResume.add(t));

    // Experience bullets
    const bulletTokens = tokenize(bulletTexts.join(" "));
    const bulletTokenSet = new Set([...bulletTokens, ...extractPhrases(bulletTokens)]);
    allJdTerms.filter(t => bulletTokenSet.has(t)).forEach(t => foundInResume.add(t));

    // Skills
    const skillsCombined = skillsList.join(" ");
    const skillsTokens = tokenize(skillsCombined);
    const skillsTokenSet = new Set([...skillsTokens, ...extractPhrases(skillsTokens)]);
    allJdTerms.filter(t => skillsTokenSet.has(t)).forEach(t => foundInResume.add(t));

    // Summary
    const summaryTokens = tokenize(summaryText);
    const summaryTokenSet = new Set([...summaryTokens, ...extractPhrases(summaryTokens)]);
    allJdTerms.filter(t => summaryTokenSet.has(t)).forEach(t => foundInResume.add(t));

    // Score
    const coveragePct = allJdTerms.length > 0
      ? Math.round((foundInResume.size / allJdTerms.length) * 100)
      : 100;
    const overallScore = Math.min(100, coveragePct);

    const foundKeywords = Array.from(foundInResume).slice(0, 30);
    const missingKeywords = allJdTerms.filter(t => !foundInResume.has(t)).slice(0, 30);

    // Weak sections
    const weakSections: string[] = [];
    const sectionPct = (tokens: Set<string>) => allJdTerms.length > 0
      ? Math.round((allJdTerms.filter(t => tokens.has(t)).length / allJdTerms.length) * 100)
      : 0;
    if (sectionPct(titlePool) < 30) weakSections.push("summary");
    if (sectionPct(bulletTokenSet) < 30) weakSections.push("experience");
    if (sectionPct(skillsTokenSet) < 30) weakSections.push("skills");

    return NextResponse.json({
      overall_score: overallScore,
      missing_keywords: missingKeywords,
      found_keywords: foundKeywords,
      title_in_resume: titleInResume,
      title_in_jd: titleInJd,
      weak_sections: weakSections,
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "ATS rescore error:");
    return NextResponse.json({ error: "Failed to rescore ATS" }, { status: 500 });
  }
}
