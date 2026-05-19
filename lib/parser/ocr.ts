// ============================================
// OCR PARSER FOR SCANNED DOCUMENTS
// ============================================

import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface OCRResult {
  text: string;
  confidence: number;
  success: boolean;
  error?: string;
}

// Perform OCR on image buffer using Tesseract
export async function performOCR(imageBuffer: Buffer, language: string = "eng"): Promise<OCRResult> {
  const tmpImg = join(tmpdir(), `ocr_${Date.now()}.png`);
  
  try {
    writeFileSync(tmpImg, imageBuffer);
    
    // Run Tesseract OCR
    const output = execSync(
      `tesseract "${tmpImg}" stdout -l ${language} --psm 6 2>/dev/null`,
      { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    );
    
    const text = output.toString().trim();
    
    // Clean up OCR text
    const cleaned = cleanOCRText(text);
    
    return {
      text: cleaned,
      confidence: estimateConfidence(text),
      success: cleaned.length > 50
    };
    
  } catch (error: any) {
    console.error("OCR error:", error.message);
    return {
      text: "",
      confidence: 0,
      success: false,
      error: "OCR processing failed"
    };
  } finally {
    if (existsSync(tmpImg)) unlinkSync(tmpImg);
  }
}

// OCR multiple pages and combine results
export async function performMultiPageOCR(imageBuffers: Buffer[]): Promise<string> {
  const results: string[] = [];
  
  for (let i = 0; i < imageBuffers.length; i++) {
    const result = await performOCR(imageBuffers[i]);
    if (result.success && result.text) {
      results.push(result.text);
    }
  }
  
  return results.join('\n\n--- Page Break ---\n\n');
}

// Convert PDF pages to images and OCR each
export async function OCRScannedPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  const { pdfToImage } = await import('./pdf');
  
  // Get number of pages (estimate)
  const tmpPdf = join(tmpdir(), `temp_${Date.now()}.pdf`);
  const tmpDir = join(tmpdir(), `temp_${Date.now()}`);
  
  try {
    writeFileSync(tmpPdf, pdfBuffer);
    
    // Get page count
    const pageCount = getPDFPageCount(pdfBuffer) || 1;
    console.log(`Scanning PDF with ${pageCount} pages...`);
    
    const allText: string[] = [];
    
    // OCR each page (limit to first 10 pages to avoid timeout)
    const maxPages = Math.min(pageCount, 10);
    
    for (let page = 1; page <= maxPages; page++) {
      const imgBuffer = pdfToImage(pdfBuffer, page);
      if (imgBuffer) {
        const result = await performOCR(imgBuffer);
        if (result.success && result.text) {
          allText.push(result.text);
          console.log(`OCR completed page ${page}/${maxPages}`);
        }
      }
    }
    
    if (allText.length === 0) {
      return {
        text: "",
        confidence: 0,
        success: false,
        error: "Could not extract text from any page"
      };
    }
    
    return {
      text: allText.join('\n\n'),
      confidence: 0.7,
      success: true
    };
    
  } catch (error: any) {
    return {
      text: "",
      confidence: 0,
      success: false,
      error: error.message
    };
  } finally {
    // Cleanup
    if (existsSync(tmpPdf)) unlinkSync(tmpPdf);
  }
}

// Estimate OCR confidence based on text quality
function estimateConfidence(text: string): number {
  if (!text || text.length < 50) return 0;
  
  // Check for common OCR error indicators
  const lines = text.split('\n');
  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;
  
  // Very short lines might indicate poor OCR
  if (avgLineLength < 5) return 0.3;
  
  // Check for special characters
  const specialChars = (text.match(/[^\x00-\x7F]/g) || []).length;
  const ratio = specialChars / text.length;
  
  // High ratio of special chars might indicate OCR errors
  if (ratio > 0.3) return 0.4;
  
  // Check for word-like patterns
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 10) return 0.3;
  
  return 0.8;
}

// Clean up OCR output
function cleanOCRText(text: string): string {
  // Remove excessive whitespace
  let cleaned = text
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove multiple blank lines
    .replace(/[ \t]+/g, ' ')            // Collapse multiple spaces
    .replace(/[^\S\n]+/g, ' ');         // Remove extra spaces but keep newlines
  
  // Fix common OCR errors
  cleaned = cleaned
    .replace(/\|/g, 'I')                // Pipe to I
    .replace(/0(?=[a-zA-Z])/g, 'O')    // Zero to O (context-dependent)
    .replace(/\bi\b/gi, 'I')            // Single i to I
    .replace(/\b[lL]\b/g, 'I');        // Single l/L to I
  
  // Remove page numbers and headers/footers
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter(line => {
    // Skip very short lines that might be page numbers
    if (line.length < 3 && /^\d+$/.test(line)) return false;
    // Skip lines that are all uppercase and short (likely headers)
    if (line.length < 30 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line)) return false;
    return true;
  });
  
  return filteredLines.join('\n').trim();
}

// Get PDF page count using pdftk or pdfinfo fallback
function getPDFPageCount(buffer: Buffer): number | null {
  const tmpPdf = join(tmpdir(), `count_${Date.now()}.pdf`);
  
  try {
    writeFileSync(tmpPdf, buffer);
    
    // Try pdfinfo first
    try {
      const output = execSync(`pdfinfo "${tmpPdf}" 2>/dev/null`, { timeout: 10000 });
      const match = output.toString().match(/Pages:\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    } catch {}
    
    // Try pdftk
    try {
      const output = execSync(`pdftk "${tmpPdf}" dump_data 2>/dev/null`, { timeout: 10000 });
      const match = output.toString().match(/NumberOfPages:\s*(\d+)/);
      if (match) return parseInt(match[1], 10);
    } catch {}
    
    return null;
  } finally {
    if (existsSync(tmpPdf)) unlinkSync(tmpPdf);
  }
}