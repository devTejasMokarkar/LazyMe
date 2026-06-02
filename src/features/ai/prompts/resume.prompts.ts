export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location?: string;
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
  const basePrompt = `Generate a professional Resume Worded style resume in JSON format. No explanation, only valid JSON.

Candidate Info:
${JSON.stringify(data, null, 2)}

${jobDescription ? `Job Description: ${jobDescription}` : ""}

Rules:
- Output ONLY valid JSON with this exact shape:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "title": "",
  "summary": "",
  "skills": {
    "technicalSkills": [""],
    "frameworks": [""],
    "databases": [""],
    "cloudDevOps": [""],
    "industryKnowledge": [""]
  },
  "experience": [{"company":"","role":"","duration":"","bullets":[""],"companyDescription":""}],
  "education": [{"school":"","degree":"","year":""}]
}
- Resume Worded Style: Clean single-column ATS-optimized format.
- NO multi-column layouts, NO tables, NO graphics.
- Section order: WORK EXPERIENCE, EDUCATION, SKILLS.
- Experience bullets use action verbs and measurable results (e.g., "Reduced API response times by 87%").
- Skills grouped into categories: Technical Skills, Frameworks, Databases, Cloud & DevOps, Industry Knowledge.
- Summary must be 2-3 sentences, impactful.
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
      "after": string,
      "impact": number (estimated ATS points gained 1-15)
    }
  ],
  "finalSummary": {
    "strengths": string[],
    "weaknesses": string[],
    "estimatedScoreAfterImprovement": number
  }
}

## SCORING LOGIC (5 Category Breakdown)

Use weighted logic with these 5 categories:
- Keyword Match (20%) - How many JD keywords appear in resume
- Experience Relevance (25%) - How well experience bullets match the JD
- Job Title Match (15%) - How closely the resume title matches the target role
- Formatting (10%) - Clean single-column, proper section headers, consistent dates
- Skills Coverage (30%) - How many required technical skills are present

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
Each entry MUST include an "impact" field (1-15) estimating the ATS points each individual change adds.
Focus on high-impact changes (adding missing keywords, rewriting weak bullets, improving summary).

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

export function buildResumeFromChatPrompt(message: string): string {
  return `You are a professional resume writer and career coach.

The user has described themselves in a conversational message. Your job is to extract every detail and generate a complete, polished, professional resume.

User's message:
"""
${message}
"""

Instructions:
1. Extract all identifiable information from the message (name, email, phone, location, job title, skills, experience, education, projects).
2. For any missing sections, generate realistic and professional content based on context clues. For example, if the user mentions "3 years of React experience" but doesn't give company names, create plausible entries.
3. Make experience bullets action-oriented with metrics where possible.
4. Write a compelling 2-3 sentence professional summary.
5. List 8-12 relevant skills.
6. Do NOT invent an email or phone if none was provided — leave them as empty strings.
7. If the user mentions a target role or job, tailor the resume toward that role.

Output ONLY valid JSON with this exact shape:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "title": "",
  "summary": "",
  "skills": {
    "technicalSkills": [""],
    "frameworks": [""],
    "databases": [""],
    "cloudDevOps": [""],
    "industryKnowledge": [""]
  },
  "experience": [{"company":"","role":"","duration":"","bullets":[""],"companyDescription":""}],
  "education": [{"school":"","degree":"","year":""}]
}

STRICT RULES:
- Output ONLY valid JSON, no markdown, no explanation, no preamble.
- Every field must be present in the output.
- Skills should be categorized into the 5 groups.
- Experience must have at least 1 entry with 3-5 achievement bullets each using action verbs and metrics.
- Education must have at least 1 entry.
- Summary must be 2-3 impactful sentences.
- Resume Worded Style: Clean single-column, no tables, no multi-column.`;
}
