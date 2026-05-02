export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  title: string;
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    tech: string[];
  }>;
}

export function buildResumePrompt(data: Partial<ResumeData>, jobDescription?: string): string {
  const basePrompt = `Generate a professional resume in JSON format. No explanation, only valid JSON.

Candidate Info:
${JSON.stringify(data, null, 2)}

${jobDescription ? `Job Description: ${jobDescription}` : ""}

Rules:
- Output ONLY valid JSON with this exact shape:
{
  "name": "",
  "email": "",
  "phone": "",
  "title": "",
  "summary": "",
  "skills": [""],
  "experience": [{"company":"","role":"","duration":"","bullets":[""]}],
  "education": [{"school":"","degree":"","year":""}],
  "projects": [{"name":"","description":"","tech":[""]}]
}
- Summary must be 2-3 sentences, impactful.
- Skills must be 8-12 relevant items.
- Experience bullets must use action verbs and metrics where possible.
- Tailor to the job description if provided.
- Fill in any missing fields with realistic, professional content.`;

  return basePrompt;
}

export function buildCoverLetterPrompt(resumeData: Partial<ResumeData>, jobDescription: string, companyName: string): string {
  const skills = resumeData.skills?.join(", ") || "various technical skills";
  const experience = resumeData.experience && resumeData.experience.length > 0 
    ? resumeData.experience.map(e => `${e.role} at ${e.company}`).join(", ")
    : "relevant professional experience";

  return `Write a professional cover letter under 150 words.

Candidate: ${resumeData.name}, ${resumeData.title}
Skills: ${skills}
Experience: ${experience}

Company: ${companyName}
Job Description: ${jobDescription}

Rules:
- Professional, concise, under 150 words
- Mention 2-3 specific skills matching the job
- Show enthusiasm for the role
- End with a call to action
- No placeholders, no brackets
- Output plain text only, no markdown`;
}

export interface ATSAnalysisResult {
  atsScore: number;
  keywordAnalysis: {
    missingSkills: string[];
    weakSkills: string[];
    strongSkills: string[];
  };
  gapAnalysis: string;
  actionableImprovements: string[];
  autoImprovements: Array<{
    section: string;
    before: string;
    after: string;
  }>;
  finalSummary: {
    strengths: string[];
    weaknesses: string[];
    estimatedScoreAfterImprovement: number;
  };
}

export function buildATSOptimizationPrompt(resume: Partial<ResumeData>, jobDescription: string): string {
  return `You are an AI ATS Optimization Engine inside a job application platform.

Your task is to analyze a resume against a job description and provide an accurate, recruiter-level ATS evaluation, not basic keyword matching.

## INPUT

Resume:
${JSON.stringify(resume, null, 2)}

Job Description:
${jobDescription}

## OUTPUT (STRICT FORMAT)

Return ONLY valid JSON with this exact structure:
{
  "atsScore": number (0-100),
  "keywordAnalysis": {
    "missingSkills": string[],
    "weakSkills": string[],
    "strongSkills": string[]
  },
  "gapAnalysis": string,
  "actionableImprovements": string[],
  "autoImprovements": [
    {
      "section": string,
      "before": string,
      "after": string
    }
  ],
  "finalSummary": {
    "strengths": string[],
    "weaknesses": string[],
    "estimatedScoreAfterImprovement": number
  }
}

## SCORING LOGIC

Use weighted logic:
- Skills match (40%)
- Experience relevance (25%)
- Keyword coverage (15%)
- Role alignment (10%)
- Formatting & clarity (10%)

## KEYWORD ANALYSIS (SMART FILTERING)

Extract ONLY:
- Technical skills
- Frameworks
- Tools
- Role-specific keywords
- Domain terms

IGNORE:
- Generic words (job, role, team, company, india, bangalore, looking, join, etc.)

## GAP ANALYSIS

Explain clearly:
- Why ATS score is low
- What critical skills/experience are missing
- What a recruiter will think after reading the resume

Keep it sharp and realistic.

## ACTIONABLE IMPROVEMENTS

Give precise, implementation-ready suggestions.

Each suggestion must:
- Be specific
- Be measurable if possible
- Improve ATS score

Example style:
- Add: "Built REST APIs using Spring Boot handling 10k+ requests/day"
- Add metrics (%, scale, impact)
- Align experience with JD requirements

## AUTO-IMPROVEMENT OUTPUT

Return structured rewrite suggestions in the "autoImprovements" array with section, before, and after fields.

## FINAL SUMMARY

Return:
- strengths (what matches well)
- weaknesses (critical gaps)
- estimated_score_after_improvement

## STRICT RULES

- Do NOT include generic keywords
- Do NOT inflate ATS score
- Do NOT repeat JD blindly
- Focus on hiring relevance, not keyword stuffing
- Output must feel like a real recruiter evaluation
- Return ONLY valid JSON, no markdown, no explanation`;
}
