import { callOpenRouter } from "@/features/ai/ai.service";
import { logger } from '@/lib/logger';

const JOB_MATCH_PROMPT = `You are an expert job matching assistant. Given a resume and a job description, analyze the match and return a JSON response with:

{
  "matchScore": 0-100,
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "missingSkills": ["skill1", "skill2"],
  "recommendation": "Brief recommendation about applying",
  "shouldApply": true/false
}

Rules:
- Score 80-100: Excellent match, should definitely apply
- Score 60-79: Good match, worth applying
- Score 40-59: Moderate match, consider applying if interested
- Score 0-39: Poor match, likely not worth applying

Be fair but realistic. Don't inflate scores.`;

const KEYWORD_EXPAND_PROMPT = `Given this resume information, extract smart search keywords for job searching. Return ONLY a JSON array of strings:

["keyword1", "keyword2", "keyword3"]

Include:
- Current and past job titles
- Key technical skills
- Industry terms
- Related roles they could apply for

Return 5-10 keywords, most relevant first.`;

export interface JobMatchResult {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  missingSkills: string[];
  recommendation: string;
  shouldApply: boolean;
}

export async function analyzeJobMatch(
  resumeData: {
    name?: string;
    title?: string;
    skills?: string[];
    experience?: Array<{ role?: string; company?: string; bullets?: string[] }>;
    education?: Array<{ degree?: string; institution?: string }>;
    summary?: string;
  },
  jobDescription: string
): Promise<JobMatchResult> {
  const prompt = `${JOB_MATCH_PROMPT}

RESUME:
Name: ${resumeData.name || 'N/A'}
Title: ${resumeData.title || 'N/A'}
Skills: ${(resumeData.skills || []).join(', ') || 'N/A'}
Experience: ${(resumeData.experience || []).map(e => `${e.role || ''} at ${e.company || ''}`).join('; ') || 'N/A'}
Summary: ${resumeData.summary || 'N/A'}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON, no markdown, no explanations.`;

  try {
    const response = await callOpenRouterForKeywordExpand(prompt);
    if (response) {
      const result = parseJobMatchResponse(response);
      if (result) return result;
    }
  } catch (error) {
    // Silently fail - fallback will be used
  }

  // Fallback: basic keyword matching
  return basicJobMatch(resumeData, jobDescription);
}

export async function expandSearchKeywords(
  resumeData: {
    title?: string;
    skills?: string[];
    experience?: Array<{ role?: string }>;
  }
): Promise<string[]> {
  const prompt = `${KEYWORD_EXPAND_PROMPT}

RESUME:
Title: ${resumeData.title || 'N/A'}
Skills: ${(resumeData.skills || []).join(', ') || 'N/A'}
Experience: ${(resumeData.experience || []).map(e => e.role || '').join('; ') || 'N/A'}`;

  try {
    const response = await callOpenRouterForKeywordExpand(prompt);
    if (response) {
      const keywords = parseKeywordsResponse(response);
      if (keywords && keywords.length > 0) return keywords;
    }
  } catch (error) {
    // Silently fail - fallback will be used
  }

  // Fallback: basic keyword extraction
  return basicKeywordExtraction(resumeData);
}

function parseJobMatchResponse(response: string): JobMatchResult | null {
  try {
    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      matchScore: Math.max(0, Math.min(100, parsed.matchScore || 0)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      recommendation: parsed.recommendation || '',
      shouldApply: parsed.shouldApply === true || parsed.matchScore >= 60
    };
  } catch (error: any) {
    logger.error({
      msg: "Failed to parse job match response:",
      error: error.message
    });
    return null;
  }
}

function parseKeywordsResponse(response: string): string[] | null {
  try {
    let jsonStr = response.trim();
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed.filter((k: any) => typeof k === 'string' && k.trim()) : null;
  } catch (error: any) {
    logger.error({
      msg: "Failed to parse keywords response:",
      error: error.message
    });
    return null;
  }
}

function basicJobMatch(
  resumeData: any,
  jobDescription: string
): JobMatchResult {
  const resumeText = [
    resumeData.title,
    (resumeData.skills || []).join(' '),
    (resumeData.experience || []).map((e: any) => e.role).join(' '),
    resumeData.summary
  ].filter(Boolean).join(' ').toLowerCase();

  const jobWords = jobDescription.toLowerCase().split(/\s+/);
  const resumeWords = resumeText.split(/\s+/);

  const commonWords = resumeWords.filter(w => jobWords.includes(w));
  const score = Math.round((commonWords.length / Math.max(jobWords.length, 1)) * 100);

  return {
    matchScore: Math.min(85, score),
    strengths: ['Basic keyword match found'],
    gaps: ['AI analysis unavailable'],
    missingSkills: [],
    recommendation: score > 50 ? 'Consider applying' : 'May not be the best match',
    shouldApply: score > 50
  };
}

function basicKeywordExtraction(resumeData: any): string[] {
  const keywords: string[] = [];

  if (resumeData.title) keywords.push(resumeData.title);
  if (resumeData.skills) keywords.push(...resumeData.skills.slice(0, 5));
  if (resumeData.experience) {
    keywords.push(...resumeData.experience.map((e: any) => e.role).filter(Boolean).slice(0, 3));
  }

  return Array.from(new Set(keywords)).slice(0, 8);
}

async function callOllama(prompt: string, model: string = 'llama3.2'): Promise<string | null> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000); // 30s timeout for local models

    const r = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1000
        }
      })
    });

    clearTimeout(timer);

    if (!r.ok) return null;

    const data = await r.json();
    return data.response || null;
  } catch (error: any) {
    // Ollama not available or model not pulled
    logger.warn({
      message: `Ollama ${model} error`,
      messageDetails: error?.message || "request failed"
    });
    return null;
  }
}

async function callOpenRouterForKeywordExpand(prompt: string): Promise<string | null> {
  // Try Ollama first (local, free, no rate limits)
  const preferredModel = process.env.OLLAMA_MODEL || 'llama3.2';
  const ollamaModels = [preferredModel, 'llama3.2', 'llama3.1', 'qwen2.5', 'mistral', 'gemma2'];
  for (const model of ollamaModels) {
    const result = await callOllama(prompt, model);
    if (result) {
      logger.info({ message: `Ollama ${model} successful` });
      return result;
    }
  }

  // Fall back to OpenRouter
  const openAIKey = process.env.OPENROUTER_API_KEY;
  if (!openAIKey) return null;

  const models = [
    "deepseek/deepseek-v4-flash:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "openai/gpt-4o-mini"
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${openAIKey}`,
          "HTTP-Referer": "https://github.com//LazyMe",
          "X-Title": "LazyMe",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      clearTimeout(timer);

      if (!r.ok) continue;

      const d = await r.json();
      return d.choices[0].message.content;
    } catch (e) {
      continue;
    }
  }

  return null;
}
