import { NextRequest } from "next/server";
import { generateText } from "@/features/ai/ai.service";
import { extractTechnicalSkills, calculateWeightedATS } from "@/features/ai/ats.service";
import {
  buildSkillChunkPrompt,
  buildExperienceChunkPrompt,
  buildEducationChunkPrompt,
  buildGapAnalysisPrompt,
} from "@/features/ai/prompts/resume.prompts";
import { logger } from "@/lib/logger";

function jsonParseSafe(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : text;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeToArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p.map(String); } catch {}
    return [val];
  }
  return [String(val)];
}

function normalizeToString(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (val && typeof val === 'object') {
    if (val.bullets) return Array.isArray(val.bullets) ? val.bullets.join('\n') : String(val.bullets);
    if (val.degree) return `${val.degree} — ${val.institution || val.school || ''}`;
    return JSON.stringify(val);
  }
  return String(val ?? '');
}

function normalizeAutoImprovements(improvements: any[], sectionPrefix: string): any[] {
  if (!Array.isArray(improvements)) return [];
  return improvements.map((imp, i) => ({
    section: sectionPrefix,
    before: normalizeToString(imp.before),
    after: normalizeToString(imp.after),
    impact: typeof imp.impact === 'number' ? imp.impact : (imp.impact ? parseInt(imp.impact, 10) || 5 : 5),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription: jd } = await req.json();
    if (!resume || !jd) {
      return new Response(JSON.stringify({ error: "Missing resume or job description" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const allAutoImprovements: any[] = [];
        const allActionableImprovements: string[] = [];
        const jdKeywords = typeof jd === 'string'
          ? extractTechnicalSkills(jd)
          : [];

        // ── Chunk 1: Skills ──
        sendEvent('status', { chunk: 'skills', message: 'Analyzing skills...' });
        let skillResult: any = {};
        try {
          const skillsPrompt = buildSkillChunkPrompt(
            Array.isArray(resume.skills) ? resume.skills : [],
            jdKeywords,
            jd
          );
          const skillsResponse = await generateText(skillsPrompt);
          skillResult = jsonParseSafe(skillsResponse) || {};
          skillResult.keywordAnalysis = skillResult.keywordAnalysis || { missingSkills: [], weakSkills: [], strongSkills: [] };

          const skillImprovements = normalizeAutoImprovements(
            skillResult.autoImprovements || [],
            'skills'
          );
          allAutoImprovements.push(...skillImprovements);
          const skillActions = normalizeToArray(skillResult.actionableImprovements);
          allActionableImprovements.push(...skillActions);

          sendEvent('skills', {
            keywordAnalysis: skillResult.keywordAnalysis,
            improvements: skillImprovements,
            actionableImprovements: skillActions,
          });
        } catch (err: any) {
          logger.error({ err: err.message }, "Skills chunk failed");
          sendEvent('skills', {
            keywordAnalysis: { missingSkills: jdKeywords, weakSkills: [], strongSkills: [] },
            improvements: [],
            actionableImprovements: ["Could not analyze skills. Try again later."],
          });
        }

        // ── Chunk 2: Experience (one per entry) ──
        const expEntries = Array.isArray(resume.experience) ? resume.experience : [];
        const expResults: any[] = [];
        for (let i = 0; i < expEntries.length; i++) {
          sendEvent('status', { chunk: 'experience', index: i, message: `Reviewing experience: ${expEntries[i].role || `Entry ${i + 1}`}...` });
          try {
            const expPrompt = buildExperienceChunkPrompt(expEntries[i], jd);
            const expResponse = await generateText(expPrompt);
            const expResult = jsonParseSafe(expResponse) || {};
            expResults.push(expResult);

            const expImprovements = normalizeAutoImprovements(
              expResult.autoImprovements || [],
              `experience[${i}]`
            );
            allAutoImprovements.push(...expImprovements);
            const expActions = normalizeToArray(expResult.actionableImprovements);
            allActionableImprovements.push(...expActions);

            sendEvent('experience', {
              index: i,
              role: expEntries[i].role,
              relevanceScore: expResult.relevanceScore ?? null,
              matchedKeywords: normalizeToArray(expResult.matchedKeywords),
              improvements: expImprovements,
              actionableImprovements: expActions,
            });
          } catch (err: any) {
            logger.error({ err: err.message, index: i }, "Experience chunk failed");
            expResults.push({});
            sendEvent('experience', {
              index: i,
              role: expEntries[i].role,
              relevanceScore: null,
              matchedKeywords: [],
              improvements: [],
              actionableImprovements: [],
            });
          }
        }

        // ── Chunk 3: Education ──
        sendEvent('status', { chunk: 'education', message: 'Checking education...' });
        let eduResult: any = {};
        try {
          const eduPrompt = buildEducationChunkPrompt(
            Array.isArray(resume.education) ? resume.education : [],
            jd
          );
          const eduResponse = await generateText(eduPrompt);
          eduResult = jsonParseSafe(eduResponse) || {};

          const eduImprovements = normalizeAutoImprovements(
            eduResult.autoImprovements || [],
            'education'
          );
          allAutoImprovements.push(...eduImprovements);
          const eduActions = normalizeToArray(eduResult.actionableImprovements);
          allActionableImprovements.push(...eduActions);

          sendEvent('education', {
            relevanceScore: eduResult.relevanceScore ?? null,
            improvements: eduImprovements,
            actionableImprovements: eduActions,
          });
        } catch (err: any) {
          logger.error({ err: err.message }, "Education chunk failed");
          sendEvent('education', {
            relevanceScore: null,
            improvements: [],
            actionableImprovements: [],
          });
        }

        // ── Chunk 4: Overall score + gap analysis (AI) ──
        sendEvent('status', { chunk: 'summary', message: 'Generating final score...' });
        try {
          const combinedMissingSkills = normalizeToArray(skillResult?.keywordAnalysis?.missingSkills);
          const combinedStrongSkills = normalizeToArray(skillResult?.keywordAnalysis?.strongSkills);

          const gapPrompt = buildGapAnalysisPrompt(resume, jd, skillResult, expResults, eduResult);
          const gapResponse = await generateText(gapPrompt);
          const gapResult = jsonParseSafe(gapResponse) || {};

          const weightedATS = calculateWeightedATS(resume, jd);

          sendEvent('summary', {
            atsScore: gapResult.atsScore ?? weightedATS.score ?? 50,
            weightedATS,
            gapAnalysis: gapResult.gapAnalysis || weightedATS.score < 70
              ? "Your resume needs improvement in skills and experience alignment."
              : "Your resume has good alignment with the job description.",
            finalSummary: gapResult.finalSummary || { strengths: [], weaknesses: [], estimatedScoreAfterImprovement: 0 },
            keywordAnalysis: {
              missingSkills: combinedMissingSkills,
              weakSkills: normalizeToArray(skillResult?.keywordAnalysis?.weakSkills),
              strongSkills: combinedStrongSkills,
            },
            actionableImprovements: allActionableImprovements.slice(0, 8),
            autoImprovements: allAutoImprovements,
          });
        } catch (err: any) {
          logger.error({ err: err.message }, "Summary chunk failed");
          const weightedATS = calculateWeightedATS(resume, jd);
          sendEvent('summary', {
            atsScore: weightedATS.score,
            weightedATS,
            gapAnalysis: "Analysis completed with partial results.",
            finalSummary: { strengths: [], weaknesses: [], estimatedScoreAfterImprovement: 0 },
            keywordAnalysis: skillResult?.keywordAnalysis || { missingSkills: [], weakSkills: [], strongSkills: [] },
            actionableImprovements: allActionableImprovements.slice(0, 8),
            autoImprovements: allAutoImprovements,
          });
        }

        sendEvent('complete', {});
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    logger.error({ error: error?.message || error }, "analyze-ats-chunked failed");
    return new Response(JSON.stringify({ error: "Failed to analyze ATS" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
