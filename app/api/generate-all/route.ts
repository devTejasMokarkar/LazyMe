import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { buildResumePrompt, buildCoverLetterPrompt } from "@/utils/promptBuilder";
import { calculateWeightedATS } from "@/utils/ats";

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
    console.error("Generate-all error:", error);
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
