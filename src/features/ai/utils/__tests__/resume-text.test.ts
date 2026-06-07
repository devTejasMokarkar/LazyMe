import { describe, it, expect } from 'vitest';
import {
  resumeToPlainText,
  parsePlainTextToResume,
} from '../resume-text';

const SAMPLE_RESUME = {
  name: 'Jane Doe',
  title: 'Senior Engineer',
  email: 'jane@example.com',
  phone: '555-1234',
  location: 'SF',
  summary: 'Experienced engineer with 10 years of work.',
  skills: ['React', 'Node.js', 'TypeScript'],
  experience: [
    {
      company: 'Acme',
      role: 'Engineer',
      duration: '2020 - Present',
      bullets: ['Built X', 'Shipped Y'],
    },
    {
      company: 'Foo',
      role: 'Junior Dev',
      duration: '2018 - 2020',
      bullets: ['Did Z'],
    },
  ],
  education: [
    { school: 'MIT', degree: 'BS CS', year: '2018' },
  ],
  projects: [
    { name: 'ProjA', description: 'A cool project', tech: ['React', 'AWS'] },
  ],
};

describe('resumeToPlainText', () => {
  it('includes name, title, contact info', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('Name: Jane Doe');
    expect(text).toContain('Title: Senior Engineer');
    expect(text).toContain('Email: jane@example.com');
    expect(text).toContain('Phone: 555-1234');
    expect(text).toContain('Location: SF');
  });

  it('includes summary under PROFESSIONAL SUMMARY', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('PROFESSIONAL SUMMARY');
    expect(text).toContain('Experienced engineer with 10 years');
  });

  it('includes skills under TECHNICAL SKILLS', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('TECHNICAL SKILLS');
    expect(text).toContain('React, Node.js, TypeScript');
  });

  it('includes experience entries with bullets', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('PROFESSIONAL EXPERIENCE');
    expect(text).toContain('Engineer at Acme');
    expect(text).toContain('  • Built X');
    expect(text).toContain('  • Shipped Y');
  });

  it('includes education', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('EDUCATION');
    expect(text).toContain('BS CS - MIT (2018)');
  });

  it('includes projects', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    expect(text).toContain('PROJECTS');
    expect(text).toContain('ProjA');
    expect(text).toContain('Tech: React, AWS');
  });

  it('flattens skills when passed as object with arrays', () => {
    const text = resumeToPlainText({ ...SAMPLE_RESUME, skills: { languages: ['JS', 'TS'], tools: ['Git'] } as any });
    expect(text).toContain('JS');
    expect(text).toContain('TS');
    expect(text).toContain('Git');
  });

  it('returns empty string for empty resume', () => {
    const text = resumeToPlainText({});
    expect(text.trim()).toBe('');
  });
});

describe('parsePlainTextToResume', () => {
  it('round-trips a resume back to structured form', () => {
    const text = resumeToPlainText(SAMPLE_RESUME);
    const parsed = parsePlainTextToResume(text, {});
    expect(parsed.name).toBe('Jane Doe');
    expect(parsed.title).toBe('Senior Engineer');
    expect(parsed.email).toBe('jane@example.com');
    expect(parsed.summary).toContain('Experienced engineer');
    expect(parsed.skills).toEqual(expect.arrayContaining(['React', 'Node.js', 'TypeScript']));
    expect(parsed.experience).toHaveLength(2);
    expect(parsed.experience![0].company).toBe('Acme');
    expect(parsed.experience![0].bullets).toContain('Built X');
    expect(parsed.education![0].school).toBe('MIT');
  });

  it('preserves fallback fields when section is missing', () => {
    const fallback = { name: 'Fallback', email: 'fb@x.com' };
    const parsed = parsePlainTextToResume('', fallback);
    expect(parsed.name).toBe('Fallback');
    expect(parsed.email).toBe('fb@x.com');
  });

  it('parses experience bullets correctly', () => {
    const text = `Title: Dev
Name: A
Email: a@b.com

PROFESSIONAL EXPERIENCE

Engineer at Acme | 2020
• Built X
• Shipped Y
`;
    const parsed = parsePlainTextToResume(text, {});
    expect(parsed.experience).toBeDefined();
    expect(parsed.experience![0].bullets).toEqual(['Built X', 'Shipped Y']);
  });
});
