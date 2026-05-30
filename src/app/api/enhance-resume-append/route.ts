import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiServiceError } from "@/features/ai/ai.service";

type ResumeAppend = {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
};

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(candidate);
}

function getResumeContext(resume: any) {
  const experience = Array.isArray(resume?.experience) ? resume.experience : [];
  const currentExperience = experience.find((item: any) => {
    const duration = String(item?.duration || item?.period || "").toLowerCase();
    return duration.includes("present") || duration.includes("current");
  }) || experience[0] || {};

  return {
    currentCompany: currentExperience.company || "",
    currentRole: currentExperience.role || resume?.title || "",
    title: resume?.title || "",
    skills: Array.isArray(resume?.skills) ? resume.skills.slice(0, 12) : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, resume } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const resumeContext = getResumeContext(resume);

    const enhancementPrompt = `You are a senior resume writer.

Convert the user's plain request into one optimized resume experience/project entry.

Current resume context:
${JSON.stringify(resumeContext, null, 2)}

User request:
${prompt}

Return ONLY valid JSON with this exact shape:
{
  "company": "",
  "role": "",
  "duration": "Current",
  "bullets": ["", "", ""]
}

Rules:
- Keep it truthful to the user's request. Do not invent metrics, tools, or employers.
- If the user says current company, use the current or most recent company from the resume when available.
- Treat products, campaigns, connectors, and launches as resume-worthy project work.
- Make bullets ATS-friendly, action-oriented, and concise.
- Include keywords naturally from the request, such as WhatsApp, messaging, campaign, connectors, automation, integration, and delivery when relevant.
- Use 2 to 3 bullets.`;

    try {
      const response = await generateText(enhancementPrompt);
      const parsed = extractJsonObject(response);

      const enhanced: ResumeAppend = {
        company: String(parsed.company || "Current Company"),
        role: String(parsed.role || "Project"),
        duration: String(parsed.duration || "Current"),
        bullets: Array.isArray(parsed.bullets) && parsed.bullets.length
          ? parsed.bullets.slice(0, 3).map((bullet: unknown) => String(bullet))
          : [],
      };

      if (!enhanced.bullets.length) {
        throw new Error("AI returned an incomplete resume entry.");
      }

      return NextResponse.json({
        enhanced,
        quotaReached: false,
        message: "AI enhanced this resume entry.",
      });
    } catch (error: any) {
      const isQuota = error instanceof GeminiServiceError && error.status === 429;

      return NextResponse.json({
        enhanced: null,
        quotaReached: isQuota,
        message: isQuota
          ? "AI enhancement upgrade is needed before this can be appended to your resume."
          : "AI enhancement is unavailable right now. Nothing was appended to your resume.",
      });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to prepare resume update" }, { status: 500 });
  }
}
