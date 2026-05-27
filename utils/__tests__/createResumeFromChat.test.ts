import { describe, it, expect } from 'vitest';
import { buildResumeFromChatPrompt } from '../promptBuilder';

describe('buildResumeFromChatPrompt', () => {
  it('includes the user message in the prompt', () => {
    const result = buildResumeFromChatPrompt('I am Rahul Sharma, a React developer');
    expect(result).toContain('Rahul Sharma');
    expect(result).toContain('React developer');
  });

  it('contains JSON schema instructions', () => {
    const result = buildResumeFromChatPrompt('John Doe, software engineer');
    expect(result).toContain('"name"');
    expect(result).toContain('"email"');
    expect(result).toContain('"phone"');
    expect(result).toContain('"location"');
    expect(result).toContain('"title"');
    expect(result).toContain('"summary"');
    expect(result).toContain('"skills"');
    expect(result).toContain('"experience"');
    expect(result).toContain('"education"');
    expect(result).toContain('"projects"');
  });

  it('requires valid JSON output', () => {
    const result = buildResumeFromChatPrompt('test user');
    expect(result).toContain('valid JSON');
    expect(result).toContain('no markdown');
  });

  it('instructs to not invent email/phone', () => {
    const result = buildResumeFromChatPrompt('test user');
    expect(result).toContain('Do NOT invent an email or phone');
    expect(result).toContain('empty strings');
  });

  it('includes skill count requirement', () => {
    const result = buildResumeFromChatPrompt('test user');
    expect(result).toContain('8-12');
  });

  it('includes experience bullet requirement', () => {
    const result = buildResumeFromChatPrompt('test user');
    expect(result).toContain('2-3 bullets');
  });

  it('handles multiline user input', () => {
    const multiline = `My name is Jane.
I work at Google.
I know Python and Java.`;
    const result = buildResumeFromChatPrompt(multiline);
    expect(result).toContain('Jane');
    expect(result).toContain('Google');
    expect(result).toContain('Python and Java');
  });

  it('wraps user message in triple-quoted block', () => {
    const result = buildResumeFromChatPrompt('some details');
    expect(result).toContain('"""');
    expect(result).toContain('some details');
  });

  it('returns a non-empty string', () => {
    const result = buildResumeFromChatPrompt('x');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('instructs to generate action-oriented bullets', () => {
    const result = buildResumeFromChatPrompt('experienced PM');
    expect(result).toContain('action-oriented');
    expect(result).toContain('metrics');
  });

  it('instructs to write a compelling summary', () => {
    const result = buildResumeFromChatPrompt('test');
    expect(result).toContain('2-3');
    expect(result).toContain('impactful');
  });

  it('handles special characters in user input safely', () => {
    const result = buildResumeFromChatPrompt('I know C++, C#, and JavaScript (ES6+)');
    expect(result).toContain('C++');
    expect(result).toContain('JavaScript');
  });

  it('requires at least 1 education entry', () => {
    const result = buildResumeFromChatPrompt('test');
    expect(result).toContain('at least 1 entry');
  });

  it('requires every field in output', () => {
    const result = buildResumeFromChatPrompt('test');
    expect(result).toContain('Every field must be present');
  });
});
