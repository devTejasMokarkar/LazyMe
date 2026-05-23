import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { buildResumePrompt, buildCoverLetterPrompt } from "@/utils/promptBuilder";
import { calculateATS } from "@/utils/ats";
import { logger } from "@/lib/logger";

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

export interface AutoApplyRequest {
  resume: any;
  jobs: Job[];
  userEmail?: string;
  userName?: string;
  autoImprove?: boolean;
  generateCoverLetter?: boolean;
}

export interface AutoApplyResult {
  jobId: string;
  company: string;
  role: string;
  matchScore: number;
  resume: any;
  coverLetter?: string;
  atsScore: number;
  improved: boolean;
  previousAtsScore?: number;
  changes?: string[];
  readyToApply: boolean;
  applyMethod: "email" | "easy_apply" | "external";
}

const IMPROVE_RESUME_PROMPT = (resume: any, jobDescription: string) => `
You are an expert ATS optimizer. Improve the following resume to better match the job description.

Job Description:
${jobDescription}

Current Resume:
${JSON.stringify(resume, null, 2)}

Rules:
1. Add missing skills from job description that are relevant
2. Rewrite bullet points to include keywords from JD
3. Keep the resume truthful - don't fabricate experience
4. Focus on achievements and impact
5. Maintain the same structure
6. Return ONLY valid JSON with the same shape as input

Return the improved resume as valid JSON.
`;

async function improveResumeForJob(resume: any, jobDescription: string): Promise<{ improvedResume: any; changes: string[] }> {
  const prompt = IMPROVE_RESUME_PROMPT(resume, jobDescription);
  const response = await generateText(prompt);
  
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : response;
  const improvedResume = JSON.parse(jsonStr);
  
  // Track changes (simplified)
  const changes: string[] = [];
  if (JSON.stringify(resume.skills) !== JSON.stringify(improvedResume.skills)) {
    changes.push("Added missing skills from job description");
  }
  if (JSON.stringify(resume.experience) !== JSON.stringify(improvedResume.experience)) {
    changes.push("Optimized experience bullets for ATS");
  }
  
  return { improvedResume, changes };
}

async function processSingleJob(
  resume: any,
  job: Job,
  autoImprove: boolean,
  generateCoverLetter: boolean
): Promise<AutoApplyResult> {
  // Step 1: Calculate initial ATS score
  const initialATS = calculateATS(resume, job.description);
  
  let currentResume = resume;
  let improved = false;
  let previousAtsScore: number | undefined;
  let changes: string[] | undefined;
  let coverLetter: string | undefined;
  
  // Step 2: Auto-improve if ATS < 70 and auto-improve is enabled
  if (autoImprove && initialATS.score < 70) {
    previousAtsScore = initialATS.score;
    const improveResult = await improveResumeForJob(resume, job.description);
    currentResume = improveResult.improvedResume;
    changes = improveResult.changes;
    improved = true;
  }
  
  // Step 3: Recalculate ATS after improvement
  const finalATS = calculateATS(currentResume, job.description);
  
  // Step 4: Generate cover letter if requested
  if (generateCoverLetter && job.description) {
    const coverPrompt = buildCoverLetterPrompt(currentResume, job.description, job.company);
    coverLetter = await generateText(coverPrompt);
  }
  
  return {
    jobId: job.id,
    company: job.company,
    role: job.role,
    matchScore: finalATS.score,
    resume: currentResume,
    coverLetter,
    atsScore: finalATS.score,
    improved,
    previousAtsScore,
    changes,
    readyToApply: true,
    applyMethod: job.applyType,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: AutoApplyRequest = await req.json();
    const { resume, jobs, userEmail, userName, autoImprove = true, generateCoverLetter = true } = body;

    if (!resume || !jobs || !Array.isArray(jobs)) {
      return NextResponse.json(
        { error: "Missing required fields: resume and jobs array" },
        { status: 400 }
      );
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "No jobs provided" },
        { status: 400 }
      );
    }

    // Process all jobs in parallel for speed
    const results = await Promise.all(
      jobs.map(job => processSingleJob(resume, job, autoImprove, generateCoverLetter))
    );

    // Sort by match score (highest first)
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Summary statistics
    const summary = {
      totalJobs: results.length,
      averageMatchScore: Math.round(results.reduce((sum, r) => sum + r.matchScore, 0) / results.length),
      improvedCount: results.filter(r => r.improved).length,
      readyToApplyCount: results.filter(r => r.readyToApply).length,
      emailApplyCount: results.filter(r => r.applyMethod === "email").length,
      easyApplyCount: results.filter(r => r.applyMethod === "easy_apply").length,
    };

    return NextResponse.json({
      results,
      summary,
      userEmail,
      userName,
    });
   } catch (error: any) {
     logger.error("Auto-apply processing error:", error);
    if (error.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process auto-apply" },
      { status: 500 }
    );
  }
}
