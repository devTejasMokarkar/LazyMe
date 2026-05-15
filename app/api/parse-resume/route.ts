import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import { generateText, generateTextFromMultiModal, GeminiServiceError } from "@/utils/gemini";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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
  return JSON.parse(jsonStr);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ 
        error: "Invalid content type. Expected multipart/form-data." 
      }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 5MB." 
      }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.includes(file.type as any)) {
      return NextResponse.json({ 
        error: "Unsupported file type. Please upload PDF, DOCX, TXT, or TEX."
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let text: string = "";
    let extractedData: any;
    
    if (file.type === "application/pdf") {
      try {
        const { text: extractedText, isScanned } = await parsePDF(buffer);
        if (isScanned) {
          extractedData = await processDocumentWithAI(buffer, file.type);
        } else {
          text = extractedText;
        }
      } catch (pdfError) {
        extractedData = await processDocumentWithAI(buffer, file.type);
      }
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      text = await parseDOCX(buffer);
    } else if (file.type === "text/plain") {
      text = await parseTXT(buffer);
    } else if (file.type === "text/x-tex") {
      text = await parseTEX(buffer);
    }

    if (!extractedData) {
      extractedData = await processTextWithAI(text);
    }

    // Auto-save if user is authenticated
    if (session?.user?.id && extractedData) {
      try {
        // Set previous default resumes to false
        await prisma.userResume.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false },
        });

        await prisma.userResume.create({
          data: {
            userId: session.user.id,
            name: `Imported - ${file.name}`,
            content: extractedData,
            rawText: text || JSON.stringify(extractedData),
            isDefault: true,
            version: 1,
          },
        });
      } catch (dbError) {
        console.error("Auto-save failed:", dbError);
      }
    }
    
    return NextResponse.json(extractedData);
    
  } catch (error: any) {
    console.error("Parsing error detail:", error);
    
    if (error instanceof GeminiServiceError || error.name === "GeminiServiceError") {
      return NextResponse.json(
        { error: error.message, quota: error.quota },
        { status: error.status || 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to parse resume. Please try manual entry or check your internet connection." },
      { status: 500 }
    );
  }
}
