import { NextRequest, NextResponse } from "next/server";
import { calculateWeightedATS, extractTechnicalSkills } from "@/features/ai/ats.service";

export interface Job {
  id: string;
  company: string;
  role: string;
  description: string;
  email?: string;
  location?: string;
  applyType: "email" | "easy_apply" | "external";
  url?: string;
  salary?: string;
  logo?: string;
  logoColor?: string;
}

export interface MatchedJob extends Job {
  matchScore: number;
  matchFactors: {
    label: string;
    score: number;
  }[];
  tags: string[];
}

function matchJobToResume(job: Job, resume: any): MatchedJob {
  const atsResult = calculateWeightedATS(resume, job.description);
  
  // Extract tags from description for UI
  const tags = extractTechnicalSkills(job.description).slice(0, 3);

  return {
    ...job,
    matchScore: atsResult.score,
    matchFactors: [
      { label: 'Skills', score: atsResult.breakdown.skillsMatch },
      { label: 'Experience', score: atsResult.breakdown.experienceRelevance },
      { label: 'Keyword Match', score: atsResult.breakdown.keywordCoverage },
      { label: 'Formatting', score: atsResult.breakdown.formattingClarity }
    ],
    tags: tags.length > 0 ? tags : ["General"],
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

    // Match each job against resume
    const matchedJobs = jobs.map((job: Job) => matchJobToResume(job, resume));

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
    });
  } catch (error: any) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      { error: "Failed to discover jobs" },
      { status: 500 }
    );
  }
}
