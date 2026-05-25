import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";

const ENHANCE_SYSTEM_PROMPT = `You are a resume improvement assistant. Enhance the following short user request into a detailed, well-structured prompt for updating a resume section. Return only the enhanced prompt text, no extra explanation, no greetings.`;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const fullPrompt = `${ENHANCE_SYSTEM_PROMPT}\n\nUser request: ${prompt}`;
    const enhancedPrompt = await generateText(fullPrompt);

    return NextResponse.json({ enhancedPrompt });
  } catch (e: any) {
    console.error("[ollama/enhance-prompt] error:", e.message);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
