// ============================================
// PARSER LIBRARY INDEX
// ============================================

// Validation
export * from './validation';

// PDF Parsing
export * from './pdf';

// OCR (for scanned documents)
export * from './ocr';

// Document parsing (DOCX, TXT)
export * from './documents';

// Text chunking
export * from './chunking';

// Local AI-free parser
export * from './localParser';

// ============================================
// UNIFIED PARSER
// ============================================

import { validateFileBuffer, DocumentType } from './validation';
import { parsePDF, extractPDFChunks } from './pdf';
import { OCRScannedPDF } from './ocr';
import { parseDOCX, parseDOC, parseTXT } from './documents';
import { chunkText } from './chunking';
import { parseResumeLocally } from './localParser';

export interface UnifiedParseResult {
  success: boolean;
  text?: string;
  chunks?: string[];
  data?: any;
  error?: string;
  isScanned?: boolean;
  usedAI?: boolean;
  parseMethod: string;
  warning?: string;
}

// Main unified parser
export async function parseDocument(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<UnifiedParseResult> {
  const fileSize = buffer.length;
  
  // Step 1: Validate file
  const validation = validateFileBuffer(filename, mimeType, fileSize);
  if (!validation.valid) {
    return { success: false, error: validation.error, parseMethod: 'validation' };
  }
  
  const docType = validation.type as DocumentType;
  let text = "";
  let isScanned = false;
  let parseMethod: string = docType;
  
  try {
    // Step 2: Parse based on type
    switch (docType) {
      case 'pdf': {
        const pdfResult = await parsePDF(buffer);
        text = pdfResult.text;
        isScanned = pdfResult.isScanned;
        
        // If scanned, try OCR
        if (isScanned || text.length < 100) {
          console.log("PDF appears scanned, attempting OCR...");
          const ocrResult = await OCRScannedPDF(buffer);
          if (ocrResult.success && ocrResult.text.length > 50) {
            text = ocrResult.text;
            isScanned = true;
            parseMethod = 'pdf+ocr';
          }
        }
        break;
      }
      
      case 'docx': {
        const docxResult = await parseDOCX(buffer);
        if (!docxResult.success) {
          return { success: false, error: docxResult.error, parseMethod: 'docx' };
        }
        text = docxResult.text;
        break;
      }
      
      case 'doc': {
        const docResult = await parseDOC(buffer);
        if (!docResult.success) {
          return { success: false, error: docResult.error, parseMethod: 'doc' };
        }
        text = docResult.text;
        break;
      }
      
      case 'txt': {
        const txtResult = await parseTXT(buffer);
        if (!txtResult.success) {
          return { success: false, error: txtResult.error, parseMethod: 'txt' };
        }
        text = txtResult.text;
        break;
      }
      
      default:
        return { success: false, error: 'Unsupported file type', parseMethod: 'unknown' };
    }
    
    // Step 3: Check if we got useful text
    if (!text || text.length < 20) {
      return { 
        success: false, 
        error: 'Could not extract text from document. The file may be corrupted or empty.', 
        parseMethod 
      };
    }
    
    // Step 4: Create chunks for AI processing (if needed)
    const chunks = chunkText(text, 5);
    
    // Step 5: Parse with local parser
    const localData = parseResumeLocally(text);
    
    return {
      success: true,
      text,
      chunks: chunks.map(c => c.text),
      data: localData,
      isScanned,
      usedAI: false,
      parseMethod,
      warning: isScanned ? 'Document was scanned. OCR quality may vary.' : undefined
    };
    
    return {
      success: true,
      text,
      chunks: chunks.map(c => c.text),
      data: localData,
      isScanned,
      usedAI: false,
      parseMethod,
      warning: isScanned ? 'Document was scanned. OCR quality may vary.' : undefined
    };
    
  } catch (error: any) {
    console.error("Parse error:", error);
    return {
      success: false,
      error: `Failed to parse document: ${error.message}`,
      parseMethod
    };
  }
}

// Export all parser functions for direct use
export {
  validateFileBuffer,
  parsePDF,
  parseDOCX,
  parseDOC,
  parseTXT,
  extractPDFChunks,
  chunkText,
  parseResumeLocally
};