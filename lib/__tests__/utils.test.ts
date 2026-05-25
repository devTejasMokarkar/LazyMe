import { describe, it, expect } from 'vitest';
import { validateParsedResume, calculateResumeCompleteness } from '../utils';

describe('validateParsedResume', () => {
  it('returns error for null input', () => {
    expect(validateParsedResume(null)).toBe('Parsing failed: no data returned from AI.');
  });

  it('returns error for undefined input', () => {
    expect(validateParsedResume(undefined)).toBe('Parsing failed: no data returned from AI.');
  });

  it('returns error for non-object input', () => {
    expect(validateParsedResume('string')).toBe('Parsing failed: no data returned from AI.');
  });

  it('returns error for empty name', () => {
    expect(validateParsedResume({ name: '' })).toBe('Could not extract your name from the resume. Please check the file and try again.');
  });

  it('returns error for short name', () => {
    expect(validateParsedResume({ name: 'A' })).toBe('Could not extract your name from the resume. Please check the file and try again.');
  });

  it('returns error for placeholder name "john doe"', () => {
    expect(validateParsedResume({ name: 'John Doe' })).toBe('AI could not read your resume and returned placeholder data. Please try a different file format (DOCX or plain text PDF).');
  });

  it('returns error for placeholder name "jane doe"', () => {
    expect(validateParsedResume({ name: 'Jane Doe' })).toBe('AI could not read your resume and returned placeholder data. Please try a different file format (DOCX or plain text PDF).');
  });

  it('returns error for placeholder name "test user"', () => {
    expect(validateParsedResume({ name: 'Test User' })).toBe('AI could not read your resume and returned placeholder data. Please try a different file format (DOCX or plain text PDF).');
  });

  it('returns error when no contact info, experience, or skills', () => {
    expect(validateParsedResume({ name: 'Real Person', email: '', phone: '' })).toBe('Resume parsing returned empty data. The file may be corrupted or unreadable. Please try a different format.');
  });

  it('passes with valid name and email', () => {
    expect(validateParsedResume({ name: 'John Smith', email: 'john@example.com' })).toBeNull();
  });

  it('passes with valid name and phone', () => {
    expect(validateParsedResume({ name: 'Jane Smith', phone: '123-456-7890' })).toBeNull();
  });

  it('passes with valid name and experience array', () => {
    expect(validateParsedResume({ name: 'Dev Person', experience: [{ company: 'Acme' }] })).toBeNull();
  });

  it('passes with valid name and skills array', () => {
    expect(validateParsedResume({ name: 'Skill Person', skills: ['JavaScript', 'React'] })).toBeNull();
  });

  it('handles case-insensitive placeholder detection', () => {
    expect(validateParsedResume({ name: 'JOHN DOE' })).toBe('AI could not read your resume and returned placeholder data. Please try a different file format (DOCX or plain text PDF).');
  });

  it('handles name with surrounding whitespace', () => {
    expect(validateParsedResume({ name: '  John Smith  ', email: 'john@example.com' })).toBeNull();
  });
});

describe('calculateResumeCompleteness', () => {
  it('returns 0 for null input', () => {
    expect(calculateResumeCompleteness(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(calculateResumeCompleteness(undefined)).toBe(0);
  });

  it('returns 0 for non-object input', () => {
    expect(calculateResumeCompleteness('string')).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(calculateResumeCompleteness({})).toBe(0);
  });

  it('scores 15 for a valid name', () => {
    expect(calculateResumeCompleteness({ name: 'John Smith' })).toBe(15);
  });

  it('gives 0 for placeholder name', () => {
    expect(calculateResumeCompleteness({ name: 'John Doe' })).toBe(0);
  });

  it('scores name + email + phone (35)', () => {
    const score = calculateResumeCompleteness({
      name: 'John Smith',
      email: 'john@example.com',
      phone: '123-456-7890',
    });
    expect(score).toBe(35);
  });

  it('scores with location and title as well (50)', () => {
    const score = calculateResumeCompleteness({
      name: 'John Smith',
      email: 'john@example.com',
      phone: '123-456-7890',
      location: 'New York',
      title: 'Software Engineer',
    });
    expect(score).toBe(50);
  });

  it('scores summary only when > 20 chars', () => {
    const short = calculateResumeCompleteness({ name: 'John Smith', summary: 'Short' });
    expect(short).toBe(15);

    const long = calculateResumeCompleteness({ name: 'John Smith', summary: 'Experienced developer with 5+ years in web dev.' });
    expect(long).toBe(25);
  });

  it('scores experience scaling by entries', () => {
    const singleExp = calculateResumeCompleteness({
      name: 'John Smith',
      experience: [{ company: 'Acme' }],
    });
    expect(singleExp).toBe(15 + 8);

    const fourExp = calculateResumeCompleteness({
      name: 'John Smith',
      experience: [{}, {}, {}, {}],
    });
    expect(fourExp).toBe(15 + 25);
  });

  it('scores skills scaling by entries (capped at 15)', () => {
    const oneSkill = calculateResumeCompleteness({
      name: 'John Smith',
      skills: ['JS'],
    });
    expect(oneSkill).toBe(15 + 3);

    const manySkills = calculateResumeCompleteness({
      name: 'John Smith',
      skills: ['JS', 'React', 'Node', 'Python', 'AWS'],
    });
    expect(manySkills).toBe(15 + 15);
  });

  it('caps total at 100', () => {
    const full = calculateResumeCompleteness({
      name: 'John Smith',
      email: 'john@example.com',
      phone: '123-456-7890',
      location: 'NYC',
      title: 'Engineer',
      summary: 'A'.repeat(21),
      experience: [{}, {}, {}, {}, {}],
      skills: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(full).toBe(100);
  });

  it('returns 0 for placeholder names even with other fields', () => {
    const score = calculateResumeCompleteness({
      name: 'Your Name',
      email: 'test@test.com',
    });
    expect(score).toBe(10);
  });
});
