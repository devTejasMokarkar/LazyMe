import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { runAutoPilot } from "@/features/ai/auto-pilot.service";
import { logger } from "@/lib/logger";


export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      include: { job: true },
      orderBy: { appliedAt: "desc" },
      take: 50,
    });

    const recentJobs = applications.filter(
      (a) => a.appliedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      totalApplications: applications.length,
      recentApplications: recentJobs.length,
      recentJobs: recentJobs.map((a) => ({
        id: a.id,
        company: a.job.company,
        role: a.job.title,
        status: a.status,
        appliedAt: a.appliedAt,
        matchScore: a.job.matchScore,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "GET /api/scheduled-search error:");
    return NextResponse.json({ error: "Failed to fetch search history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { location, jobType, experience } = body;

    logger.info({ userId: session.user.id, location, jobType }, "Manual scheduled search triggered");

    const resumes = await prisma.userResume.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    const primaryResume = resumes.find((r) => r.isDefault) || resumes[0];
    if (!primaryResume) {
      return NextResponse.json({ error: "No resume found" }, { status: 404 });
    }

    const resumeContent = typeof primaryResume.content === "string"
      ? JSON.parse(primaryResume.content)
      : primaryResume.content;

    const result = await runAutoPilot({
      resume: resumeContent,
      location: location || "Remote",
      jobType: jobType || "any",
      experience: experience || "any",
    });

    const newHighMatches = result.jobs.filter((j) => j.matchScore >= 70).slice(0, 20);

    return NextResponse.json({
      message: "Search completed",
      keywords: result.keywords,
      summary: result.summary,
      newHighMatches: newHighMatches.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        matchScore: j.matchScore,
        url: j.url,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "POST /api/scheduled-search error:");
    return NextResponse.json({ error: error?.message || "Scheduled search failed" }, { status: 500 });
  }
}
