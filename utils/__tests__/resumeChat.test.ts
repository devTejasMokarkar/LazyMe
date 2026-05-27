import { describe, it, expect } from 'vitest';
import { formatResumePreview } from '../resumeChat';
import type { ResumeData } from '../resumeChat';

describe('formatResumePreview', () => {
  const fullResume: ResumeData = {
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '+1-555-0100',
    location: 'San Francisco, CA',
    title: 'Senior Full-Stack Developer',
    summary: 'Experienced full-stack developer with 5+ years building scalable web applications.',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    experience: [
      {
        company: 'TechCorp',
        role: 'Senior Developer',
        duration: '2021 - Present',
        bullets: ['Led a team of 5 engineers', 'Built REST APIs handling 10k+ requests/min'],
      },
    ],
    education: [
      {
        school: 'MIT',
        degree: 'B.S. Computer Science',
        year: '2019',
      },
    ],
    projects: [
      {
        name: 'OpenDash',
        description: 'Open-source dashboard for monitoring cloud infrastructure',
        tech: ['React', 'D3.js', 'GraphQL'],
      },
    ],
  };

  it('includes name and title at the top', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('**Rahul Sharma**');
    expect(result).toContain('Senior Full-Stack Developer');
  });

  it('includes contact info line with email, phone, location', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('rahul@example.com');
    expect(result).toContain('+1-555-0100');
    expect(result).toContain('San Francisco, CA');
  });

  it('includes summary wrapped in italics', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('*Experienced full-stack developer');
  });

  it('lists skills after Skills heading', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('**Skills:**');
    expect(result).toContain('React');
    expect(result).toContain('TypeScript');
    expect(result).toContain('AWS');
  });

  it('formats experience entries with role, company, duration, bullets', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('**Experience:**');
    expect(result).toContain('Senior Developer @ TechCorp (2021 - Present)');
    expect(result).toContain('- Led a team of 5 engineers');
    expect(result).toContain('- Built REST APIs handling 10k+ requests/min');
  });

  it('formats education entries', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('**Education:**');
    expect(result).toContain('B.S. Computer Science — MIT (2019)');
  });

  it('formats projects with tech stack', () => {
    const result = formatResumePreview(fullResume);
    expect(result).toContain('**Projects:**');
    expect(result).toContain('OpenDash: Open-source dashboard');
    expect(result).toContain('[React, D3.js, GraphQL]');
  });

  it('uses fallback text for missing name and title', () => {
    const empty: ResumeData = {
      name: '',
      email: '',
      phone: '',
      location: '',
      title: '',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    };
    const result = formatResumePreview(empty);
    expect(result).toContain('**Your Name**');
    expect(result).toContain('Your Title');
  });

  it('omits contact line when all contact fields are empty', () => {
    const noContact: ResumeData = {
      name: 'Test',
      email: '',
      phone: '',
      location: '',
      title: 'Engineer',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    };
    const result = formatResumePreview(noContact);
    expect(result).not.toContain('|');
  });

  it('omits summary section when summary is empty', () => {
    const noSummary: ResumeData = {
      name: 'Test',
      email: '',
      phone: '',
      location: '',
      title: 'Engineer',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    };
    const result = formatResumePreview(noSummary);
    expect(result).not.toContain('*Experienced');
    expect(result).not.toContain('Summary');
  });

  it('omits experience section when no experience', () => {
    const result = formatResumePreview({
      name: 'A',
      email: '',
      phone: '',
      location: '',
      title: 'B',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    });
    expect(result).not.toContain('**Experience:**');
  });

  it('omits education section when no education', () => {
    const result = formatResumePreview({
      name: 'A',
      email: '',
      phone: '',
      location: '',
      title: 'B',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    });
    expect(result).not.toContain('**Education:**');
  });

  it('omits projects section when projects is undefined', () => {
    const noProjects: ResumeData = {
      name: 'A',
      email: '',
      phone: '',
      location: '',
      title: 'B',
      summary: '',
      skills: [],
      experience: [],
      education: [],
    };
    const result = formatResumePreview(noProjects);
    expect(result).not.toContain('**Projects:**');
  });

  it('joins all sections with newlines', () => {
    const result = formatResumePreview(fullResume);
    const lines = result.split('\n');
    expect(lines.length).toBeGreaterThan(10);
    expect(result).toMatch(/^\*\*/);
  });

  it('handles experience with empty bullets gracefully', () => {
    const withEmptyBullets: ResumeData = {
      name: 'Test',
      email: '',
      phone: '',
      location: '',
      title: 'Dev',
      summary: '',
      skills: [],
      experience: [{ company: 'Co', role: 'Dev', duration: '2020', bullets: [] }],
      education: [],
    };
    const result = formatResumePreview(withEmptyBullets);
    expect(result).toContain('Dev @ Co (2020)');
  });
});
