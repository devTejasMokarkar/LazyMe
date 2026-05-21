import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Known placeholder names that AI models hallucinate when they can't read a document
const PLACEHOLDER_NAMES = [
  'john doe', 'jane doe', 'your name', 'full name', 'candidate name',
  'first last', 'name here', 'sample name', 'test user', 'example user',
];

/**
 * Validates that parsed resume data contains real content and is not
 * AI-hallucinated placeholder data. Returns an error message if invalid,
 * or null if the data looks genuine.
 */
export function validateParsedResume(data: any): string | null {
  if (!data || typeof data !== 'object') {
    return 'Parsing failed: no data returned from AI.';
  }

  // Must have a name that isn't a known placeholder
  const name = (data.name || '').trim().toLowerCase();
  if (!name || name.length < 2) {
    return 'Could not extract your name from the resume. Please check the file and try again.';
  }
  if (PLACEHOLDER_NAMES.some(p => name.includes(p))) {
    return 'AI could not read your resume and returned placeholder data. Please try a different file format (DOCX or plain text PDF).';
  }

  // Must have at least one of: email, phone, experience, or skills
  const hasEmail = !!(data.email || '').trim();
  const hasPhone = !!(data.phone || '').trim();
  const hasExperience = Array.isArray(data.experience) && data.experience.length > 0;
  const hasSkills = Array.isArray(data.skills) && data.skills.length > 0;

  if (!hasEmail && !hasPhone && !hasExperience && !hasSkills) {
    return 'Resume parsing returned empty data. The file may be corrupted or unreadable. Please try a different format.';
  }

  return null; // valid
}

/**
 * Calculates the completeness percentage of parsed resume data.
 * Returns a score from 0-100 based on how many key fields were extracted.
 */
export function calculateResumeCompleteness(data: any): number {
  if (!data || typeof data !== 'object') return 0;

  let score = 0;
  const maxScore = 100;

  // Name (15 points)
  const name = (data.name || '').trim();
  if (name.length > 2 && !PLACEHOLDER_NAMES.some(p => name.toLowerCase().includes(p))) {
    score += 15;
  }

  // Email (10 points)
  if ((data.email || '').trim()) score += 10;

  // Phone (10 points)
  if ((data.phone || '').trim()) score += 10;

  // Location (5 points)
  if ((data.location || '').trim()) score += 5;

  // Title/Role (10 points)
  if ((data.title || '').trim()) score += 10;

  // Summary (10 points)
  if ((data.summary || '').trim().length > 20) score += 10;

  // Experience (25 points - scaled by number of entries)
  const expCount = Array.isArray(data.experience) ? data.experience.length : 0;
  if (expCount > 0) {
    score += Math.min(25, expCount * 8);
  }

  // Skills (15 points - scaled by number of skills)
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const skillCount = skills.length;
  if (skillCount > 0) {
    score += Math.min(15, skillCount * 3);
  }

  return Math.min(maxScore, score);
}
