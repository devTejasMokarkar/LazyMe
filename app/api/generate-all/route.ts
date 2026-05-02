import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { buildResumePrompt, buildCoverLetterPrompt } from "@/utils/promptBuilder";

// Basic keyword extractor
function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const stopWords = new Set(["the","and","a","to","of","in","i","is","that","it","on","you","this","for","but","with","are","have","be","at","or","as","was","so","if","out","not"]);
  return Array.from(new Set(words.filter(w => w.length > 2 && !stopWords.has(w))));
}

function calculateATS(resume: any, jd: string) {
  const resumeText = JSON.stringify(resume);
  const jdWords = extractKeywords(jd);
  const resumeWords = extractKeywords(resumeText);
  
  if (jdWords.length === 0) return { score: 100, matched: [], missing: [] };
  
  const matched = jdWords.filter(w => resumeWords.includes(w));
  const missing = jdWords.filter(w => !resumeWords.includes(w));
  
  const score = Math.round((matched.length / jdWords.length) * 100);
  
  return { score, matched, missing };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, jobDescription, companyName, includeCoverLetter, includeATS } = body;

    // 1. Generate Resume
    const resumePrompt = buildResumePrompt(data, jobDescription);
    const resumeResponse = await generateText(resumePrompt);
    
    const jsonMatch = resumeResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : resumeResponse;
    const resume = JSON.parse(jsonStr);

    let coverLetter = null;
    let ats = null;

    // 2. Generate Cover Letter if requested
    if (includeCoverLetter && jobDescription) {
      const coverPrompt = buildCoverLetterPrompt(resume, jobDescription, companyName || "the company");
      coverLetter = await generateText(coverPrompt);
    }

    // 3. Calculate ATS if requested
    if (includeATS && jobDescription) {
      ats = calculateATS(resume, jobDescription);
    }

    return NextResponse.json({
      resume,
      coverLetter,
      ats
    });
  } catch (error: any) {
    console.error("Generate all error:", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
