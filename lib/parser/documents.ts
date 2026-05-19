// ============================================
// DOCUMENT PARSERS (DOCX, DOC, TXT)
// ============================================

import mammoth from "mammoth";

export interface DocumentResult {
  text: string;
  success: boolean;
  error?: string;
  encoding?: string;
}

// Parse DOCX file
export async function parseDOCX(buffer: Buffer): Promise<DocumentResult> {
  try {
    // Extract raw text from DOCX
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() || "";
    
    if (!text || text.length < 10) {
      // Try getting HTML and extracting text
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const textFromHtml = stripHtml(htmlResult.value || "");
      
      return {
        text: textFromHtml.trim(),
        success: textFromHtml.length > 10,
        error: textFromHtml.length <= 10 ? "Could not extract text from DOCX" : undefined
      };
    }
    
    return {
      text,
      success: true
    };
    
  } catch (error: any) {
    console.error("DOCX parsing error:", error.message);
    return {
      text: "",
      success: false,
      error: `Failed to parse DOCX: ${error.message}`
    };
  }
}

// Parse legacy DOC file (try multiple approaches)
export async function parseDOC(buffer: Buffer): Promise<DocumentResult> {
  // Try with mammoth first (may work for some .doc files)
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value?.trim()) {
      return { text: result.value.trim(), success: true };
    }
  } catch {}
  
  // Try extracting as binary text
  try {
    const text = extractBinaryText(buffer);
    if (text && text.length > 50) {
      return { text: cleanBinaryText(text), success: true };
    }
  } catch {}
  
  return {
    text: "",
    success: false,
    error: "Could not parse this DOC file. Try converting to DOCX or PDF."
  };
}

// Parse plain text file with encoding detection
export async function parseTXT(buffer: Buffer): Promise<DocumentResult> {
  // Simple UTF-8 decoding (most common)
  try {
    const text = cleanText(buffer.toString('utf-8'));
    
    // Check if text looks valid
    const hasValidChars = /[a-zA-Z]{20,}/.test(text);
    const hasControlChars = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length / (text.length || 1) > 0.1;
    
    if (hasValidChars && !hasControlChars) {
      return {
        text,
        success: true,
        encoding: 'utf-8'
      };
    }
    
    // Try removing BOM if present
    const textNoBOM = text.replace(/^\uFEFF/, '');
    if (/[a-zA-Z]{20,}/.test(textNoBOM)) {
      return {
        text: cleanText(textNoBOM),
        success: true,
        encoding: 'utf-8-bom'
      };
    }
    
    return {
      text,
      success: true,
      encoding: 'utf-8'
    };
  } catch (error: any) {
    return {
      text: "",
      success: false,
      error: "Could not decode text file"
    };
  }
}

// Try to extract text from binary DOC file
function extractBinaryText(buffer: Buffer): string {
  // Simple approach - look for readable text sequences
  let text = "";
  let current = "";
  
  for (let i = 0; i < buffer.length - 1; i++) {
    const byte = buffer[i];
    
    // Check for printable ASCII or valid UTF-8 sequence
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else if (byte >= 0xC0) {
      // Start of multi-byte sequence, try to decode
      const next = buffer[i + 1];
      if (next >= 0x80) {
        current += String.fromCharCode(byte, next);
        i++;
      }
    } else if (byte === 10 || byte === 13) {
      // Newline
      if (current.length > 3) text += current + "\n";
      current = "";
    } else {
      if (current.length > 3) text += current + " ";
      current = "";
    }
  }
  
  return text;
}

// Clean binary extracted text
function cleanBinaryText(text: string): string {
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Keep printable ASCII
    .replace(/\s+/g, ' ')
    .replace(/[ \t]*[\r\n][ \t]*/g, '\n')
    .split('\n')
    .filter(line => line.length > 3 && /[a-zA-Z]{3,}/.test(line))
    .join('\n')
    .trim();
}

// Strip HTML to plain text
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean plain text
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// Detect if text is mostly garbage (from binary parsing)
export function isGarbageText(text: string): boolean {
  if (!text || text.length < 100) return true;
  
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 3) return true;
  
  // Check for proper words
  const wordCount = (text.match(/[a-zA-Z]{3,}/g) || []).length;
  const totalWords = text.split(/\s+/).length;
  
  if (wordCount / totalWords < 0.3) return true;
  
  return false;
}