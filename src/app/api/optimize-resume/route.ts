import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { buildATSImproverPrompt, buildATSScorerPrompt } from "@/features/ai/prompts/ats.prompts";
import { resumeToPlainText, parsePlainTextToResume } from "@/features/ai/utils/resume-text";
import { extractWeakSections, extractSectionBodyBefore, mergeImprovedSections } from "@/features/ai/utils/section-utils";
import { logger } from "@/lib/logger";


export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, jobDescription, currentScore, missingKeywords, weakSections, skipRescore } = body;

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const resumeText = resumeToPlainText(resume);

    // Extract only the weak sections (200-400 tokens)
    const weakContent = extractWeakSections(resumeText, weakSections || []);
    if (!weakContent.trim()) {
      return NextResponse.json({ error: "No weak sections to improve" }, { status: 400 });
    }

    // Store original section text BEFORE calling AI (for before field)
    const sectionBeforeMap = extractSectionBodyBefore(resumeText, weakSections || []);

    // Extract JD title for the title fix rule
    const titleInJd = body.titleInJd || "";

    // Call improver with only weak sections
    const improverPrompt = buildATSImproverPrompt(
      currentScore || 50,
      (missingKeywords || []).join(", "),
      weakContent,
      jobDescription,
      titleInJd
    );
    const improvedResponse = await generateText(improverPrompt);

    // Merge improved sections back into original plain text
    const mergedText = mergeImprovedSections(resumeText, improvedResponse);

    // Parse merged text back to structured resume data
    const improvedResume = parsePlainTextToResume(mergedText, resume);

    let newScore: number | null = currentScore ?? null;

    if (!skipRescore) {
      // Re-score to verify only when the caller asks for the slower full cycle.
      const rescorePrompt = buildATSScorerPrompt(mergedText, jobDescription);
      const rescoreResponse = await generateText(rescorePrompt);

      const jsonMatch = rescoreResponse.match(/\{[\s\S]*\}/);
      const scoreData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      newScore = scoreData?.overall_score ?? null;

      // Guard: if score dropped, discard improvement
      if (newScore !== null && currentScore !== null && newScore < currentScore) {
        logger.warn({ oldScore: currentScore, newScore }, "Improvement made score worse — returning original");
        return NextResponse.json({
          improvedResume: null,
          mergedText: resumeText,
          oldScore: currentScore,
          newScore: currentScore,
          changes: [],
          keywordsAdded: missingKeywords || [],
          sectionsImproved: weakSections || [],
          discarded: true,
        });
      }
    }

    // Extract changes for display (with actual before text)
    const changes: Array<{ section: string; before: string; after: string }> = [];
    const sectionBlocks = improvedResponse.match(/\[SECTION:\s*(\w+)\]([\s\S]*?)(?=\[SECTION:|$)/gi);
    if (sectionBlocks) {
      for (const block of sectionBlocks) {
        const sectionMatch = block.match(/\[SECTION:\s*(\w+)\]/i);
        const contentMatch = block.replace(/\[SECTION:\s*\w+\]/i, "").trim();
        if (sectionMatch && contentMatch) {
          changes.push({
            section: sectionMatch[1],
            before: sectionBeforeMap[sectionMatch[1]] || "",
            after: contentMatch,
          });
        }
      }
    }

    return NextResponse.json({
      improvedResume,
      mergedText,
      oldScore: currentScore,
      newScore: newScore || currentScore,
      changes,
      keywordsAdded: missingKeywords || [],
      sectionsImproved: weakSections || [],
      discarded: false,
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "Optimize resume error:");
    if (error.name === "GeminiServiceError") {
      const headers: Record<string, string> = {};
      if (error.quota?.retryAfterSeconds) {
        headers["Retry-After"] = String(error.quota.retryAfterSeconds);
      }
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429, headers }
      );
    }
    return NextResponse.json({ error: "Failed to optimize resume" }, { status: 500 });
  }
}
