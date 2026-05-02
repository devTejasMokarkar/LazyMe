import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/utils/gemini";
import { calculateATS, calculateWeightedATS } from "@/utils/ats";
import { buildATSOptimizationPrompt, ATSAnalysisResult } from "@/utils/promptBuilder";

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    // Use the new MASTER PROMPT for ATS optimization
    const prompt = buildATSOptimizationPrompt(resume, jobDescription);
    const response = await generateText(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    const analysis: ATSAnalysisResult = JSON.parse(jsonStr);

    // Apply auto-improvements to the resume
    let improvedResume = { ...resume };
    analysis.autoImprovements.forEach(improvement => {
      if (improvement.section === "experience" && improvedResume.experience) {
        // Find and replace the matching experience bullet
        improvedResume.experience = improvedResume.experience.map((exp: any) => {
          if (exp.bullets && exp.bullets.includes(improvement.before)) {
            return {
              ...exp,
              bullets: exp.bullets.map((bullet: string) => 
                bullet === improvement.before ? improvement.after : bullet
              )
            };
          }
          return exp;
        });
      } else if (improvement.section === "summary" && improvement.before === resume.summary) {
        improvedResume.summary = improvement.after;
      } else if (improvement.section === "skills" && improvedResume.skills) {
        // Add missing skills
        const newSkills = improvement.after.split(", ").map(s => s.trim());
        improvedResume.skills = Array.from(new Set([...improvedResume.skills, ...newSkills]));
      }
    });

    // Calculate both old and new ATS scores using weighted logic
    const oldATS = calculateWeightedATS(resume, jobDescription);
    const newATS = calculateWeightedATS(improvedResume, jobDescription);

    return NextResponse.json({
      improvedResume,
      analysis,
      oldATS,
      newATS
    });
  } catch (error: any) {
    console.error("Improve resume error:", error);
    return NextResponse.json({ error: "Failed to improve resume" }, { status: 500 });
  }
}
