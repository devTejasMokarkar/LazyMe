import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";

export const dynamic = "force-dynamic";

interface ResumeChanges {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  skillsMode?: "replace" | "append" | null;
  sectionHeaders?: Record<string, string> | null;
  experience?: Array<{
    company: string;
    role?: string;
    duration?: string;
    bullets?: string[];
  }> | null;
  education?: Array<{
    school: string;
    degree?: string;
    year?: string;
  }> | null;
}

function buildCompactContext(resumeData: any): string {
  if (!resumeData) return "No resume data available.";

  const ctx: any = {};

  // Basic fields - full values (short)
  if (resumeData.name) ctx.name = resumeData.name;
  if (resumeData.title) ctx.title = resumeData.title;
  if (resumeData.email) ctx.email = resumeData.email;
  if (resumeData.phone) ctx.phone = resumeData.phone;
  if (resumeData.location) ctx.location = resumeData.location;

  // Summary - truncated
  if (resumeData.summary) {
    ctx.summary = resumeData.summary.length > 120
      ? resumeData.summary.slice(0, 120) + "..."
      : resumeData.summary;
  }

  // Skills - full list (usually short)
  if (resumeData.skills?.length) {
    ctx.skills = resumeData.skills;
  }

  // Section headers
  if (resumeData.sectionHeaders && Object.keys(resumeData.sectionHeaders).length > 0) {
    ctx.sectionHeaders = resumeData.sectionHeaders;
  }

  // Experience - compact: company, role, duration, bullet count (not full bullets)
  if (resumeData.experience?.length) {
    ctx.experience = resumeData.experience.map((exp: any) => ({
      company: exp.company,
      role: exp.role,
      duration: exp.duration,
      bulletsCount: exp.bullets?.length || 0,
      // Include first bullet as sample for context
      sampleBullet: exp.bullets?.[0] || null,
    }));
  }

  // Education - full (usually short)
  if (resumeData.education?.length) {
    ctx.education = resumeData.education;
  }

  return JSON.stringify(ctx, null, 2);
}

function buildExperienceContext(resumeData: any, companyHint?: string): string {
  if (!resumeData?.experience?.length) return "";

  // If user mentioned a company, send that entry's full bullets
  if (companyHint) {
    const match = resumeData.experience.find(
      (e: any) => e.company?.toLowerCase().includes(companyHint.toLowerCase())
    );
    if (match) {
      return JSON.stringify({
        targetExperience: {
          company: match.company,
          role: match.role,
          duration: match.duration,
          bullets: match.bullets,
        },
      });
    }
  }

  // Otherwise send all entries with full bullets (small resume)
  return JSON.stringify({
    experience: resumeData.experience.map((e: any) => ({
      company: e.company,
      role: e.role,
      duration: e.duration,
      bullets: e.bullets,
    })),
  });
}

const EXTRACT_PROMPT = `You are a resume editor AI. Given a user request and the current resume context, extract structured resume changes.

Return JSON with this exact shape:
{
  "name": "string or null",
  "title": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "summary": "string or null",
  "skills": ["string"] or null,
  "skillsMode": "replace" or "append" or null,
  "sectionHeaders": { "skills": "string", "experience": "string", "education": "string", "summary": "string" } or null,
  "experience": [{ "company": "string", "role": "string", "duration": "string", "bullets": ["string"] }] or null,
  "education": [{ "school": "string", "degree": "string", "year": "string" }] or null
}

Rules:
- Only include fields the user explicitly asks to change. Set unchanged fields to null.
- For "change X to Y" or "rename X to Y" on section headers, use sectionHeaders.
- For "change title to X" or "update designation to X", use title.
- For "change skills to X" or "replace skills with X", set skillsMode to "replace".
- For "add X to skills" or "add skill X", set skillsMode to "append".
- For experience edits, match by company name. Include the full updated entry.
- For "rewrite summary" or "change summary", provide the new summary text.
- If the user says something vague like "make it professional", interpret contextually.
- Return ONLY valid JSON, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    const { enhancedPrompt, resumeData } = await request.json();

    if (!enhancedPrompt || !enhancedPrompt.trim()) {
      return NextResponse.json({ error: "Enhanced prompt is required." }, { status: 400 });
    }

    // Build compact context (~150 tokens)
    const compactContext = buildCompactContext(resumeData);

    // Check if user is targeting a specific experience entry
    const companyMatch = enhancedPrompt.match(/(?:at|from|in|for)\s+([A-Z][A-Za-z\s&.]+)/i);
    const companyHint = companyMatch?.[1]?.trim() || null;

    // For experience edits, send full bullets of that entry
    const experienceContext = companyHint
      ? buildExperienceContext(resumeData, companyHint)
      : "";

    const fullPrompt = `${EXTRACT_PROMPT}

CURRENT RESUME CONTEXT:
${compactContext}
${experienceContext ? `\nRELEVANT EXPERIENCE DETAIL:\n${experienceContext}` : ""}

User request: ${enhancedPrompt}`;

    const response = await generateText(fullPrompt);

    let changes: ResumeChanges;

    try {
      const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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
