import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { deductCredits, getBalance } from "@/features/credits/credits.service";
import { decryptApiKey } from "@/lib/encryption";
import { generateTextForUser } from "@/features/ai/ai.service";
import { buildInterviewPrepPrompt } from "@/features/ai/prompts/interview.prompts";
import { logger } from "@/lib/logger";

/**
 * POST /api/interview-prep — Generate personalized interview Q&A
 * Body: { resumeId?: string, resumeData?: object, targetRole?: string, jobDescription?: string, difficulty?: string, count?: number }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { resumeId, resumeData, targetRole, jobDescription, difficulty, count } = body;

  // Get resume data either from ID or inline
  let resume = resumeData;
  if (resumeId && !resume) {
    const dbResume = await prisma.userResume.findFirst({
      where: { id: resumeId, userId: session.user.id },
    });

    if (!dbResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }
    resume = dbResume.content as any;
  }

  if (!resume) {
    return NextResponse.json({ error: "Either resumeId or resumeData is required" }, { status: 400 });
  }

  // Fetch user's API keys
  const userApiKeys = await prisma.userApiKey.findMany({
    where: { userId: session.user.id, isActive: true },
  });

  const decryptedKeys = userApiKeys.map((k) => ({
    provider: k.provider,
    key: decryptApiKey(k.encryptedKey, k.iv),
  }));

  const hasOwnKeys = decryptedKeys.length > 0;

  // If user doesn't have own keys, check and deduct credits
  if (!hasOwnKeys) {
    const balance = await getBalance(session.user.id);
    if (balance < 5) {
      return NextResponse.json({
        error: "Insufficient credits",
        balance,
        required: 5,
        message: "You need at least 5 credits for interview prep. Add your own API key for free usage, or purchase credits.",
      }, { status: 402 });
    }

    const deducted = await deductCredits(session.user.id, "interview_prep", "Interview prep Q&A generation");
    if (!deducted) {
      return NextResponse.json({ error: "Failed to deduct credits" }, { status: 402 });
    }
  }

  // Update lastUsedAt for the keys
  if (hasOwnKeys) {
    await prisma.userApiKey.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { lastUsedAt: new Date() },
    });
  }

  // Build prompt and generate
  const prompt = buildInterviewPrepPrompt(resume, {
    targetRole,
    jobDescription,
    difficulty: difficulty || "medium",
    count: count || 10,
  });

  try {
    const rawResult = await generateTextForUser(prompt, hasOwnKeys ? decryptedKeys : undefined);

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = rawResult.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      usedOwnKey: hasOwnKeys,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message, userId: session.user.id }, "Interview prep generation failed");

    // Refund credits if generation failed and user used platform keys
    if (!hasOwnKeys) {
      try {
        const { addCredits: refundCredits } = await import("@/features/credits/credits.service");
        await refundCredits(session.user.id, 5, "refund", "Refund: Interview prep generation failed");
      } catch {
        // Non-critical: log and continue
      }
    }

    return NextResponse.json({
      error: "Failed to generate interview prep. Please try again.",
      details: error.message,
    }, { status: 500 });
  }
}
