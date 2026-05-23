import { NextRequest, NextResponse } from "next/server";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3.2";

interface ResumeChanges {
  summary?: string;
  experience?: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  skills?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { enhancedPrompt } = await request.json();

    if (!enhancedPrompt || !enhancedPrompt.trim()) {
      return NextResponse.json({ error: "Enhanced prompt is required." }, { status: 400 });
    }

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: "json",
        messages: [
          {
            role: "system",
            content: `You are a resume data parser. Given a user request, extract the structured resume changes.

Return JSON with this exact shape:
{
  "summary": "string or null",
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }] or null,
  "skills": ["string"] or null
}

Only include fields that the user explicitly asks to change. Set unchanged fields to null.
- If the user wants to add a new experience entry, include it in the experience array.
- If the user wants to modify an existing entry, include it with the same company name.
- If the user wants to add skills, include the full updated skills list.`,
          },
          { role: "user", content: enhancedPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[ollama/update-resume] Ollama error:", res.status, text);
      return NextResponse.json(
        { error: `Ollama returned status ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    let changes: ResumeChanges;

    try {
      changes = JSON.parse(data.message?.content || "{}");
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Ollama response as JSON." },
        { status: 502 }
      );
    }

    return NextResponse.json({ changes });
  } catch (e: any) {
    console.error("[ollama/update-resume] error:", e.message);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
