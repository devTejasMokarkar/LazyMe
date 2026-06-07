import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/config/auth";
import { prisma } from "@/lib/db";
import { runAutoPilot, extractSearchKeywords } from "@/features/ai/auto-pilot.service";
import { calculateWeightedATS } from "@/features/ai/ats.service";
import { logger } from "@/lib/logger";


export const dynamic = "force-dynamic";
export interface AutoPilotScrapedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  postedAt: string;
  dateText: string;
  salary: string;
  matchScore: number;
  matchFactors: { label: string; score: number }[];
  tags: string[];
}

export interface AutoPilotResponse {
  keywords: string[];
  jobs: AutoPilotScrapedJob[];
  summary: {
    totalJobs: number;
    highMatch: number;
    mediumMatch: number;
    lowMatch: number;
    sourceCounts: Record<string, number>;
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await prisma.userResume.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    const primaryResume = resumes.find((r) => r.isDefault) || resumes[0];
    if (!primaryResume) {
      return NextResponse.json({ error: "No resume found. Upload a resume first." }, { status: 404 });
    }

    const resumeContent = typeof primaryResume.content === "string"
      ? JSON.parse(primaryResume.content)
      : primaryResume.content;

    const searchParams = req.nextUrl.searchParams;
    const location = searchParams.get("l") || "Remote";
    const jobType = searchParams.get("jobType") || "any";
    const experience = searchParams.get("experience") || "any";

    const result = await runAutoPilot({
      resume: resumeContent,
      location,
      jobType,
      experience,
    });

    const scoredJobs: AutoPilotScrapedJob[] = result.jobs.map((job) => {
      const matchFactors = job.matchFactors?.length
        ? job.matchFactors
        : [
            { label: "Title Match", score: job.matchScore },
            { label: "Skills Overlap", score: Math.min(100, job.matchScore + 10) },
            { label: "Location Fit", score: /remote/i.test(job.location) ? 90 : 70 },
          ];

      return {
        ...job,
        matchScore: job.matchScore,
        matchFactors,
        tags: job.tags || [job.source.charAt(0).toUpperCase() + job.source.slice(1)],
      };
    });

    return NextResponse.json({
      keywords: result.keywords,
      jobs: scoredJobs,
      summary: {
        totalJobs: result.summary.totalJobs,
        highMatch: result.summary.highMatch,
        mediumMatch: result.summary.mediumMatch,
        lowMatch: result.summary.lowMatch,
        sourceCounts: result.summary.sourceCounts,
      },
    } satisfies AutoPilotResponse);
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "Auto-pilot search error:");
    return NextResponse.json(
      { error: error?.message || "Auto-pilot search failed" },
      { status: 500 }
    );
  }
}
