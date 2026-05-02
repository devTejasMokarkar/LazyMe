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
