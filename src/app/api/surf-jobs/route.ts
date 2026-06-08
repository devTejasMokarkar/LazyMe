import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { searchSurfJobs } from "@/features/jobs/surf-jobs.service";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword")?.trim();
    const location = searchParams.get("location")?.trim() || "Pune";
    const workMode = searchParams.get("workMode") || "any";

    if (!keyword) {
      return NextResponse.json(
        { error: "Missing required parameter: keyword" },
        { status: 400 },
      );
    }

    const resume = await prisma.userResume.findFirst({
      where: { userId: session.user.id, isDefault: true },
      orderBy: { version: "desc" },
    });

    const skills = extractSkillsFromResume(resume?.content as Record<string, unknown> | null);

    const result = await searchSurfJobs(keyword, skills, location, workMode);

    return NextResponse.json({
      jobs: result.jobs,
      count: result.count,
      skills: skills.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Surf search failed" },
      { status: 500 },
    );
  }
}

function extractSkillsFromResume(
  content: Record<string, unknown> | null,
): string[] {
  if (!content) return [];

  const skills: string[] = [];

  if (Array.isArray(content.skills)) {
    for (const s of content.skills) {
      if (typeof s === "string") {
        skills.push(s);
      } else if (typeof s === "object" && s !== null) {
        const name = (s as Record<string, unknown>).name || (s as Record<string, unknown>).skill;
        if (typeof name === "string") skills.push(name);
        const keywords = (s as Record<string, unknown>).keywords;
        if (Array.isArray(keywords)) {
          for (const kw of keywords) {
            if (typeof kw === "string") skills.push(kw);
          }
        }
      }
    }
  }

  if (typeof content.summary === "string") {
    const extracted = content.summary
      .toLowerCase()
      .match(/\b(java|python|javascript|typescript|react|node\.?js|spring\s*boot|docker|kubernetes|aws|gcp|azure|kafka|sql|mongodb|postgresql|langchain|llm|rag|microservices|rest\s*api|graphql|git|express|next\.?js|tailwind|css|html)\b/g);
    if (extracted) {
      skills.push(...extracted.map((s) => s.trim()));
    }
  }

  return Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean)));
}
