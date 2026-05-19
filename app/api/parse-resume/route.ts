import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { 
  validateFileBuffer, 
  parseDocument, 
  DocumentType,
  parseResumeLocally,
  chunkText 
} from "@/lib/parser";
import { parserLogger, createLogEntry } from "@/lib/parser/logger";

const SUPPORTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 5MB." }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.includes(file.type as any)) {
      return NextResponse.json({ error: "Unsupported file type. PDF, DOCX, or TXT only." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const startTime = Date.now();
    
    // Use the unified parser library
    const result = await parseDocument(file.name, file.type, buffer);
    
    if (!result.success) {
      // Log failed parse
      parserLogger.log(createLogEntry(
        file.name,
        file.type,
        result.parseMethod || 'unknown',
        startTime,
        null,
        result.error
      ));
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // Use the local parser data (no AI needed)
    const extractedData = result.data;
    
    // Add parse method info
    extractedData._parseMethod = result.parseMethod;
    if (result.warning) {
      extractedData._aiNote = result.warning;
    }

    // Ensure all required fields exist
    // Flatten skills for UI compatibility
    const allSkills = [
      ...(extractedData?.skills?.technical || []),
      ...(extractedData?.skills?.tools || []),
    ];
    
    const normalizedData = {
      name: extractedData?.name || "",
      email: extractedData?.email || "",
      phone: extractedData?.phone || "",
      location: extractedData?.location || "",
      title: extractedData?.title || "",
      links: extractedData?.links || [],
      summary: extractedData?.summary || "",
      skills: allSkills, // Flat array for UI
      skillsCategories: { // Keep categories for advanced UI
        technical: extractedData?.skills?.technical || [],
        soft: extractedData?.skills?.soft || [],
        tools: extractedData?.skills?.tools || [],
        languages: extractedData?.skills?.languages || [],
      },
      experience: extractedData?.experience || [],
      education: extractedData?.education || [],
      projects: extractedData?.projects || [],
      certifications: extractedData?.certifications || [],
      awards: extractedData?.awards || [],
      interests: extractedData?.interests || [],
      // Metadata from local parser
      metadata: extractedData?.metadata || {},
      warning: extractedData?._aiNote || null,
      parseMethod: extractedData?._parseMethod || 'local-parser',
    };

    // Log successful parse
    parserLogger.log(createLogEntry(
      file.name,
      file.type,
      result.parseMethod || 'local-parser',
      startTime,
      normalizedData
    ));

    // Auto-save to database
    if (session?.user?.id && normalizedData?.name) {
      try {
        await prisma.userResume.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false },
        });

        await prisma.userResume.create({
          data: {
            userId: session.user.id,
            name: `Resume ${new Date().toLocaleDateString()}`,
            content: normalizedData,
            rawText: result.text || JSON.stringify(normalizedData),
            isDefault: true,
            version: 1,
          },
        });
      } catch (dbError) {
        console.error("Auto-save failed:", dbError);
      }
    }
    
    return NextResponse.json(normalizedData);
    
  } catch (error: any) {
    console.error("Parsing error:", error);
    
    return NextResponse.json(
      { error: "Failed to parse resume. Please try again or enter manually." },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve parser stats
export async function GET(req: NextRequest) {
  const stats = parserLogger.getStats();
  const recentLogs = parserLogger.getRecentLogs(5);
  
  return NextResponse.json({
    stats,
    recentLogs
  });
}