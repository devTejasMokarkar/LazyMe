import { describe, it, expect } from 'vitest';
import { chunkText, mergeChunks } from '../chunking';

describe('chunkText', () => {
  it('returns single chunk for empty text', () => {
    const chunks = chunkText('');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('');
    expect(chunks[0].index).toBe(0);
  });

  it('returns single chunk for short text', () => {
    const text = 'Short resume text here';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
  });

  it('returns single chunk for text under minChunkSize', () => {
    const text = 'A'.repeat(499);
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
  });

  it('splits by sections when headers are present', () => {
    const longLine = ' and more content to ensure this section is long enough to trigger chunking behavior in the system'.repeat(15);
    const text = `EXPERIENCE
Worked at Google${longLine}

EDUCATION
MIT university degree in computer science${longLine}

SKILLS
JavaScript, React, TypeScript, Node.js${longLine}`;

    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.some(c => c.text.includes('EXPERIENCE'))).toBe(true);
    expect(chunks.some(c => c.text.includes('EDUCATION'))).toBe(true);
    expect(chunks.some(c => c.text.includes('SKILLS'))).toBe(true);
  });

  it('detects section types in metadata', () => {
    const longLine = ' with many more descriptive words to make this substantial enough for chunk processing and section detection'.repeat(12);
    const text = `SUMMARY
A good summary about a professional software engineer who builds great things${longLine}

PROJECTS
Built cool stuff including web applications and mobile apps${longLine}`;

    const chunks = chunkText(text);
    const summaryChunk = chunks.find(c => c.metadata?.sectionType === 'summary');
    const projectsChunk = chunks.find(c => c.metadata?.sectionType === 'projects');

    expect(summaryChunk).toBeDefined();
    expect(projectsChunk).toBeDefined();
  });

  it('limits chunks to maxChunks parameter', () => {
    const text = Array.from({ length: 30 }, (_, i) => `SECTION${i}\nContent block ${i}`).join('\n');
    const chunks = chunkText(text, 5);
    expect(chunks.length).toBeLessThanOrEqual(5);
  });

  it('generates unique chunk IDs', () => {
    const text = `EXPERIENCE\nWork
EDUCATION\nSchool
SKILLS\nJS
PROJECTS\nApp
SUMMARY\nGood`;
    const chunks = chunkText(text);
    const ids = chunks.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sets totalChunks correctly', () => {
    const text = `EXPERIENCE\nWork\nEDUCATION\nSchool`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach(c => {
      expect(c.totalChunks).toBe(chunks.length);
    });
  });

  it('includes word count in metadata', () => {
    const text = 'Hello world this is a test';
    const chunks = chunkText(text);
    expect(chunks[0].metadata?.wordCount).toBe(6);
  });

  it('returns "other" section type for unknown sections', () => {
    const text = 'Just some random text without any section header';
    const chunks = chunkText(text, 1);
    const bigChunk = chunkText('A'.repeat(600) + '\n' + 'B'.repeat(600), 1);
    expect(bigChunk[0].metadata?.sectionType || 'other').toBeDefined();
  });
});

describe('mergeChunks', () => {
  it('merges chunks back together with separators', () => {
    const chunks = [
      { id: '1', text: 'Part one', index: 0, totalChunks: 2 },
      { id: '2', text: 'Part two', index: 1, totalChunks: 2 },
    ];
    const merged = mergeChunks(chunks);
    expect(merged).toContain('Part one');
    expect(merged).toContain('Part two');
    expect(merged).toContain('---');
  });

  it('returns single chunk as-is', () => {
    const chunks = [
      { id: '1', text: 'Only part', index: 0, totalChunks: 1 },
    ];
    expect(mergeChunks(chunks)).toBe('Only part');
  });
});
