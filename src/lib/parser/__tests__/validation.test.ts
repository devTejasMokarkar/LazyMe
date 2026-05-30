import { describe, it, expect } from 'vitest';
import {
  detectTypeFromExtension,
  detectTypeFromMime,
  validateFileBuffer,
  getExtension,
  isImageBasedFile,
  MAX_FILE_SIZE,
} from '../validation';

describe('detectTypeFromExtension', () => {
  it('detects pdf', () => {
    expect(detectTypeFromExtension('resume.pdf')).toBe('pdf');
  });

  it('detects docx', () => {
    expect(detectTypeFromExtension('resume.docx')).toBe('docx');
  });

  it('detects doc', () => {
    expect(detectTypeFromExtension('resume.doc')).toBe('doc');
  });

  it('detects txt', () => {
    expect(detectTypeFromExtension('notes.txt')).toBe('txt');
    expect(detectTypeFromExtension('data.csv')).toBe('txt');
    expect(detectTypeFromExtension('readme.md')).toBe('txt');
    expect(detectTypeFromExtension('document.text')).toBe('txt');
  });

  it('detects images', () => {
    expect(detectTypeFromExtension('photo.png')).toBe('image');
    expect(detectTypeFromExtension('photo.jpg')).toBe('image');
    expect(detectTypeFromExtension('photo.jpeg')).toBe('image');
    expect(detectTypeFromExtension('photo.webp')).toBe('image');
    expect(detectTypeFromExtension('photo.gif')).toBe('image');
  });

  it('returns unknown for unsupported extensions', () => {
    expect(detectTypeFromExtension('file.exe')).toBe('unknown');
    expect(detectTypeFromExtension('file.zip')).toBe('unknown');
    expect(detectTypeFromExtension('file')).toBe('unknown');
  });

  it('is case insensitive', () => {
    expect(detectTypeFromExtension('resume.PDF')).toBe('pdf');
    expect(detectTypeFromExtension('resume.PNG')).toBe('image');
  });
});

describe('detectTypeFromMime', () => {
  it('detects pdf', () => {
    expect(detectTypeFromMime('application/pdf')).toBe('pdf');
  });

  it('detects docx', () => {
    expect(detectTypeFromMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
  });

  it('detects doc', () => {
    expect(detectTypeFromMime('application/msword')).toBe('doc');
  });

  it('detects text types', () => {
    expect(detectTypeFromMime('text/plain')).toBe('txt');
    expect(detectTypeFromMime('text/csv')).toBe('txt');
    expect(detectTypeFromMime('text/markdown')).toBe('txt');
  });

  it('detects image types', () => {
    expect(detectTypeFromMime('image/png')).toBe('image');
    expect(detectTypeFromMime('image/jpeg')).toBe('image');
    expect(detectTypeFromMime('image/webp')).toBe('image');
    expect(detectTypeFromMime('image/gif')).toBe('image');
  });

  it('returns unknown for unsupported mime types', () => {
    expect(detectTypeFromMime('application/zip')).toBe('unknown');
    expect(detectTypeFromMime('video/mp4')).toBe('unknown');
  });

  it('handles whitespace', () => {
    expect(detectTypeFromMime('  application/pdf  ')).toBe('pdf');
  });
});

describe('validateFileBuffer', () => {
  it('validates a proper PDF file', () => {
    const result = validateFileBuffer('resume.pdf', 'application/pdf', 1000);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('pdf');
  });

  it('rejects file that is too large', () => {
    const result = validateFileBuffer('resume.pdf', 'application/pdf', MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('rejects empty file', () => {
    const result = validateFileBuffer('resume.pdf', 'application/pdf', 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects unsupported file type', () => {
    const result = validateFileBuffer('file.exe', 'application/x-msdownload', 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported');
  });

  it('falls back to extension when MIME is unknown', () => {
    const result = validateFileBuffer('resume.pdf', 'application/octet-stream', 1000);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('pdf');
  });

  it('returns unknown type when both MIME and extension are unknown', () => {
    const result = validateFileBuffer('file.xyz', 'application/octet-stream', 1000);
    expect(result.valid).toBe(false);
  });
});

describe('getExtension', () => {
  it('returns lowercase extension', () => {
    expect(getExtension('Resume.PDF')).toBe('.pdf');
    expect(getExtension('Resume.DOCX')).toBe('.docx');
  });

  it('handles files without extension', () => {
    const ext = getExtension('Makefile');
    expect(typeof ext).toBe('string');
  });
});

describe('isImageBasedFile', () => {
  it('returns true for very short text', () => {
    expect(isImageBasedFile('short', 5)).toBe(true);
  });

  it('returns true when text length < 100', () => {
    expect(isImageBasedFile('Hello world', 99)).toBe(true);
  });

  it('returns false for normal text', () => {
    const text = 'This is a normal resume with plenty of content to parse. '.repeat(5);
    expect(isImageBasedFile(text, text.length)).toBe(false);
  });

  it('returns true for garbled text with non-ASCII characters', () => {
    const garbled = '\x00\x01\x02\x03'.repeat(50) + 'normal text here';
    expect(isImageBasedFile(garbled, garbled.length)).toBe(true);
  });

  it('returns true for very low word ratio', () => {
    const text = 'a b c d ' + 'x'.repeat(500);
    expect(isImageBasedFile(text, text.length)).toBe(true);
  });
});
