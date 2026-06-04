/**
 * Prompt 1: Generate a John Doe dummy resume that intentionally scores 60-70 on ATS
 * to provide a realistic starting baseline before optimization.
 *
 * The resume is structurally sound (Resume Worded style) but deliberately omits
 * some keywords, uses fewer metrics, and has weaker alignment to a typical JD
 * so the ATS score lands in the 60-70 range — not too low (would be unrealistic
 * for a developer resume) and not too high (would defeat the purpose).
 */

export function buildDummyResumePrompt(): string {
  return `IMPORTANT: Generate EVERY field of the resume from scratch. Do NOT
echo any template or example JSON you may have seen. Use the CANDIDATE
INFO, EXPERIENCE, SKILLS and EDUCATION sections below as your only
source of truth. Invent fresh, varied bullet text — never copy.

You are generating a realistic, mid-level developer resume used as DEMO DATA
in a job application web app. The candidate is "John Doe".

## GOAL
Produce a Resume Worded style resume that would realistically score between
60 and 70 against a typical mid-level Java Backend Developer / Full Stack
Java Developer job description. NOT a perfect resume — leave room for
the app's ATS optimizer to improve it to 80+.

## TUNING HINTS (so it lands in 60-70 range)
- Use a generic-ish title like "Java Developer" or "Software Developer"
  (not "Senior Java Backend Engineer" — that would inflate title_match).
- Include core Java stack (Java, Spring Boot, REST APIs, MySQL, JUnit) —
  enough to pass, but omit popular JD keywords: Microservices, Kafka,
  Docker, Kubernetes, AWS, CI/CD, Redis, Hibernate (some, not all).
- Have 2-3 metrics across ALL bullets combined (most bullets should lack
  a measurable number).
- Summary should be 2 sentences, generic ("passionate developer…").
- Skills should be a flat-ish list, NOT heavily categorized — that hurts
  the format_structure / skills_coverage scores slightly.
- Dates should be consistent but the experience is only 2 jobs at small
  companies (no FAANG).
- 1 education entry, Bachelor of Science in Computer Science, 2019.

## CANDIDATE INFO (use as-is)
- Name: John Doe
- Email: john.doe@example.com
- Phone: +1-555-123-4567
- Location: Austin, TX
- LinkedIn: linkedin.com/in/johndoe
- Title: Java Developer

## EXPERIENCE
Write fresh, varied bullets for each job. Do not reuse the same verbs.
Across BOTH jobs combined, use only 1-2 metrics total (e.g. "cut query
time by 15%" on ONE bullet). All other bullets must NOT have a number.

1. Company: TechNova Solutions, Bangalore, IN
   Role: Java Developer
   Duration: 06/2021 - Present
   Company description: Mid-size software services company, 200+
   employees, $20M+ annual revenue. WRITE 3-4 BULLETS.

2. Company: BrightApps Pvt Ltd, Hyderabad, IN
   Role: Junior Software Engineer
   Duration: 07/2019 - 05/2021
   Company description: Early-stage startup building mobile and web apps
   for SMB clients. WRITE 3-4 BULLETS.

## SKILLS
Provide them in 5 groups but with sparse, realistic content:
- technicalSkills: Java, OOP, Data Structures
- frameworks: Spring Boot, JUnit
- databases: MySQL
- cloudDevOps: (empty array [])
- industryKnowledge: REST APIs, JSON

## EDUCATION
- Resume Worded University, Austin, TX
- Bachelor of Science - Computer Science
- 05/2019

## OUTPUT SHAPE

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "name": string,
  "title": string,
  "contact": { "location": string, "phone": string, "email": string, "linkedin": string },
  "experience": [
    {
      "company": string,
      "dates": string,
      "title": string,
      "companyDescription": string,
      "bullets": [string, string, string, string]   // 3-4 bullets per job
    }
  ],
  "education": [
    { "institution": string, "degree": string, "graduationDate": string }
  ],
  "skills": {
    "technicalSkills": [string],
    "frameworks": [string],
    "databases": [string],
    "cloudDevOps": [string],   // can be empty []
    "industryKnowledge": [string]
  },
  "summary": string            // 2 sentences, generic
}

## STRICT RULES
- Generate the JSON from scratch using the CANDIDATE INFO, EXPERIENCE, SKILLS and EDUCATION sections above as your source of truth.
- DO NOT copy the example structure verbatim — write fresh, natural-sounding bullet text for each job.
- NO markdown fences, NO preamble, NO explanation, NO trailing text.
- DO NOT include keywords the user will need the optimizer to add: Microservices, Kafka, Docker, Kubernetes, AWS, CI/CD, Redis, Hibernate, Agile, Git.
- DO NOT use the words "microservices", "scalable", "high-traffic", "10M users" etc.
- Use the EXACT companies, roles, dates, school, degree and contact values from the sections above — do not invent new ones.`;
}

/**
 * Prompt 2: Given a JD, take a 60-70 baseline resume and push ATS to 80-90.
 *
 * This is the "improve ATS" prompt. It edits the existing resume in place
 * (preserves structure, injects keywords) and returns the fully rewritten
 * resume JSON plus the new projected ATS score.
 */

export interface AtsImprovedResumeResult {
  improvedResume: {
    name: string;
    title: string;
    contact: {
      location: string;
      phone: string;
      email: string;
      linkedin: string;
    };
    experience: Array<{
      company: string;
      dates: string;
      title: string;
      companyDescription?: string;
      bullets: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      graduationDate: string;
    }>;
    skills: {
      technicalSkills: string[];
      frameworks: string[];
      databases: string[];
      cloudDevOps: string[];
      industryKnowledge: string[];
    };
  };
  atsScoreBefore: number; // 60-70 range
  atsScoreAfter: number;  // 80-90 range
  missingKeywordsAdded: string[];
  weakSections: string[];
  changesSummary: string;
}

export function buildImproveTo80Prompt(
  resumeJson: string,
  jobDescription: string,
  currentScore: number
): string {
  return `You are an expert ATS resume optimizer. Your job is to EDIT a real
developer's resume in place — preserving every company, role, date, school
and degree — so that it scores between 80 and 90 against the provided job
description. The candidate's story MUST remain truthful: do not invent
companies, jobs, degrees, or years of experience. You may only rephrase
existing bullets, inject JD keywords into bullets, and add ONE new bullet
per job ONLY when a missing keyword has nowhere else to fit.

## INPUTS

CURRENT RESUME (JSON):
${resumeJson}

JOB DESCRIPTION:
${jobDescription}

CURRENT ATS SCORE: ${currentScore} (in 60-70 range)
TARGET ATS SCORE: 80-90

## RULES

1. PRESERVE STRUCTURE: Keep every company, role, dates, school, degree.
   Do not delete any existing bullet. Rephrase it instead.

2. INJECT, DON'T LIST: For every missing keyword from the JD, weave it
   INTO an existing bullet, not into a separate skills list.
   WRONG: "Skills: Microservices, Kafka, Docker"
   RIGHT: "Refactored a monolith into Spring Boot Microservices with Kafka
           event streams, deployed via Docker to AWS, serving 50k req/day"

3. METRICS EVERYWHERE: Every bullet must end with a measurable number.
   If the original had none, append a realistic estimate in parentheses,
   e.g. "(~30% faster)" or "(serving ~10k requests/day)".

4. TITLE FIX: The first line of the summary MUST be exactly:
   "<JD title> | <X> Years Experience"
   This is critical for title_match score.

5. SKILLS GROUPS: Fill all 5 categories — if a group is empty, add 2-3
   realistic skills that match the JD (Java ecosystem, cloud, etc.).

6. NEW BULLETS: Allowed ONE per job, ONLY if a missing keyword has no
   natural fit in the existing bullets. Mark it implicitly by being
   truthful ("Contributed to migration of X to Y").

7. SUMMARY: 3-4 lines. Line 1: title match. Lines 2-4: achievements with
   numbers, all from the candidate's actual stack.

8. SCORE CHECK: After rewriting, mentally verify each missing JD keyword
   appears at least once in the resume. Then estimate the new score —
   it MUST land between 80 and 90. If it would be lower, inject more
   keywords naturally. If it would be higher, dial back and keep it
   in range.

## OUTPUT (STRICT)

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:

{
  "improvedResume": {
    "name": "<preserved from input>",
    "title": "<rewritten to match JD or kept as-is>",
    "contact": { "location": "", "phone": "", "email": "", "linkedin": "" },
    "experience": [
      {
        "company": "<preserved>",
        "dates": "<preserved>",
        "title": "<preserved>",
        "companyDescription": "<preserved or lightly updated>",
        "bullets": ["<preserved + injected keywords + metric>", ...]
      }
    ],
    "education": [
      { "institution": "", "degree": "", "graduationDate": "" }
    ],
    "skills": {
      "technicalSkills": ["<keyword>", ...],
      "frameworks": ["<keyword>", ...],
      "databases": ["<keyword>", ...],
      "cloudDevOps": ["<keyword>", ...],
      "industryKnowledge": ["<keyword>", ...]
    },
    "summary": "<JD title> | <X> Years Experience\\n<line 2>\\n<line 3>\\n<line 4>"
  },
  "atsScoreBefore": ${currentScore},
  "atsScoreAfter": 85,
  "missingKeywordsAdded": ["<keyword>", ...],
  "weakSections": ["<section>", ...],
  "changesSummary": "<2-3 sentence recruiter-style summary of what changed>"
}

## STRICT RULES — OUTPUT

- Output ONLY the JSON object. No markdown, no preamble, no commentary.
- atsScoreAfter MUST be between 80 and 90 inclusive.
- Every keyword listed in missingKeywordsAdded must appear in improvedResume.
- Do not invent employers, roles, dates, schools, or degrees.`;
}
