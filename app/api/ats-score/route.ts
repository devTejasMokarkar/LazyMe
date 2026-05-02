import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { calculateATSScore } from "@/utils/keywordExtractor";

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();
    const result = calculateATSScore(resumeText, jobDescription);
    return NextResponse.json(result);
  } catch (e) {
    console.error("ATS score error:", e);
    return NextResponse.json(
      { error: "Failed to calculate ATS score" },
      { status: 500 }
    );
  }
}
