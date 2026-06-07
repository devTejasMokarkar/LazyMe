import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { buildResumePrompt, buildCoverLetterPrompt } from "@/features/ai/prompts/resume.prompts";
import { calculateWeightedATS } from "@/features/ai/ats.service";
import { logger } from "@/lib/logger";


export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, jobDescription, companyName, includeCoverLetter, includeATS } = body;

    // 1. Generate Resume
    const resumePrompt = buildResumePrompt(data, jobDescription);
    const resumeResponse = await generateText(resumePrompt);
    
    const jsonMatch = resumeResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : resumeResponse;
    const resume = JSON.parse(jsonStr);

    let coverLetter = null;
    let ats = null;

    // 2. Generate Cover Letter if requested
    if (includeCoverLetter && jobDescription) {
      const coverPrompt = buildCoverLetterPrompt(resume, jobDescription, companyName || "the company");
      coverLetter = await generateText(coverPrompt);
    }

    // 3. Calculate ATS if requested (using weighted scoring)
    if (includeATS && jobDescription) {
      ats = calculateWeightedATS(resume, jobDescription);
    }

    return NextResponse.json({
      resume,
      coverLetter,
      ats
    });
   } catch (error: any) {
     logger.error({ error }, "Generate-all error:");
    if (error.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429 }
      );
    }
    return NextResponse.json(
      { error: "Generation failed. Please try again or check your settings." },
      { status: 500 }
    );
  }
}
