import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { buildCoverLetterPrompt } from "@/features/ai/prompts/resume.prompts";


export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeData, jobDescription, companyName } = body;

    // Validate required fields
    if (!resumeData) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (!resumeData.name || !resumeData.email) {
      return NextResponse.json(
        { error: "Name and email are required in resume data" },
        { status: 400 }
      );
    }

    const prompt = buildCoverLetterPrompt(resumeData, jobDescription, companyName || "the company");
    const coverLetter = await generateText(prompt);

    return NextResponse.json({ coverLetter });
  } catch (e: any) {
    if (e.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: e.message, quota: e.quota },
        { status: e.status || 429 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
