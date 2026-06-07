import { describe, it, expect } from 'vitest';
import {
  extractWeakSections,
  extractSectionBodyBefore,
  mergeImprovedSections,
} from '../section-utils';

const RESUME = `Name: Jane Doe
Title: Engineer
Email: jane@example.com

PROFESSIONAL SUMMARY
Experienced engineer with strong React skills.

TECHNICAL SKILLS
React, Node.js, TypeScript, AWS

PROFESSIONAL EXPERIENCE
Engineer at Acme | 2020 - Present
  • Built scalable APIs
  • Led migration to microservices
  • Mentored junior devs

EDUCATION
BS CS - MIT (2018)
`;

describe('extractWeakSections', () => {
  it('extracts summary section', () => {
    const result = extractWeakSections(RESUME, ['summary']);
    expect(result).toContain('[SECTION: summary]');
    expect(result).toContain('PROFESSIONAL SUMMARY');
    expect(result).toContain('Experienced engineer');
  });

  it('extracts skills section', () => {
    const result = extractWeakSections(RESUME, ['skills']);
    expect(result).toContain('[SECTION: skills]');
    expect(result).toContain('React, Node.js');
  });

  it('extracts experience section', () => {
    const result = extractWeakSections(RESUME, ['experience']);
    expect(result).toContain('[SECTION: experience]');
    expect(result).toContain('Engineer at Acme');
    expect(result).toContain('Built scalable APIs');
  });

  it('handles multiple weak sections with separator', () => {
    const result = extractWeakSections(RESUME, ['summary', 'skills']);
    expect(result).toContain('[SECTION: summary]');
    expect(result).toContain('[SECTION: skills]');
    expect(result).toContain('---');
  });

  it('returns empty string for unknown section', () => {
    expect(extractWeakSections(RESUME, ['unknown_section'])).toBe('');
  });

  it('returns empty string when all sections unknown', () => {
    expect(extractWeakSections(RESUME, ['foo', 'bar'])).toBe('');
  });

  it('filters out unknown sections and keeps known ones', () => {
    const result = extractWeakSections(RESUME, ['summary', 'foo']);
    expect(result).toContain('[SECTION: summary]');
    expect(result).not.toContain('[SECTION: foo]');
  });

  it('returns empty string for empty weakSections array', () => {
    expect(extractWeakSections(RESUME, [])).toBe('');
  });
});

describe('extractSectionBodyBefore', () => {
  it('returns a map of section to its body', () => {
    const map = extractSectionBodyBefore(RESUME, ['summary', 'skills']);
    expect(map.summary).toContain('PROFESSIONAL SUMMARY');
    expect(map.skills).toContain('React, Node.js');
  });

  it('skips unknown sections silently', () => {
    const map = extractSectionBodyBefore(RESUME, ['unknown']);
    expect(map).toEqual({});
  });
});

describe('mergeImprovedSections', () => {
  it('replaces summary in original with new content', () => {
    const improved = '[SECTION: summary]\nBrand new summary text';
    const merged = mergeImprovedSections(RESUME, improved);
    expect(merged).toContain('Brand new summary text');
    expect(merged).not.toContain('Experienced engineer with strong React skills');
  });

  it('preserves sections not mentioned in improved text', () => {
    const improved = '[SECTION: summary]\nNew summary';
    const merged = mergeImprovedSections(RESUME, improved);
    expect(merged).toContain('TECHNICAL SKILLS');
    expect(merged).toContain('React, Node.js');
  });

  it('handles multiple section replacements', () => {
    const improved = `[SECTION: summary]\nNew summary

[SECTION: skills]\nPython, Go, Rust`;
    const merged = mergeImprovedSections(RESUME, improved);
    expect(merged).toContain('New summary');
    expect(merged).toContain('Python, Go, Rust');
    expect(merged).not.toContain('React, Node.js');
  });

  it('ignores sections without a known merge pattern', () => {
    const improved = '[SECTION: unknown]\nrandom text';
    const merged = mergeImprovedSections(RESUME, improved);
    expect(merged).toBe(RESUME);
  });

  it('returns original when improved text has no [SECTION:] markers', () => {
    const merged = mergeImprovedSections(RESUME, 'just some text');
    expect(merged).toBe(RESUME);
  });
});
