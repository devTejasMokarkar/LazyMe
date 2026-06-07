import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";


export const dynamic = "force-dynamic";
interface ResumeChanges {
  summary?: string;
  experience?: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  skills?: string[];
}

const EXTRACT_PROMPT = `You are a resume data parser. Given a user request, extract the structured resume changes.

Return JSON with this exact shape:
{
  "summary": "string or null",
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }] or null,
  "skills": ["string"] or null
}

Only include fields that the user explicitly asks to change. Set unchanged fields to null.
- If the user wants to add a new experience entry, include it in the experience array.
- If the user wants to modify an existing entry, include it with the same company name.
- If the user wants to add skills, include the full updated skills list.

Return ONLY valid JSON, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const { enhancedPrompt } = await request.json();

    if (!enhancedPrompt || !enhancedPrompt.trim()) {
      return NextResponse.json({ error: "Enhanced prompt is required." }, { status: 400 });
    }

    const fullPrompt = `${EXTRACT_PROMPT}\n\nUser request: ${enhancedPrompt}`;
    const response = await generateText(fullPrompt);

    let changes: ResumeChanges;

    try {
      const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      changes = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON." },
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
