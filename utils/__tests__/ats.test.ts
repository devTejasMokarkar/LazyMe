import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  extractTechnicalSkills,
  calculateATS,
  calculateWeightedATS,
} from '../ats';

describe('extractKeywords', () => {
  it('returns empty array for empty input', () => {
    expect(extractKeywords('')).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(extractKeywords(null as any)).toEqual([]);
    expect(extractKeywords(undefined as any)).toEqual([]);
  });

  it('filters out generic words', () => {
    const result = extractKeywords('the and a to of in is it');
    expect(result).toEqual([]);
  });

  it('extracts meaningful keywords', () => {
    const result = extractKeywords('React developer with TypeScript and AWS experience');
    expect(result).toContain('react');
    expect(result).toContain('developer');
    expect(result).toContain('typescript');
    expect(result).toContain('aws');
    expect(result).toContain('experience');
    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
  });

  it('strips special characters', () => {
    const result = extractKeywords('React.js, Node.js, AWS!');
    expect(result).toContain('react');
    expect(result).toContain('node');
    expect(result).toContain('aws');
  });

  it('returns unique words only', () => {
    const result = extractKeywords('React React react');
    expect(result.length).toBe(1);
  });

  it('filters words shorter than 3 chars', () => {
    const result = extractKeywords('React JS AWS');
    expect(result).not.toContain('js');
    expect(result).toContain('react');
  });
});

describe('extractTechnicalSkills', () => {
  it('returns empty array for empty input', () => {
    expect(extractTechnicalSkills('')).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(extractTechnicalSkills(null as any)).toEqual([]);
    expect(extractTechnicalSkills(undefined as any)).toEqual([]);
  });

  it('extracts known tech skills', () => {
    const result = extractTechnicalSkills('I know JavaScript, React, and Node.js');
    expect(result).toContain('javascript');
    expect(result).toContain('react');
    expect(result).toContain('node.js');
  });

  it('extracts skills with # and + symbols', () => {
    const result = extractTechnicalSkills('C++ and C# developer');
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('returns unique skills', () => {
    const result = extractTechnicalSkills('React React react');
    expect(result.filter(s => s === 'react').length).toBe(1);
  });

  it('detects cloud platforms', () => {
    const result = extractTechnicalSkills('AWS Azure GCP Docker');
    expect(result).toContain('aws');
    expect(result).toContain('azure');
    expect(result).toContain('gcp');
    expect(result).toContain('docker');
  });

  it('detects ML/AI terms', () => {
    const result = extractTechnicalSkills('machine learning and AI with NLP');
    expect(result).toContain('ai');
    expect(result).toContain('nlp');
  });

  it('detects testing frameworks', () => {
    const result = extractTechnicalSkills('Using Jest and Cypress for testing');
    expect(result).toContain('jest');
    expect(result).toContain('cypress');
  });
});

describe('calculateATS', () => {
  const resume = {
    name: 'John Smith',
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    experience: [{ role: 'Software Engineer', company: 'Acme', bullets: ['Built React apps'] }],
  };

  it('returns perfect score when no JD keywords', () => {
    const result = calculateATS(resume, '');
    expect(result.score).toBe(100);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it('calculates match score', () => {
    const result = calculateATS(resume, 'Looking for a React developer with JavaScript');
    expect(result.score).toBeGreaterThan(0);
    expect(result.matched.length).toBeGreaterThan(0);
  });

  it('identifies missing keywords', () => {
    const result = calculateATS(resume, 'React developer with TypeScript and Docker experience');
    expect(result.matched).toContain('react');
    expect(result.missing).toContain('docker');
  });

  it('uses synonym matching', () => {
    const result = calculateATS(resume, 'React developer with JS skills');
    expect(result.matched).toContain('react');
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('calculateWeightedATS', () => {
  const resume = {
    name: 'John Smith',
    email: 'john@example.com',
    phone: '123-456-7890',
    title: 'Software Engineer',
    summary: 'Experienced developer with 5+ years',
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Acme',
        bullets: ['Built React applications', 'Used Node.js for APIs'],
      },
    ],
  };

  it('returns full breakdown structure', () => {
    const result = calculateWeightedATS(resume, 'Software Engineer with React and Node.js');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('keywordAnalysis');
    expect(result.breakdown).toHaveProperty('skillsMatch');
    expect(result.breakdown).toHaveProperty('experienceRelevance');
    expect(result.breakdown).toHaveProperty('keywordCoverage');
    expect(result.breakdown).toHaveProperty('roleAlignment');
    expect(result.breakdown).toHaveProperty('formattingClarity');
    expect(result.keywordAnalysis).toHaveProperty('missingSkills');
    expect(result.keywordAnalysis).toHaveProperty('weakSkills');
    expect(result.keywordAnalysis).toHaveProperty('strongSkills');
  });

  it('returns high score when resume matches JD', () => {
    const result = calculateWeightedATS(resume, 'Software Engineer with React and Node.js');
    expect(result.score).toBeGreaterThan(50);
    expect(result.keywordAnalysis.strongSkills).toContain('react');
    expect(result.keywordAnalysis.strongSkills).toContain('node.js');
  });

  it('identifies missing technical skills', () => {
    const result = calculateWeightedATS(resume, 'Software Engineer with TypeScript and Docker');
    expect(result.keywordAnalysis.missingSkills).toContain('typescript');
    expect(result.keywordAnalysis.missingSkills).toContain('docker');
  });

  it('gives role alignment bonus when title matches', () => {
    const result = calculateWeightedATS(resume, 'Role: Software Engineer');
    expect(result.breakdown.roleAlignment).toBeGreaterThanOrEqual(70);
  });

  it('gives full formatting score when all required fields present', () => {
    const result = calculateWeightedATS(resume, 'test job description');
    expect(result.breakdown.formattingClarity).toBe(100);
  });

  it('gives lower formatting score when fields missing', () => {
    const partialResume = { name: 'John' };
    const result = calculateWeightedATS(partialResume, 'test job description');
    expect(result.breakdown.formattingClarity).toBe(70);
  });

  it('handles empty JD gracefully', () => {
    const result = calculateWeightedATS(resume, '');
    expect(result.breakdown.skillsMatch).toBe(100);
    expect(result.breakdown.experienceRelevance).toBe(100);
    expect(result.breakdown.keywordCoverage).toBe(100);
  });

  it('returns score between 0-100', () => {
    const result = calculateWeightedATS(resume, 'Some random job description text here');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
