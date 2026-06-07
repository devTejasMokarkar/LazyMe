import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/features/ai/ai.service', () => ({
  generateText: vi.fn(),
  GeminiServiceError: class GeminiServiceError extends Error {
    quota?: any;
    status?: number;
    constructor(message: string, status?: number, quota?: any) {
      super(message);
      this.name = 'GeminiServiceError';
      this.status = status;
      this.quota = quota;
    }
  },
}));

vi.mock('@/features/ai/prompts/ats.prompts', () => ({
  buildATSImproverPrompt: vi.fn(() => 'improver-prompt'),
  buildATSScorerPrompt: vi.fn(() => 'scorer-prompt'),
}));

vi.mock('@/features/ai/utils/resume-text', () => ({
  resumeToPlainText: vi.fn((r: any) => `PLAIN:${r.name || 'unknown'}`),
  parsePlainTextToResume: vi.fn((_text: string, fallback: any) => ({ ...fallback, summary: 'improved' })),
}));

vi.mock('@/features/ai/utils/section-utils', () => ({
  extractWeakSections: vi.fn((_text: string, weak: string[]) => `CONTENT:${weak.join(',')}`),
  extractSectionBodyBefore: vi.fn(() => ({ summary: 'old summary' })),
  mergeImprovedSections: vi.fn((text: string) => text + '\nMERGED'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { generateText, GeminiServiceError } from '@/features/ai/ai.service';

async function postToRoute(body: any) {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/optimize-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req);
}

const VALID_RESUME = {
  name: 'John',
  title: 'Eng',
  summary: 'sum',
  skills: ['JS'],
  experience: [{ company: 'C', role: 'R', duration: '2020', bullets: ['b'] }],
  education: [],
};

describe('POST /api/optimize-resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when resume missing', async () => {
    const res = await postToRoute({ jobDescription: 'jd' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when jobDescription missing', async () => {
    const res = await postToRoute({ resume: VALID_RESUME });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no weak content extracted', async () => {
    const { extractWeakSections } = await import('@/features/ai/utils/section-utils');
    vi.mocked(extractWeakSections).mockReturnValueOnce('');
    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      weakSections: ['unknown_section'],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/no weak sections/i);
  });

  it('returns improved resume on success with skipRescore', async () => {
    vi.mocked(generateText).mockResolvedValue('[SECTION: summary]\nNew improved summary');

    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      currentScore: 60,
      missingKeywords: ['react'],
      weakSections: ['summary'],
      skipRescore: true,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.improvedResume).toBeDefined();
    expect(data.discarded).toBe(false);
    expect(data.sectionsImproved).toEqual(['summary']);
  });

  it('extracts changes with before/after when AI returns [SECTION:] blocks', async () => {
    vi.mocked(generateText).mockResolvedValue(
      '[SECTION: summary]\nBrand new improved summary text here.'
    );

    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      weakSections: ['summary'],
      skipRescore: true,
    });
    const data = await res.json();
    expect(data.changes).toHaveLength(1);
    expect(data.changes[0].section).toBe('summary');
    expect(data.changes[0].after).toContain('Brand new');
    expect(data.changes[0].before).toBe('old summary');
  });

  it('discards improvement if re-score is lower (skipRescore=false)', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce('[SECTION: summary]\nNew summary')  // improver
      .mockResolvedValueOnce(JSON.stringify({ overall_score: 30 })); // rescore is lower

    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      currentScore: 60,
      weakSections: ['summary'],
    });
    const data = await res.json();
    expect(data.discarded).toBe(true);
    expect(data.newScore).toBe(60);
  });

  it('keeps improvement if re-score is higher', async () => {
    vi.mocked(generateText)
      .mockResolvedValueOnce('[SECTION: summary]\nNew summary')
      .mockResolvedValueOnce(JSON.stringify({ overall_score: 85 }));

    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      currentScore: 60,
      weakSections: ['summary'],
    });
    const data = await res.json();
    expect(data.discarded).toBe(false);
    expect(data.newScore).toBe(85);
  });

  it('returns 429 when GeminiServiceError is thrown', async () => {
    vi.mocked(generateText).mockRejectedValue(
      new GeminiServiceError('Rate limit', 429, { type: 'RPM', message: 'limit' })
    );
    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      weakSections: ['summary'],
    });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.quota).toBeDefined();
  });

  it('returns 500 on generic error', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('boom'));
    const res = await postToRoute({
      resume: VALID_RESUME,
      jobDescription: 'jd',
      weakSections: ['summary'],
    });
    expect(res.status).toBe(500);
  });
});
