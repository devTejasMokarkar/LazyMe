import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the logger and gemini modules
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// We need to test the pure internal functions
// Since they're not exported, we'll test through the public API with mocks
import { expandSearchKeywords } from '../jobMatcher';

// Mock callOpenRouterForKeywordExpand - it's not directly imported, it's called internally
// The module uses callOpenRouter internally via import { callOpenRouter } from "./gemini"
// So let's mock that
vi.mock('../gemini', () => ({
  callOpenRouter: vi.fn(),
}));

describe('expandSearchKeywords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fallback keywords when AI call fails', async () => {
    const { callOpenRouter } = await import('../gemini');
    (callOpenRouter as any).mockRejectedValue(new Error('API error'));

    const result = await expandSearchKeywords({
      title: 'Software Engineer',
      skills: ['React', 'Node.js', 'Python'],
      experience: [{ role: 'Frontend Developer' }],
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBe('Software Engineer');
  });

  it('returns fallback keywords when AI returns empty', async () => {
    const { callOpenRouter } = await import('../gemini');
    (callOpenRouter as any).mockResolvedValue('');

    const result = await expandSearchKeywords({
      title: 'Developer',
      skills: ['React'],
    });

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('limits keywords to 8', async () => {
    const { callOpenRouter } = await import('../gemini');
    (callOpenRouter as any).mockRejectedValue(new Error('fail'));

    const result = await expandSearchKeywords({
      title: 'Engineer',
      skills: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      experience: [{ role: 'Dev' }, { role: 'Sr Dev' }, { role: 'Lead' }],
    });

    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('handles empty resume data gracefully', async () => {
    const result = await expandSearchKeywords({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('analyzeJobMatch (fallback behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fallback match when AI fails', async () => {
    const { callOpenRouter } = await import('../gemini');
    (callOpenRouter as any).mockRejectedValue(new Error('fail'));

    const { analyzeJobMatch } = await import('../jobMatcher');

    const result = await analyzeJobMatch(
      { title: 'Engineer', skills: ['React'], summary: 'A good engineer' },
      'We need an Engineer with React'
    );

    expect(result).toHaveProperty('matchScore');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('gaps');
    expect(result).toHaveProperty('missingSkills');
    expect(result).toHaveProperty('recommendation');
    expect(result).toHaveProperty('shouldApply');
    expect(result.gaps).toContain('AI analysis unavailable');
  });

  it('caps fallback score at 85', async () => {
    const { callOpenRouter } = await import('../gemini');
    (callOpenRouter as any).mockRejectedValue(new Error('fail'));

    const { analyzeJobMatch } = await import('../jobMatcher');

    const identicalText = 'Engineer React We need an Engineer with React'.repeat(100);
    const result = await analyzeJobMatch(
      { title: 'Engineer', skills: ['React'], summary: identicalText },
      identicalText
    );

    expect(result.matchScore).toBeLessThanOrEqual(85);
  });
});
