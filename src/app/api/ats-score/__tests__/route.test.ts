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
  buildATSScorerPrompt: vi.fn(() => 'prompt'),
}));

vi.mock('@/lib/memo', () => ({
  memo: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { generateText, GeminiServiceError } from '@/features/ai/ai.service';

async function postToRoute(body: any) {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/ats-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req);
}

const VALID_RESUME = {
  name: 'John Doe',
  title: 'Engineer',
  summary: 'Experienced engineer',
  skills: ['JS'],
  experience: [],
  education: [],
};

describe('POST /api/ats-score', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when resume is missing', async () => {
    const res = await postToRoute({ jobDescription: 'jd' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing/i);
  });

  it('returns 400 when jobDescription is missing', async () => {
    const res = await postToRoute({ resume: VALID_RESUME });
    expect(res.status).toBe(400);
  });

  it('returns parsed JSON on success', async () => {
    const scoreData = {
      overall_score: 80,
      missing_keywords: ['react'],
      found_keywords: ['js'],
      weak_sections: ['summary'],
    };
    vi.mocked(generateText).mockResolvedValue('```json\n' + JSON.stringify(scoreData) + '\n```');

    const res = await postToRoute({ resume: VALID_RESUME, jobDescription: 'jd' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overall_score).toBe(80);
    expect(data.missing_keywords).toEqual(['react']);
  });

  it('returns 500 when AI response is not JSON', async () => {
    vi.mocked(generateText).mockResolvedValue('not json at all');
    const res = await postToRoute({ resume: VALID_RESUME, jobDescription: 'jd' });
    expect(res.status).toBe(500);
  });

  it('returns 429 (not 500) when GeminiServiceError is thrown', async () => {
    vi.mocked(generateText).mockRejectedValue(
      new GeminiServiceError('Rate limit', 429, { type: 'RPM', message: 'limit' })
    );
    const res = await postToRoute({ resume: VALID_RESUME, jobDescription: 'jd' });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Rate limit');
    expect(data.quota).toBeDefined();
  });

  it('returns 503 when GeminiServiceError has 503 status', async () => {
    vi.mocked(generateText).mockRejectedValue(
      new GeminiServiceError('Service down', 503, { type: 'UNKNOWN', message: 'down' })
    );
    const res = await postToRoute({ resume: VALID_RESUME, jobDescription: 'jd' });
    expect(res.status).toBe(503);
  });

  it('handles GeminiServiceError thrown as plain Error with .name', async () => {
    const err = new Error('quota hit');
    (err as any).name = 'GeminiServiceError';
    (err as any).status = 429;
    (err as any).quota = { type: 'RPM', message: 'quota' };
    vi.mocked(generateText).mockRejectedValue(err);

    const res = await postToRoute({ resume: VALID_RESUME, jobDescription: 'jd' });
    expect(res.status).toBe(429);
  });
});
