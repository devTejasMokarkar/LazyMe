import { describe, it, expect } from 'vitest';
import { isGarbageText } from '../documents';

describe('isGarbageText', () => {
  it('returns true for empty text', () => {
    expect(isGarbageText('')).toBe(true);
  });

  it('returns true for very short text', () => {
    expect(isGarbageText('short')).toBe(true);
  });

  it('returns true for text with few lines', () => {
    expect(isGarbageText('Just one line here')).toBe(true);
  });

  it('returns true for text with mostly non-letter characters', () => {
    const garbage = 'a1 b2 c3 d4 e5\nf6 g7 h8 i9 j0\nk1 l2 m3 n4 o5\np6 q7 r8 s9 t0';
    expect(isGarbageText(garbage)).toBe(true);
  });

  it('returns false for normal text with proper words', () => {
    const text = `John Doe
Software Engineer
Experience: Built applications with React and Node.js
Education: MIT
Skills: JavaScript, Python`;
    expect(isGarbageText(text)).toBe(false);
  });
});
