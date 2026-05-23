import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { calculateWeightedATS } from "@/utils/ats";
import { buildATSOptimizationPrompt, ATSAnalysisResult } from "@/utils/promptBuilder";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    // Use the MASTER PROMPT for ATS analysis
    const prompt = buildATSOptimizationPrompt(resume, jobDescription);
    const response = await generateText(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    const analysis: ATSAnalysisResult = JSON.parse(jsonStr);

    // Calculate weighted ATS score for verification
    const weightedATS = calculateWeightedATS(resume, jobDescription);

    return NextResponse.json({
      analysis,
      weightedATS,
      // Use the AI's score as primary, but include weighted for reference
      atsScore: analysis.atsScore
    });
   } catch (error: any) {
     logger.error("ATS analysis error:", error);
    if (error.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429 }
      );
    }
    return NextResponse.json({ error: "Failed to analyze ATS" }, { status: 500 });
  }
}
