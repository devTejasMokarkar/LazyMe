// ============================================
// FILE VALIDATION UTILITIES
// ============================================

export type DocumentType = 'pdf' | 'docx' | 'doc' | 'txt' | 'image' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  type?: DocumentType;
}

// File size limits (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Supported file types with MIME types and extensions
const SUPPORTED_FORMATS: Record<string, { type: DocumentType; mime: string[]; extensions: string[] }> = {
  pdf: {
    type: 'pdf',
    mime: ['application/pdf'],
    extensions: ['.pdf']
  },
  docx: {
    type: 'docx',
    mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.docx']
  },
  doc: {
    type: 'doc',
    mime: ['application/msword'],
    extensions: ['.doc']
  },
  txt: {
    type: 'txt',
    mime: ['text/plain', 'text/csv', 'text/markdown'],
    extensions: ['.txt', '.csv', '.md', '.text']
  },
  image: {
    type: 'image',
    mime: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
    extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif']
  }
};

// Detect file type from extension
export function detectTypeFromExtension(filename: string): DocumentType {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  for (const format of Object.values(SUPPORTED_FORMATS)) {
    if (format.extensions.includes(ext)) {
      return format.type;
    }
  }
  
  return 'unknown';
}

// Detect file type from MIME type
export function detectTypeFromMime(mimeType: string): DocumentType {
  const normalizedMime = mimeType.toLowerCase().trim();
  
  for (const format of Object.values(SUPPORTED_FORMATS)) {
    if (format.mime.includes(normalizedMime)) {
      return format.type;
    }
  }
  
  return 'unknown';
}

// Validate file
export function validateFile(file: File): ValidationResult {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  // Check file size is not zero
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  
  // Detect type from MIME or extension
  let type = detectTypeFromMime(file.type);
  if (type === 'unknown') {
    type = detectTypeFromExtension(file.name);
  }
  
  if (type === 'unknown') {
    return { valid: false, error: 'Unsupported file type. Please upload PDF, DOCX, DOC, or TXT file.' };
  }
  
  return { valid: true, type };
}

// Validate file buffer (for API route)
export function validateFileBuffer(filename: string, mimeType: string, size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  if (size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  
  let type = detectTypeFromMime(mimeType);
  if (type === 'unknown') {
    type = detectTypeFromExtension(filename);
  }
  
  if (type === 'unknown') {
    return { valid: false, error: 'Unsupported file type' };
  }
  
  return { valid: true, type };
}

// Get file extension
export function getExtension(filename: string): string {
  return filename.substring(filename.lastIndexOf('.')).toLowerCase();
}

// Check if file is likely an image-based PDF (scanned)
export function isImageBasedFile(text: string, textLength: number): boolean {
  // If extracted text is very short or has no proper words, likely scanned
  if (textLength < 100) return true;
  
  // Check for very few words relative to length
  const wordCount = text.split(/\s+/).filter(w => w.length > 2).length;
  const ratio = wordCount / textLength;
  
  // If ratio is very low, might be scanned/image
  if (ratio < 0.1) return true;
  
  // Check for garbled characters (common in OCR failures)
  const garbledRatio = (text.match(/[^\x00-\x7F]/g) || []).length / textLength;
  if (garbledRatio > 0.3) return true;
  
  return false;
}