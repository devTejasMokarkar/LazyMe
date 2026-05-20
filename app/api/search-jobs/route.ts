import { NextResponse } from 'next/server';

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
}

export async function POST(request: Request) {
  try {
    const body: JobSearchRequest = await request.json();
    const { resumeData, keyword, location, minSalary, maxSalary, expFilter } = body;

    const apiToken = process.env.APIFY_NAUKRI_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: 'APIFY_NAUKRI_TOKEN not configured', code: 'NO_TOKEN' },
        { status: 500 }
      );
    }

    let searchKeyword = keyword;
    let searchLocation = location;

    // Use resume data directly - no AI calls to avoid quota issues
    if (resumeData && !keyword) {
      const jobTitle = resumeData.title || resumeData.experience?.[0]?.role || 'Software Developer';
      const userLocation = resumeData.location || '';
      
      searchKeyword = jobTitle;
      searchLocation = userLocation;
    }

    if (!searchKeyword) {
      return NextResponse.json(
        { error: 'No search keyword provided', code: 'NO_KEYWORD' },
        { status: 400 }
      );
    }

    const input: any = { position: searchKeyword };
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
          error: 'You have exceeded your Apify usage limit. Please upgrade your plan to continue searching for jobs.',
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: 'https://console.apify.com/billing/subscription'
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

    return NextResponse.json({ jobs });
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