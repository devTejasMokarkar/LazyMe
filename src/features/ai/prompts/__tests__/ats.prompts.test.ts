import { describe, it, expect } from 'vitest';
import { buildATSScorerPrompt, buildATSImproverPrompt } from '../ats.prompts';

describe('buildATSScorerPrompt', () => {
  it('includes resume and job description in the prompt', () => {
    const resume = { name: 'John', skills: ['JS'] };
    const jd = 'Looking for a JS developer';
    const prompt = buildATSScorerPrompt(resume, jd);
    expect(prompt).toContain('John');
    expect(prompt).toContain('JS developer');
    expect(prompt.toLowerCase()).toContain('ats');
  });

  it('returns non-empty string', () => {
    const prompt = buildATSScorerPrompt({}, 'jd');
    expect(prompt.length).toBeGreaterThan(0);
  });
});

describe('buildATSImproverPrompt', () => {
  it('includes current score, keywords, and sections', () => {
    const prompt = buildATSImproverPrompt(50, 'react, node', 'PROFESSIONAL SUMMARY\ntext', 'jd', '');
    expect(prompt).toContain('50');
    expect(prompt).toContain('react, node');
    expect(prompt).toContain('PROFESSIONAL SUMMARY');
    expect(prompt).toContain('jd');
  });

  it('handles empty titleInJd', () => {
    const prompt = buildATSImproverPrompt(70, 'kw', 'content', 'jd', '');
    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('uses [SECTION:] marker in output instructions', () => {
    const prompt = buildATSImproverPrompt(50, '', 'content', 'jd', 'Senior Dev');
    expect(prompt).toContain('[SECTION:');
  });
});
