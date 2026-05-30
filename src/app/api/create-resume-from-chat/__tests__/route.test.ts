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

vi.mock('@/utils/promptBuilder', () => ({
  buildResumeFromChatPrompt: vi.fn((msg: string) => `prompt-for:${msg}`),
}));

import { generateText } from '@/features/ai/ai.service';

async function postToRoute(body: any) {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/create-resume-from-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe('POST /api/create-resume-from-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for empty message', async () => {
    const res = await postToRoute({ message: '' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Message is required');
  });

  it('returns 400 for missing message', async () => {
    const res = await postToRoute({});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Message is required');
  });

  it('returns 400 for non-string message', async () => {
    const res = await postToRoute({ message: 42 });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Message is required');
  });

  it('returns 400 for whitespace-only message', async () => {
    const res = await postToRoute({ message: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns sanitized resume JSON on success', async () => {
    const mockResume = {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '',
      location: 'SF',
      title: 'Developer',
      summary: 'A great dev',
      skills: ['React', 'Node'],
      experience: [{ company: 'C1', role: 'Dev', duration: '2020', bullets: ['Worked'] }],
      education: [{ school: 'MIT', degree: 'BS', year: '2019' }],
      projects: [{ name: 'P1', description: 'Desc', tech: ['JS'] }],
    };

    vi.mocked(generateText).mockResolvedValue(JSON.stringify(mockResume));

    const res = await postToRoute({ message: 'I am Rahul, a React dev' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.resume).toEqual(mockResume);
  });

  it('parses JSON from markdown-fenced response', async () => {
    const mockResume = { name: 'Jane', title: 'Engineer' };
    vi.mocked(generateText).mockResolvedValue('```json\n' + JSON.stringify(mockResume) + '\n```');
    const res = await postToRoute({ message: 'Jane, engineer' });
    const data = await res.json();
    expect(data.resume.name).toBe('Jane');
    expect(data.resume.title).toBe('Engineer');
  });

  it('provides fallback defaults for missing resume fields', async () => {
    vi.mocked(generateText).mockResolvedValue(JSON.stringify({ name: 'John' }));
    const res = await postToRoute({ message: 'John' });
    const data = await res.json();
    expect(data.resume.name).toBe('John');
    expect(data.resume.skills).toEqual([]);
    expect(data.resume.experience).toEqual([]);
    expect(data.resume.education).toEqual([]);
    expect(data.resume.email).toBe('');
    expect(data.resume.phone).toBe('');
  });

  it('returns 500 when AI response is not valid JSON', async () => {
    vi.mocked(generateText).mockResolvedValue('not json at all');
    const res = await postToRoute({ message: 'test' });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Invalid response format from AI service');
  });

  it('returns 429 style error for GeminiServiceError with quota info', async () => {
    const { GeminiServiceError } = await import('@/features/ai/ai.service');
    vi.mocked(generateText).mockRejectedValue(
      new GeminiServiceError('Rate limit hit, try again', 429, {
        type: 'RPM',
        message: 'Rate limit reached',
      })
    );
    const res = await postToRoute({ message: 'test' });
    const data = await res.json();
    expect(data.error).toBe('Rate limit hit, try again');
    expect(data.quota).toBeDefined();
  });
});
