import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { buildATSScorerPrompt } from "@/features/ai/prompts/ats.prompts";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();
    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const prompt = buildATSScorerPrompt(resume, jobDescription);
    const response = await generateText(prompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response into JSON");
    }

    const scoreData = JSON.parse(jsonMatch[0]);

    return NextResponse.json(scoreData);
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "ATS score error:");
    return NextResponse.json({ error: "Failed to score ATS" }, { status: 500 });
  }
}
