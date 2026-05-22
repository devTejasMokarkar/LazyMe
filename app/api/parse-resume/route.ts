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
import { generateTextFromMultiModal } from "@/utils/gemini";

const SUPPORTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const RESUME_PARSE_PROMPT = `Parse this resume and extract all information into a JSON object with this exact structure. Return ONLY valid JSON, no markdown, no explanations:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, State",
  "title": "Professional Title/Role",
  "links": ["linkedin.com/in/...", "github.com/..."],
  "summary": "Professional summary paragraph",
  "skills": {
    "technical": ["Skill1", "Skill2"],
    "soft": ["Communication", "Leadership"],
    "tools": ["Docker", "Git"],
    "languages": ["English", "Spanish"]
  },
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, State",
      "duration": "Jan 2020 - Present",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science in Computer Science",
      "graduationDate": "2020",
      "gpa": "3.8"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Description",
      "techStack": ["React", "Node.js"]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "2023"
    }
  ],
  "awards": ["Award 1", "Award 2"],
  "interests": ["Interest 1", "Interest 2"]
}

Rules:
- Extract ALL details from the resume, do not miss anything
- If a field is not found, use empty string "" or empty array []
- For skills, categorize them properly into technical, soft, tools, and languages
- For experience, extract all bullet points/achievements
- For education, extract institution, degree, and year
- Return ONLY the JSON object, nothing else`;

function calculateCompleteness(data: any): number {
  if (!data || typeof data !== 'object') return 0;

  let score = 0;

  // Name (15 points)
  const name = (data.name || '').trim();
  if (name.length > 2) score += 15;

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

  // Experience (25 points)
  const expCount = Array.isArray(data.experience) ? data.experience.length : 0;
  if (expCount > 0) {
    score += Math.min(25, expCount * 8);
  }

  // Skills (15 points)
  const skills = Array.isArray(data.skills) ? data.skills : 
    [...(data.skills?.technical || []), ...(data.skills?.tools || [])];
  const skillCount = skills.length;
  if (skillCount > 0) {
    score += Math.min(15, skillCount * 3);
  }

  return Math.min(100, score);
}

function normalizeAIData(aiResponse: string): any {
  try {
    // Try to extract JSON from the response
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", error);
    return null;
  }
}

function isGeminiFetchFailure(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("fetch failed") || message.includes("generativelanguage.googleapis.com");
}

export async function POST(req: NextRequest) {
  const fileRef = { name: "file" }; // Track for error messages
  
  try {
    const session = await auth();
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    fileRef.name = file?.name || "unknown";

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
    
    // Step 1: Try local parser first
    const result = await parseDocument(file.name, file.type, buffer);
    
    if (!result.success) {
      // Local parser failed, try AI parsing
      console.log("Local parser failed, trying AI parsing...");
    } else {
      // Step 2: Check if local parser extracted enough data
      const completeness = calculateCompleteness(result.data);
      
      if (completeness >= 70) {
        // Local parser did well enough, use it
        console.log(`Local parser completeness: ${completeness}%, using local results`);
        return buildSuccessResponse(result.data, result.text, result.parseMethod, file, buffer, startTime, session);
      }
      
      console.log(`Local parser completeness: ${completeness}%, trying AI parsing...`);
    }

    // Step 3: Use AI to parse the resume
    try {
      let mimeType = file.type;
      let fileBuffer = buffer;
      
      // For DOCX, we need to convert to text first since Gemini doesn't support DOCX directly
      if (file.type.includes('docx') || file.type.includes('doc')) {
        // Use the local parser to extract text, then send to AI
        if (result.success && result.text) {
          mimeType = 'text/plain';
          fileBuffer = Buffer.from(result.text);
        } else {
          return NextResponse.json({ 
            error: `Cannot read "${file.name}" (this model does not support DOCX input directly). Please save as PDF or TXT and try again.` 
          }, { status: 400 });
        }
      }
      
      const aiResponse = await generateTextFromMultiModal(
        RESUME_PARSE_PROMPT,
        fileBuffer,
        mimeType
      );

      const aiData = normalizeAIData(aiResponse);
      
      if (!aiData) {
        return NextResponse.json({ 
          error: "AI could not parse the resume. The file may be corrupted or image-based." 
        }, { status: 400 });
      }

      // Add metadata
      aiData._parseMethod = 'ai-parser';
      aiData.metadata = {
        parsedWith: 'gemini-ai',
        confidence: 95,
        sectionsFound: Object.keys(aiData).filter(k => !k.startsWith('_'))
      };

      console.log("AI parsing successful");
      return buildSuccessResponse(aiData, result.text || aiResponse, 'ai-parser', file, buffer, startTime, session);

    } catch (aiError: any) {
      console.error("AI parsing failed:", aiError.message);

      if (isGeminiFetchFailure(aiError)) {
        return NextResponse.json(
          { error: "AI resume parsing is temporarily unavailable. Please try again in a moment, or continue with the details you typed." },
          { status: 503 }
        );
      }
      
      // If AI also failed, return error
      if (aiError.message?.includes('does not support') || aiError.message?.includes('pdf input')) {
        return NextResponse.json(
          { error: `Cannot read "${file.name}" (this model does not support PDF input). Please convert to DOCX or TXT and try again.` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to parse resume with AI: ${aiError.message || 'Unknown error'}. Please try a different file format.` },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error("Parsing error:", error);
    
    const errorMessage = error?.message || '';
    
    if (errorMessage.toLowerCase().includes('does not support') || 
        errorMessage.toLowerCase().includes('pdf input')) {
      return NextResponse.json(
        { error: `Cannot read "${fileRef.name}" (this model does not support PDF input). Please convert to DOCX or TXT and try again.` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to parse resume. Please try again or enter manually." },
      { status: 500 }
    );
  }
}

async function buildSuccessResponse(
  extractedData: any, 
  rawText: string | undefined,
  parseMethod: string,
  file: File,
  buffer: Buffer,
  startTime: number,
  session: any
) {
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
    skills: allSkills,
    skillsCategories: {
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
    metadata: extractedData?.metadata || {},
    warning: extractedData?._aiNote || null,
    parseMethod: extractedData?._parseMethod || parseMethod,
  };

  // Log successful parse
  parserLogger.log(createLogEntry(
    file.name,
    file.type,
    parseMethod,
    startTime,
    normalizedData
  ));

  // Auto-save to database
  let savedResumeId: string | null = null;
  if (session?.user?.id) {
    try {
      await prisma.userResume.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });

      const resume = await prisma.userResume.create({
        data: {
          userId: session.user.id,
          name: `Resume ${new Date().toLocaleDateString()}`,
          content: normalizedData,
          rawText: rawText || JSON.stringify(normalizedData),
          isDefault: true,
          version: 1,
        },
      });
      savedResumeId = resume.id;
    } catch (dbError) {
      console.error("Auto-save failed:", dbError);
    }
  }
  
  return NextResponse.json({
    ...normalizedData,
    id: savedResumeId
  });
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
