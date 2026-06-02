export interface AtsScoreResult {
  overall_score: number;
  breakdown: {
    title_match: { score: number; max: number };
    experience_keywords: { score: number; max: number };
    skills_keywords: { score: number; max: number };
    summary_keywords: { score: number; max: number };
    format_structure: { score: number; max: number };
    section_headers: { score: number; max: number };
    dates_consistency: { score: number; max: number };
    education_match: { score: number; max: number };
    quantified_achievements: { score: number; max: number };
  };
  missing_keywords: string[];
  found_keywords: string[];
  title_in_resume: string;
  title_in_jd: string;
  weak_sections: string[];
}

export function buildATSScorerPrompt(resumeText: string, jdText: string): string {
  return `You are an ATS scoring engine. Score this resume against the job description.

Resume Worded Style - Clean single-column ATS-optimized format with:
- Header: Name, title, contact (Location | Phone | Email | LinkedIn)
- Sections ordered: WORK EXPERIENCE, EDUCATION, SKILLS
- Categorized skills (Technical Skills, Frameworks, Databases, Cloud & DevOps, Industry Knowledge)
- Achievement bullets with action verbs and measurable results

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

Return ONLY this JSON, no explanation, no markdown:
{
  "overall_score": 0,
  "breakdown": {
    "title_match": { "score": 0, "max": 30 },
    "experience_keywords": { "score": 0, "max": 25 },
    "skills_keywords": { "score": 0, "max": 15 },
    "summary_keywords": { "score": 0, "max": 10 },
    "format_structure": { "score": 0, "max": 8 },
    "section_headers": { "score": 0, "max": 5 },
    "dates_consistency": { "score": 0, "max": 4 },
    "education_match": { "score": 0, "max": 2 },
    "quantified_achievements": { "score": 0, "max": 1 }
  },
  "missing_keywords": ["keyword1", "keyword2"],
  "found_keywords": ["keyword1", "keyword2"],
  "title_in_resume": "exact title found",
  "title_in_jd": "exact title from JD",
  "weak_sections": ["experience_keywords", "title_match"]
}`;
}

export function buildATSImproverPrompt(
  currentScore: number,
  missingKeywords: string,
  weakSectionsContent: string,
  jdText: string,
  jdTitle: string
): string {
  return `You are an ATS resume optimizer. Your job is to EDIT existing resume 
sections by injecting missing keywords — NOT rewrite from scratch.

ORIGINAL RESUME SECTIONS (you must preserve all existing content):
${weakSectionsContent}

JOB DESCRIPTION:
${jdText}

KEYWORDS THAT MUST APPEAR IN OUTPUT (currently missing):
${missingKeywords}

CURRENT ATS SCORE: ${currentScore}%
TARGET ATS SCORE: 80%+

STRICT RULES — violating any rule makes the output invalid:

RULE 1 — PRESERVE: Keep every existing bullet point. Only ADD keywords 
into existing sentences or append a new bullet if a keyword has nowhere 
to fit. Never delete content.

RULE 2 — INJECT, DON'T LIST: Add missing keywords inside bullet text.
WRONG: "Skills: Spring Boot, REST APIs, MySQL"  
RIGHT: existing bullet "Built connectors" → "Built Spring Boot connectors 
       exposing RESTful APIs, persisting data in MySQL"

RULE 3 — TITLE FIX: If title_match score is low, prepend the JD job 
title to the summary first line as: "${jdTitle} | X Years Experience"

RULE 4 — METRICS: Every bullet must have a number. If original has none,
add a realistic estimate in parentheses: "(~30% faster)"

RULE 5 — FORMAT: Return ONLY this exact structure, nothing else:

[SECTION: summary]
<3-4 lines. Line 1: JD title | years. Lines 2-4: achievements with numbers>

[SECTION: experience_keywords]  
• <original bullet with keywords injected>
• <original bullet with keywords injected>
• <add 1 new bullet ONLY if a keyword truly has no home>

[SECTION: skills_keywords]
<Label>: <value, value, value>
<Label>: <value, value, value>

RULE 6 — NO PLACEHOLDERS: Never write "[section improved]" or 
"[original content]". Always write the actual text.

RULE 7 — SCORE CHECK: Before finalizing, mentally verify each missing 
keyword appears at least once in your output. If any is missing, add it.`;
}
