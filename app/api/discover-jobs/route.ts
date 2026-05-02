import { NextRequest, NextResponse } from "next/server";
import { calculateATS, extractKeywords } from "@/utils/ats";

export interface Job {
  id: string;
  company: string;
  role: string;
  description: string;
  email?: string;
  location?: string;
  applyType: "email" | "easy_apply" | "external";
  url?: string;
}

export interface MatchedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

function extractSkillsFromResume(resume: any): string[] {
  const resumeText = JSON.stringify(resume);
  return extractKeywords(resumeText);
}

function matchJobToResume(job: Job, resumeSkills: string[], resume: any): MatchedJob {
  const atsResult = calculateATS(resume, job.description);
  
  return {
    ...job,
    matchScore: atsResult.score,
    matchedSkills: atsResult.matched,
    missingSkills: atsResult.missing,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume, jobs, preferredRole, location } = body;

    if (!resume || !jobs || !Array.isArray(jobs)) {
      return NextResponse.json(
        { error: "Missing required fields: resume and jobs array" },
        { status: 400 }
      );
    }

    // Extract skills from resume
    const resumeSkills = extractSkillsFromResume(resume);

    // Match each job against resume
    const matchedJobs = jobs.map((job: Job) => matchJobToResume(job, resumeSkills, resume));

    // Filter and sort by match score
    let filteredJobs = matchedJobs;

    // Filter by preferred role if specified
    if (preferredRole) {
      const roleLower = preferredRole.toLowerCase();
      filteredJobs = filteredJobs.filter(job => 
        job.role.toLowerCase().includes(roleLower) ||
        job.description.toLowerCase().includes(roleLower)
      );
    }

    // Filter by location if specified
    if (location) {
      const locationLower = location.toLowerCase();
      filteredJobs = filteredJobs.filter(job =>
        job.location?.toLowerCase().includes(locationLower) ||
        job.company.toLowerCase().includes(locationLower)
      );
    }

    // Sort by match score (highest first)
    filteredJobs.sort((a, b) => b.matchScore - a.matchScore);

    // Categorize jobs
    const highMatch = filteredJobs.filter(job => job.matchScore >= 70);
    const mediumMatch = filteredJobs.filter(job => job.matchScore >= 50 && job.matchScore < 70);
    const lowMatch = filteredJobs.filter(job => job.matchScore < 50);

    return NextResponse.json({
      jobs: filteredJobs,
      summary: {
        total: filteredJobs.length,
        highMatch: highMatch.length,
        mediumMatch: mediumMatch.length,
        lowMatch: lowMatch.length,
      },
      categories: {
        high: highMatch,
        medium: mediumMatch,
        low: lowMatch,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to discover jobs" },
      { status: 500 }
    );
  }
}
