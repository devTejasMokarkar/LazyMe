// ============================================
// PDF PARSER
// ============================================

import pdf from "pdf-parse";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface ParseResult {
  text: string;
  pages: number;
  isScanned: boolean;
  error?: string;
}

// Parse text-based PDF
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdf(buffer);
    const text = data.text?.trim() || "";
    const pageCount = data.numpages || 1;
    
    return {
      text,
      pages: pageCount,
      isScanned: isImageBased(text)
    };
  } catch (error: any) {
    return {
      text: "",
      pages: 0,
      isScanned: true,
      error: "Failed to parse PDF"
    };
  }
}

// Check if PDF is scanned/image-based
function isImageBased(text: string): boolean {
  if (!text || text.length < 100) return true;
  
  const words = text.split(/\s+/).filter(w => w.length > 2).length;
  if (words < 10) return true;
  
  // Check for garbled/OCR text indicators
  const specialChars = (text.match(/[^\x00-\x7F]/g) || []).length;
  if (specialChars / text.length > 0.4) return true;
  
  return false;
}

// Convert PDF to images using pdftoppm (system tool)
export function pdfToImage(buffer: Buffer, page: number = 1): Buffer | null {
  const tmpPdf = join(tmpdir(), `resume_${Date.now()}.pdf`);
  const tmpOut = join(tmpdir(), `resume_${Date.now()}`);
  
  try {
    writeFileSync(tmpPdf, buffer);
    
    // Convert specific page to image
    execSync(`pdftoppm -r 200 -png -f ${page} -l ${page} "${tmpPdf}" "${tmpOut}"`, { timeout: 30000 });
    
    const imgPath = `${tmpOut}-${page}.png`;
    if (existsSync(imgPath)) {
      const imgBuffer = readFileSync(imgPath);
      unlinkSync(imgPath);
      return imgBuffer;
    }
    
    return null;
  } catch (error: any) {
    console.warn("PDF to image conversion failed:", error.message);
    return null;
  } finally {
    // Cleanup
    if (existsSync(tmpPdf)) unlinkSync(tmpPdf);
    const pngFiles = [1, 2, 3, 4, 5].map(p => `${tmpOut}-${p}.png`);
    for (const f of pngFiles) {
      if (existsSync(f)) unlinkSync(f);
    }
  }
}

// Get PDF metadata without full parsing
export async function getPDFMetadata(buffer: Buffer): Promise<{ pages: number; hasText: boolean }> {
  try {
    const data = await pdf(buffer, { max: 1 }); // Only get first page to check
    return {
      pages: data.numpages || 1,
      hasText: (data.text?.length || 0) > 50
    };
  } catch {
    return { pages: 1, hasText: false };
  }
}

// Extract all pages as separate chunks
export async function extractPDFChunks(buffer: Buffer, chunkSize: number = 3): Promise<string[]> {
  const chunks: string[] = [];
  
  try {
    const data = await pdf(buffer);
    const fullText = data.text || "";
    const pages = data.numpages || 1;
    
    // Simple chunking by pages
    const pageSize = Math.ceil(pages / chunkSize);
    
    for (let i = 0; i < pages; i += pageSize) {
      const startPage = i;
      const endPage = Math.min(i + pageSize, pages);
      
      // Extract text for this chunk of pages (simplified approach)
      const chunk = extractPageRange(fullText, startPage, endPage, pages);
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }
    
    // If no chunks, add full text
    if (chunks.length === 0 && fullText.trim()) {
      chunks.push(fullText);
    }
    
  } catch (error) {
    console.error("PDF chunking error:", error);
    chunks.push(buffer.toString('utf-8'));
  }
  
  return chunks;
}

// Helper to simulate page range extraction
function extractPageRange(fullText: string, startPage: number, endPage: number, totalPages: number): string {
  // Since pdf-parse doesn't give page boundaries, we approximate
  const lines = fullText.split('\n');
  const avgLinesPerPage = Math.ceil(lines.length / totalPages);
  
  const startIdx = (startPage - 1) * avgLinesPerPage;
  const endIdx = endPage * avgLinesPerPage;
  
  return lines.slice(startIdx, endIdx).join('\n');
}