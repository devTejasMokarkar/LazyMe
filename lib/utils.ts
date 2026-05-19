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
