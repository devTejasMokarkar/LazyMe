import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { buildResumePrompt } from "@/utils/promptBuilder";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, jobDescription } = body;

    // Validate required fields
    if (!data) {
      return NextResponse.json(
        { error: "Resume data is required" },
        { status: 400 }
      );
    }

    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "Name and email are required in resume data" },
        { status: 400 }
      );
    }

    const prompt = buildResumePrompt(data, jobDescription);
    const response = await generateText(prompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const resume = JSON.parse(jsonStr);

    return NextResponse.json({ resume });
  } catch (e: any) {
    if (e.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: e.message, quota: e.quota },
        { status: e.status || 500 }
      );
    }

    if (e instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid response format from AI service" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}
