import { NextResponse } from 'next/server';
import { expandSearchKeywords } from '@/utils/jobMatcher';
import { logger } from '@/lib/logger';

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
             logger.info('AI expanded keywords:', { keywords: expandedKeywords.slice(0, 3).join(', ') });
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

    return NextResponse.json({
      error: 'The Apify Naukri job search feature has been removed.',
      code: 'FEATURE_REMOVED',
      jobs: [],
      suggestion: 'manual'
    }, { status: 501 });
  } catch (error: any) {
    logger.error('Job search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
