import { NextResponse } from 'next/server';
import { expandSearchKeywords, analyzeJobMatch, JobMatchResult } from '@/utils/jobMatcher';

interface JobSearchRequest {
  resumeData?: {
    title?: string;
    skills?: string[];
    location?: string;
    experience?: Array<{ role?: string; company?: string }>;
  };
  keyword?: string;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  expFilter?: number;
  useAI?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: JobSearchRequest = await request.json();
    const { resumeData, keyword, location, minSalary, maxSalary, expFilter, useAI = true } = body;

    const apiToken = process.env.APIFY_NAUKRI_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'APIFY_NAUKRI_TOKEN not configured', code: 'NO_TOKEN' },
        { status: 500 }
      );
    }

    let searchKeyword = keyword;
    let searchLocation = location;
    let expandedKeywords: string[] = [];

    // Use resume data directly or with AI enhancement
    if (resumeData && !keyword) {
      const jobTitle = resumeData.title || resumeData.experience?.[0]?.role || 'Software Developer';
      const userLocation = resumeData.location || '';
      
      searchKeyword = jobTitle;
      searchLocation = userLocation;

      // AI-powered keyword expansion for better job search
      if (useAI) {
        try {
          expandedKeywords = await expandSearchKeywords(resumeData);
          if (expandedKeywords.length > 0) {
            console.log('AI expanded keywords:', expandedKeywords.slice(0, 3).join(', '));
          }
        } catch (error) {
          // Silently use fallback
          expandedKeywords = [];
        }
      }
    }

    if (!searchKeyword) {
      return NextResponse.json(
        { error: 'No search keyword provided', code: 'NO_KEYWORD' },
        { status: 400 }
      );
    }

    // Build search input for Apify - use expanded keywords if available
    const input: any = { 
      position: expandedKeywords.length > 0 ? expandedKeywords[0] : searchKeyword 
    };
    if (searchLocation) input.location = searchLocation;
    if (minSalary) input.minSalary = minSalary;
    if (maxSalary) input.maxSalary = maxSalary;
    if (expFilter) input.experienceMin = expFilter;

    const runRes = await fetch(`https://api.apify.com/v2/acts/muhammetakkurtt~naukri-job-scraper/runs?token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    // Handle payment/upgrade required error
    if (runRes.status === 402) {
      return NextResponse.json(
        { 
          error: 'Apify free tier limit reached. Try manual search or wait a few minutes.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: 'https://console.apify.com/billing/subscription',
          jobs: [],
          message: 'Apify search limit reached. Try manual search below.',
          suggestion: 'manual'
        },
        { status: 402 }
      );
    }

    if (!runRes.ok) {
      const err = await runRes.json().catch(() => ({}));
      const errorMsg = err.error?.message || `Apify API error ${runRes.status}`;
      
      // Check for other common errors
      if (runRes.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API token. Please check your Apify token configuration.', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: errorMsg, code: 'API_ERROR' },
        { status: runRes.status }
      );
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;

    if (!runId) {
      return NextResponse.json(
        { error: 'No run ID returned from Apify', code: 'NO_RUN_ID' },
        { status: 500 }
      );
    }

    const jobs = await pollForResults(runId, apiToken);

    // AI-powered job matching and scoring
    let jobsWithScores: any[] = [];
    if (resumeData && useAI && jobs.length > 0) {
      try {
        // Score jobs in parallel (limit to avoid rate limits)
        const jobsToScore = jobs.slice(0, 20);
        const scorePromises = jobsToScore.map(async (job: any) => {
          try {
            const jobDesc = job.description || job.requirements || job.title || '';
            if (!jobDesc) return { ...job, matchScore: 0, matchAnalysis: null };
            
            const matchResult = await analyzeJobMatch(resumeData, jobDesc);
            return {
              ...job,
              matchScore: matchResult.matchScore,
              matchAnalysis: matchResult
            };
          } catch (error) {
            // Return job without AI score
            return { ...job, matchScore: 0, matchAnalysis: null };
          }
        });

        const scoredJobs = await Promise.all(scorePromises);
        jobsWithScores = scoredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      } catch (error) {
        // Return unsorted jobs if AI scoring fails
        jobsWithScores = jobs;
      }
    } else {
      jobsWithScores = jobs;
    }

    return NextResponse.json({ 
      jobs: jobsWithScores,
      expandedKeywords,
      searchKeyword: input.position,
      aiFallback: expandedKeywords.length === 0
    });
  } catch (error: any) {
    console.error('Job search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

async function pollForResults(runId: string, token: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 4000));

    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      const datasetId = statusData.data?.defaultDatasetId;
      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=30`);
      return await itemsRes.json();
    } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status.toLowerCase()}`);
    }
  }
  throw new Error('Timed out waiting for actor to finish');
}
