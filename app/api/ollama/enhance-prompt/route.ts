import { NextRequest, NextResponse } from "next/server";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a resume improvement assistant. Enhance the following short user request into a detailed, well-structured prompt for updating a resume section. Return only the enhanced prompt text, no extra explanation, no greetings.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[ollama/enhance-prompt] Ollama error:", res.status, text);
      return NextResponse.json(
        { error: `Ollama returned status ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const enhancedPrompt = data.message?.content || "";

    return NextResponse.json({ enhancedPrompt });
  } catch (e: any) {
    console.error("[ollama/enhance-prompt] error:", e.message);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
