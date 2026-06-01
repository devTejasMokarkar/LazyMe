import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { buildATSScorerPrompt } from "@/features/ai/prompts/ats.prompts";
import { resumeToPlainText } from "@/features/ai/utils/resume-text";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();
    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const resumeText = typeof resume === "string" ? resume : resumeToPlainText(resume);
    const prompt = buildATSScorerPrompt(resumeText, jobDescription);
    const response = await generateText(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ response }, "ATS scorer: no JSON found in AI response");
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 });
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof result.overall_score !== "number") {
      throw new Error("Missing overall_score in AI response");
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "ATS score error:");
    if (error.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429 }
      );
    }
    return NextResponse.json({ error: "Failed to score ATS" }, { status: 500 });
  }
}
