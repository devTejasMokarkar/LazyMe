import { NextRequest, NextResponse } from "next/server";
import { scrapeLinkedInPublic } from "@/lib/scrapers/linkedinPublicScraper";

export interface LinkedInJob {
  title: string;
  company: string;
  location: string;
  postedAt: string;
  dateText: string;
  url: string;
}

// TODO: add Redis or in-memory cache (e.g. node-cache) to avoid hammering LinkedIn

const ALLOWED_EXPERIENCE = new Set([
  "internship", "entry", "associate", "mid-senior", "director", "executive", "any",
]);

const ALLOWED_JOBTYPE = new Set([
  "full-time", "part-time", "contract", "temporary", "volunteer", "internship", "remote", "any",
]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const keyword = searchParams.get("q");
    if (!keyword || !keyword.trim()) {
      return NextResponse.json(
        { error: "Query param 'q' (keyword) is required." },
        { status: 400 }
      );
    }

    const location = searchParams.get("l") || "Nagpur, India";
    const experience = (searchParams.get("experience") || "any").toLowerCase();
    const jobType = (searchParams.get("jobType") || "any").toLowerCase();
    const page = Math.max(0, Number(searchParams.get("page")) || 0);

    if (!ALLOWED_EXPERIENCE.has(experience)) {
      return NextResponse.json(
        { error: `Invalid experience value '${experience}'.` },
        { status: 400 }
      );
    }

    if (!ALLOWED_JOBTYPE.has(jobType)) {
      return NextResponse.json(
        { error: `Invalid jobType value '${jobType}'.` },
        { status: 400 }
      );
    }

    const result = await scrapeLinkedInPublic({
      keyword: keyword.trim(),
      location,
      experience,
      jobType,
      page,
    });

    if (result.blocked) {
      return NextResponse.json(
        { error: "LinkedIn blocked the request. Try again in a few minutes.", blocked: true },
        { status: 503 }
      );
    }

    return NextResponse.json({
      jobs: result.jobs,
      count: result.jobs.length,
      scrapedAt: new Date().toISOString(),
      page,
    });
  } catch (e: any) {
    console.error("[linkedin-jobs API] error:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
