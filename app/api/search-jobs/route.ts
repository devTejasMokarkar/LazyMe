import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
        { error: 'APIFY_NAUKRI_TOKEN not configured' },
        { status: 500 }
      );
    }

    let searchKeyword = keyword;
    let searchLocation = location;

    if (resumeData && !keyword) {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const skillsList = resumeData.skills?.slice(0, 8).join(', ') || '';
      const jobTitle = resumeData.title || resumeData.experience?.[0]?.role || 'Software Developer';
      const userLocation = resumeData.location || '';
      const yearsExp = resumeData.experience?.length ? `${resumeData.experience.length}+ years` : '';

      const prompt = `Based on this resume data, suggest the best job search keywords to find relevant job opportunities on Naukri (Indian job site).

Resume:
- Title/Role: ${jobTitle}
- Skills: ${skillsList}
- Location: ${userLocation}
- Experience: ${yearsExp}

Return ONLY a JSON object with this exact format (no other text):
{
  "keyword": "best job title keywords for naukri",
  "location": "best city to search in india"
}

Rules:
- Keyword should be job title only (e.g., "React Developer", "Full Stack Engineer", "Python Developer")
- Don't include skills in keyword
- Location should be a major Indian city
- If no specific skills, use general role-based keywords`;

      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          searchKeyword = parsed.keyword || jobTitle;
          searchLocation = parsed.location || userLocation;
        }
      } catch (aiError) {
        console.error('AI parsing error:', aiError);
        searchKeyword = jobTitle;
        searchLocation = userLocation;
      }
    }

    if (!searchKeyword) {
      return NextResponse.json(
        { error: 'No search keyword provided' },
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

    if (!runRes.ok) {
      const err = await runRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error?.message || `Apify API error ${runRes.status}` },
        { status: runRes.status }
      );
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;

    if (!runId) {
      return NextResponse.json(
        { error: 'No run ID returned from Apify' },
        { status: 500 }
      );
    }

    const jobs = await pollForResults(runId, apiToken);

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Job search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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