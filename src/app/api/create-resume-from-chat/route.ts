import { NextRequest, NextResponse } from "next/server";
import { generateText, GeminiServiceError } from "@/features/ai/ai.service";
import { buildResumeFromChatPrompt } from "@/features/ai/prompts/resume.prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const prompt = buildResumeFromChatPrompt(message.trim());
    const response = await generateText(prompt);

    // Extract JSON from response (handle markdown fencing)
    const fenced = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonStr = fenced?.[1] || response.match(/\{[\s\S]*\}/)?.[0] || response;
    const resume = JSON.parse(jsonStr);

    // Ensure required fields exist with fallback defaults
    const sanitized = {
      name: resume.name || "",
      email: resume.email || "",
      phone: resume.phone || "",
      location: resume.location || "",
      title: resume.title || "",
      summary: resume.summary || "",
      skills: Array.isArray(resume.skills) ? resume.skills : [],
      experience: Array.isArray(resume.experience) ? resume.experience : [],
      education: Array.isArray(resume.education) ? resume.education : [],
      projects: Array.isArray(resume.projects) ? resume.projects : [],
    };

    return NextResponse.json({ resume: sanitized });
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
      { error: "Failed to create resume" },
      { status: 500 }
    );
  }
}
