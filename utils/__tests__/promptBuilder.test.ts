import { describe, it, expect } from 'vitest';
import {
  buildResumePrompt,
  buildCoverLetterPrompt,
  buildATSOptimizationPrompt,
} from '../promptBuilder';

describe('buildResumePrompt', () => {
  it('returns a string with resume data', () => {
    const result = buildResumePrompt({ name: 'John Smith', title: 'Engineer' });
    expect(result).toContain('John Smith');
    expect(result).toContain('Engineer');
    expect(result).toContain('Generate a professional resume');
    expect(result).toContain('valid JSON');
  });

  it('includes job description when provided', () => {
    const result = buildResumePrompt({ name: 'John' }, 'Software Developer job');
    expect(result).toContain('Job Description: Software Developer job');
    expect(result).toContain('Tailor to the job description');
  });

  it('omits job description section when not provided', () => {
    const result = buildResumePrompt({ name: 'John' });
    expect(result).not.toContain('Job Description:');
  });

  it('includes experience and education structure', () => {
    const result = buildResumePrompt({ name: 'John' });
    expect(result).toContain('"experience"');
    expect(result).toContain('"education"');
    expect(result).toContain('"projects"');
    expect(result).toContain('"skills"');
  });
});

describe('buildCoverLetterPrompt', () => {
  it('returns a prompt with candidate info', () => {
    const result = buildCoverLetterPrompt(
      { name: 'Jane', title: 'Developer', skills: ['React', 'Node'] },
      'Job description text',
      'Acme Corp'
    );
    expect(result).toContain('Jane');
    expect(result).toContain('Developer');
    expect(result).toContain('React, Node');
    expect(result).toContain('Acme Corp');
  });

  it('handles empty skills gracefully', () => {
    const result = buildCoverLetterPrompt(
      { name: 'Jane', title: 'Developer' },
      'Job description',
      'Acme Corp'
    );
    expect(result).toContain('various technical skills');
  });

  it('handles empty experience gracefully', () => {
    const result = buildCoverLetterPrompt(
      { name: 'Jane', title: 'Developer' },
      'Job description',
      'Acme Corp'
    );
    expect(result).toContain('relevant professional experience');
  });

  it('includes experience details when available', () => {
    const result = buildCoverLetterPrompt(
      {
        name: 'Jane',
        title: 'Developer',
        experience: [{ role: 'Engineer', company: 'Acme', duration: '2020-2023', bullets: [] }],
      },
      'Job description',
      'Acme Corp'
    );
    expect(result).toContain('Engineer at Acme');
  });

  it('sets word limit to 150', () => {
    const result = buildCoverLetterPrompt(
      { name: 'Jane', title: 'Developer' },
      'Job description',
      'Acme Corp'
    );
    expect(result).toContain('under 150 words');
  });
});

describe('buildATSOptimizationPrompt', () => {
  const resume = { name: 'John', title: 'Engineer', skills: ['React'] };
  const jd = 'Looking for React developer';

  it('returns a string with resume and job description', () => {
    const result = buildATSOptimizationPrompt(resume, jd);
    expect(result).toContain('John');
    expect(result).toContain('React developer');
  });

  it('includes scoring weights', () => {
    const result = buildATSOptimizationPrompt(resume, jd);
    expect(result).toContain('Skills match (40%)');
    expect(result).toContain('Experience relevance (25%)');
    expect(result).toContain('Keyword coverage (15%)');
    expect(result).toContain('Role alignment (10%)');
    expect(result).toContain('Formatting & clarity (10%)');
  });

  it('includes strict JSON output instruction', () => {
    const result = buildATSOptimizationPrompt(resume, jd);
    expect(result).toContain('valid JSON');
  });

  it('includes gap analysis instructions', () => {
    const result = buildATSOptimizationPrompt(resume, jd);
    expect(result).toContain('GAP ANALYSIS');
  });
});
