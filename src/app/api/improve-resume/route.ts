import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { calculateWeightedATS } from "@/features/ai/ats.service";
import { buildATSOptimizationPrompt } from "@/features/ai/prompts/resume.prompts";
import { logger } from "@/lib/logger";

function normalizeImprovementValue(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (val && typeof val === 'object') return JSON.stringify(val);
  return String(val ?? '');
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json({ error: "Missing resume or job description" }, { status: 400 });
    }

    const prompt = buildATSOptimizationPrompt(resume, jobDescription);
    const response = await generateText(prompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;

    const analysis = JSON.parse(jsonStr);

    const autoImprovements = analysis?.autoImprovements;
    if (!Array.isArray(autoImprovements)) {
      logger.warn("No autoImprovements array in AI response");
    }

    let improvedResume = { ...resume };

    if (Array.isArray(autoImprovements)) {
      for (const improvement of autoImprovements) {
        if (!improvement || typeof improvement !== 'object') continue;

        const section = String(improvement.section || '').toLowerCase();
        const before = normalizeImprovementValue(improvement.before);
        const after = normalizeImprovementValue(improvement.after);

        if (section === "experience" && Array.isArray(improvedResume.experience)) {
          improvedResume.experience = improvedResume.experience.map((exp: any) => {
            if (!Array.isArray(exp.bullets)) return exp;
            const bulletIndex = exp.bullets.findIndex((b: string) =>
              b.trim() === before.trim() || b.includes(before.trim())
            );
            if (bulletIndex === -1) return exp;
            const newBullets = [...exp.bullets];
            const afterBullets = after.split('\n').map((s: string) => s.trim()).filter(Boolean);
            newBullets[bulletIndex] = afterBullets[0] || after;
            if (afterBullets.length > 1) {
              newBullets.splice(bulletIndex + 1, 0, ...afterBullets.slice(1));
            }
            return { ...exp, bullets: newBullets };
          });
        } else if (section === "summary") {
          const summaryStr = typeof improvedResume.summary === 'string' ? improvedResume.summary : '';
          if (summaryStr.trim() === before.trim() || summaryStr.includes(before.trim())) {
            improvedResume.summary = after;
          }
        } else if (section === "skills" && Array.isArray(improvedResume.skills)) {
          const newSkills = after.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
          improvedResume.skills = Array.from(new Set([...improvedResume.skills, ...newSkills]));
        }
      }
    }

    const oldATS = calculateWeightedATS(resume, jobDescription);
    const newATS = calculateWeightedATS(improvedResume, jobDescription);

    return NextResponse.json({
      improvedResume,
      analysis,
      oldATS,
      newATS
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error, stack: error?.stack }, "improve-resume failed");
    return NextResponse.json({ error: "Failed to improve resume" }, { status: 500 });
  }
}
