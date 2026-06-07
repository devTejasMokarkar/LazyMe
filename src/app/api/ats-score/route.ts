import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { generateText, GeminiServiceError } from "@/features/ai/ai.service";
import { buildATSScorerPrompt } from "@/features/ai/prompts/ats.prompts";
import { logger } from "@/lib/logger";
import { memo } from "@/lib/memo";


export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();
    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const cacheKey = createHash("sha256")
      .update(JSON.stringify({ resume, jobDescription }))
      .digest("hex")
      .slice(0, 32);

    const scoreData = await memo(cacheKey, 5 * 60 * 1000, async () => {
      const prompt = buildATSScorerPrompt(resume, jobDescription);
      const response = await generateText(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response into JSON");
      }
      return JSON.parse(jsonMatch[0]);
    });

    return NextResponse.json(scoreData);
  } catch (error: any) {
    logger.error({ error: error?.message || error, name: error?.name }, "ATS score error:");

    if (error.name === "GeminiServiceError" || error instanceof GeminiServiceError) {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        {
          status: error.status || 429,
          headers: error.quota?.retryAfterSeconds
            ? { "Retry-After": String(error.quota.retryAfterSeconds) }
            : {},
        }
      );
    }

    return NextResponse.json({ error: "Failed to score ATS" }, { status: 500 });
  }
}
