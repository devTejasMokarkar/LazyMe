import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiServiceError } from "@/features/ai/ai.service";
import { buildDummyResumePrompt } from "@/features/ai/prompts/dummy-resume.prompts";

/**

export const dynamic = "force-dynamic";
 * POST /api/generate-dummy-resume
 *
 * Returns a fresh John Doe resume in the Resume Worded format, scored 60-70 on ATS
 * against a typical mid-level Java Backend Developer JD. Used by the chat page
 * "Load demo resume" button to seed a realistic baseline resume before optimization.
 *
 * The resume is generated server-side from buildDummyResumePrompt() — the prompt
 * itself is NEVER exposed to the user (the user pastes a one-liner into the chat
 * to trigger this, but the heavy lifting happens here).
 */
export async function POST(_req: NextRequest) {
  try {
    const prompt = buildDummyResumePrompt();
    const response = await generateText(prompt);

    // Extract JSON robustly: prefer fenced ```json, else first {...} block.
    const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonStr =
      fenced?.[1]?.trim() ||
      response.match(/\{[\s\S]*\}/)?.[0] ||
      response;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Invalid response format from AI service" },
        { status: 500 }
      );
    }

    // Map the Resume Worded shape returned by the prompt back to the
    // flat ResumeData shape the rest of the app uses (see resume-chat.service.ts).
    const flatSkills: string[] = [
      ...(parsed.skills?.technicalSkills || []),
      ...(parsed.skills?.frameworks || []),
      ...(parsed.skills?.databases || []),
      ...(parsed.skills?.cloudDevOps || []),
      ...(parsed.skills?.industryKnowledge || []),
    ];

    const experience = (parsed.experience || []).map((e: any) => ({
      company: e.company || "",
      role: e.title || "",
      duration: e.dates || "",
      bullets: Array.isArray(e.bullets) ? e.bullets : [],
      companyDescription: e.companyDescription || "",
    }));

    const education = (parsed.education || []).map((ed: any) => ({
      school: ed.institution || "",
      degree: ed.degree || "",
      year: ed.graduationDate || "",
    }));

    const resume = {
      name: parsed.name || "John Doe",
      email: parsed.contact?.email || "john.doe@example.com",
      phone: parsed.contact?.phone || "+1-555-123-4567",
      location: parsed.contact?.location || "Austin, TX",
      linkedin: parsed.contact?.linkedin || "linkedin.com/in/johndoe",
      title: parsed.title || "Java Developer",
      summary: parsed.summary || "",
      skills: flatSkills,
      experience,
      education,
    };

    return NextResponse.json({ resume });
  } catch (e: any) {
    if (e instanceof GeminiServiceError) {
      return NextResponse.json(
        { error: e.message, quota: e.quota },
        { status: e.status || 500 }
      );
    }
    console.error("generate-dummy-resume failed:", e);
    return NextResponse.json(
      { error: "Failed to generate demo resume" },
      { status: 500 }
    );
  }
}
