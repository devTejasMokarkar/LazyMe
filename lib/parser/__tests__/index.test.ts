import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
    convertToHtml: vi.fn(),
  },
}));

describe('parseDocument', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('fails validation for unsupported file type', async () => {
    const { parseDocument } = await import('../index');
    const result = await parseDocument('file.exe', 'application/x-msdownload', Buffer.from('test'));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported');
    expect(result.parseMethod).toBe('validation');
  });

  it('fails validation for empty file', async () => {
    const { parseDocument } = await import('../index');
    const result = await parseDocument('resume.pdf', 'application/pdf', Buffer.alloc(0));
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('fails validation for oversized file', async () => {
    const { parseDocument, MAX_FILE_SIZE } = await import('../index');
    // Need to import MAX_FILE_SIZE - it's re-exported from validation
    // Actually it's not re-exported, let me get it differently
    const { MAX_FILE_SIZE: maxSize } = await import('../validation');
    const bigBuffer = Buffer.alloc(maxSize + 1);
    const result = await parseDocument('resume.pdf', 'application/pdf', bigBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('handles image type by returning error', async () => {
    const { parseDocument } = await import('../index');
    const result = await parseDocument('photo.png', 'image/png', Buffer.from('fake-image'));
    expect(result.success).toBe(false);
    expect(result.parseMethod).toBe('image');
  });

  it('handles txt files', async () => {
    const { parseDocument } = await import('../index');
    const textContent = 'John Doe\njohn@email.com\nSoftware Engineer';
    const result = await parseDocument('resume.txt', 'text/plain', Buffer.from(textContent));
    expect(result.success).toBe(true);
    expect(result.text).toContain('John Doe');
    expect(result.parseMethod).toBe('txt');
    expect(result.data).toBeDefined();
    expect(result.data.name).toBeTruthy();
  });

  it('handles txt files with chunks', async () => {
    const { parseDocument } = await import('../index');
    const textContent = 'John Doe\njohn@email.com\nSoftware Engineer';
    const result = await parseDocument('resume.txt', 'text/plain', Buffer.from(textContent));
    expect(result.chunks).toBeDefined();
    expect(result.chunks!.length).toBeGreaterThan(0);
  });

  it('parses valid txt and extracts local data', async () => {
    const { parseDocument } = await import('../index');
    const textContent = `John Smith
john.smith@email.com
Senior Developer
Skills: React, Node.js, TypeScript

Experience:
Acme Corp - Developer - 2020-2023
• Built applications`;

    const result = await parseDocument('resume.txt', 'text/plain', Buffer.from(textContent));
    expect(result.success).toBe(true);
    expect(result.data.name.toLowerCase()).toContain('john');
    expect(result.data.email).toBe('john.smith@email.com');
    expect(result.data.skills.technical.length).toBeGreaterThan(0);
  });
});
