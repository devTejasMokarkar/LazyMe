import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { generateText, generateTextFromMultiModal } from "@/utils/gemini";

// Supported MIME types
const SUPPORTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/x-tex",
] as const;

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function parsePDF(buffer: Buffer): Promise<{ text: string; isScanned: boolean }> {
  const data = await pdf(buffer);
  const text = data.text.trim();
  
  // If text is very short, it's likely a scanned PDF or image-based
  const isScanned = text.length < 100;
  
  return { text, isScanned };
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

async function parseTXT(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8").trim();
}

async function parseTEX(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8").trim();
}

const EXTRACTION_PROMPT = `Extract resume information from the following text and return ONLY valid JSON. No explanation.

Return JSON with this exact shape:
{
  "name": "",
  "email": "",
  "phone": "",
  "title": "",
  "summary": "",
  "skills": [""],
  "experience": [{"company":"","role":"","duration":"","bullets":[""]}],
  "education": [{"school":"","degree":"","year":""}]
}

Rules:
- Infer missing fields from context
- Keep bullets concise (1 sentence each)
- Skills should be technical/professional items
- If a field cannot be found, use empty string or empty array`;

async function processTextWithAI(text: string) {
  const prompt = `${EXTRACTION_PROMPT}\n\nText:\n${text}`;
  const aiResponse = await generateText(prompt);
  return parseAIResponse(aiResponse);
}

async function processDocumentWithAI(buffer: Buffer, mimeType: string) {
  const aiResponse = await generateTextFromMultiModal(EXTRACTION_PROMPT, buffer, mimeType);
  return parseAIResponse(aiResponse);
}

function parseAIResponse(aiResponse: string) {
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
  const extractedData = JSON.parse(jsonStr);
  return NextResponse.json(extractedData);
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ 
        error: "Invalid content type. Expected multipart/form-data." 
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    // Validation: File exists
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validation: File size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 5MB." 
      }, { status: 400 });
    }

    // Validation: File size > 0
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Validation: Supported MIME type
    if (!SUPPORTED_TYPES.includes(file.type as any)) {
      return NextResponse.json({ 
        error: "We couldn't read your resume.\n\n✔ Please upload:\n• PDF, DOCX, TXT, or TEX files\n• OR paste your resume manually",
        details: `Unsupported file type: ${file.type}`
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let text: string;
    
    try {
      if (file.type === "application/pdf") {
        try {
          const { text: extractedText, isScanned } = await parsePDF(buffer);
          if (isScanned) {
            return await processDocumentWithAI(buffer, file.type);
          }
          text = extractedText;
        } catch (pdfError: any) {
          return await processDocumentWithAI(buffer, file.type);
        }
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        text = await parseDOCX(buffer);
      } else if (file.type === "text/plain") {
        text = await parseTXT(buffer);
      } else if (file.type === "text/x-tex") {
        text = await parseTEX(buffer);
      } else {
        return NextResponse.json({ 
          error: "Unsupported file type" 
        }, { status: 400 });
      }
    } catch (parseError: any) {
      return NextResponse.json({ 
        error: "We couldn't read your resume.\n\n✔ Please upload:\n• PDF, DOCX, TXT, or TEX files\n• OR paste your resume manually",
        details: parseError.message
      }, { status: 400 });
    }
    
    // Validation: Text not empty
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: "File appears to be empty or unreadable. Please try a different file." 
      }, { status: 400 });
    }
    
    return await processTextWithAI(text);
    
  } catch (error: any) {
    // Handle specific Gemini service errors (Quota, etc.)
    if (error.name === "GeminiServiceError") {
      return NextResponse.json(
        { 
          error: error.message,
          quota: error.quota,
          details: error.quota ? `Type: ${error.quota.type}, Retry: ${error.quota.retryAfterSeconds}s` : undefined
        },
        { status: error.status || 500 }
      );
    }
    
    // Fallback for other errors
    return NextResponse.json(
      { error: "Failed to parse resume. Please try manual entry or wait a moment." },
      { status: 500 }
    );
  }
}
