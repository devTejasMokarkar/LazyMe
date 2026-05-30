import type { ResumeData } from "@/features/ai/prompts/resume.prompts";

/**
 * Builds an optimized prompt for generating personalized interview prep Q&A
 * based on the candidate's resume, target role, and optional job description.
 */
export function buildInterviewPrepPrompt(
  resume: Partial<ResumeData>,
  options: {
    targetRole?: string;
    jobDescription?: string;
    difficulty?: "easy" | "medium" | "hard";
    count?: number;
  } = {}
): string {
  const { targetRole, jobDescription, difficulty = "medium", count = 10 } = options;

  const role = targetRole || resume.title || "Software Engineer";
  const skills = resume.skills?.join(", ") || "general programming skills";
  const experience = resume.experience
    ?.map((e) => `${e.role} at ${e.company} (${e.duration}): ${e.bullets?.join("; ")}`)
    .join("\n") || "not provided";
  const projects = resume.projects
    ?.map((p) => `${p.name}: ${p.description} [${p.tech?.join(", ")}]`)
    .join("\n") || "not provided";
  const education = resume.education
    ?.map((e) => `${e.degree} from ${e.school} (${e.year})`)
    .join(", ") || "not provided";

  return `You are a senior technical interviewer and career coach. Generate a personalized interview preparation package for a candidate.

## CANDIDATE PROFILE
Name: ${resume.name || "Candidate"}
Target Role: ${role}
Skills: ${skills}
Education: ${education}

Experience:
${experience}

Projects:
${projects}

${jobDescription ? `## TARGET JOB DESCRIPTION\n${jobDescription}\n` : ""}
## TASK
Generate exactly ${count} interview questions at "${difficulty}" difficulty level, personalized to this candidate's background. The questions should help them prepare for a "${role}" interview.

## QUESTION DISTRIBUTION
- 40% Technical (based on their actual skills and tech stack)
- 25% Behavioral (based on their experience and projects)  
- 20% System Design / Problem Solving (appropriate to their seniority level)
- 15% Role-specific / Domain knowledge

## OUTPUT FORMAT (STRICT JSON)
Return ONLY valid JSON with this exact structure:
{
  "metadata": {
    "role": "${role}",
    "difficulty": "${difficulty}",
    "totalQuestions": ${count}
  },
  "categories": [
    {
      "category": "Technical Skills",
      "questions": [
        {
          "question": "specific question text",
          "idealAnswer": "concise ideal answer (2-4 sentences)",
          "tips": "preparation tip for this question",
          "difficulty": "easy|medium|hard"
        }
      ]
    },
    {
      "category": "Behavioral",
      "questions": [...]
    },
    {
      "category": "System Design",
      "questions": [...]
    },
    {
      "category": "Role-Specific",
      "questions": [...]
    }
  ],
  "quickRevisionSheet": {
    "keyConceptsToReview": [
      "concept 1 — brief explanation",
      "concept 2 — brief explanation"
    ],
    "commonPatterns": [
      "pattern 1 — when to use it",
      "pattern 2 — when to use it"
    ],
    "doAndDont": {
      "do": [
        "specific advice based on their resume"
      ],
      "dont": [
        "specific pitfall to avoid"
      ]
    }
  }
}

## RULES
- Questions MUST be personalized — reference their actual skills, projects, and experience
- Do NOT ask generic questions like "Tell me about yourself"
- Technical questions should probe depth in technologies they actually know
- Behavioral questions should reference scenarios they've likely faced
- Quick revision sheet must be actionable and specific to their tech stack
- Output ONLY valid JSON, no markdown, no explanation, no preamble
- idealAnswer should be concise but demonstrate expertise
- tips should be actionable preparation advice`;
}
