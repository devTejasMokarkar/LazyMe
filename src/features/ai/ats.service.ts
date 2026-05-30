const synonyms: Record<string, string[]> = {
  react: ["frontend", "ui", "javascript", "jsx", "reactjs", "react.js"],
  node: ["backend", "api", "nodejs", "node.js", "express"],
  typescript: ["javascript", "ts", "js"],
  python: ["django", "flask", "backend", "scripting"],
  docker: ["container", "kubernetes", "k8s", "devops"],
  aws: ["cloud", "ec2", "s3", "amazon"],
  sql: ["database", "mysql", "postgresql", "postgres", "db"],
  agile: ["scrum", "kanban", "sprint"],
  communication: ["collaborative", "teamwork", "presentation"],
  leadership: ["management", "mentoring", "lead"]
};

// Generic words to ignore in ATS analysis
const genericWords = new Set([
  "job", "role", "team", "company", "india", "bangalore", "looking", "join", "our",
  "location", "employment", "type", "full", "time", "part", "skilled", "work",
  "position", "opportunity", "career", "growth", "environment", "dynamic",
  "the", "and", "a", "to", "of", "in", "i", "is", "that", "it", "on", "you",
  "this", "for", "but", "with", "are", "have", "be", "at", "or", "as", "was",
  "so", "if", "out", "not", "we", "us", "your", "my", "their", "who", "what",
  "when", "where", "how", "why", "which", "about", "into", "through", "during",
  "before", "after", "above", "below", "from", "up", "down", "off", "over",
  "under", "again", "further", "then", "once", "here", "there", "when", "where"
]);

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  return Array.from(new Set(words.filter(w => w.length > 2 && !genericWords.has(w))));
}

export function extractTechnicalSkills(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s\+\#\.]/g, " ").split(/\s+/);
  
  // Technical skill patterns
  const techPatterns = [
    /\b(javascript|typescript|python|java|go|rust|c\+\+|c#|php|ruby|swift|kotlin|scala)\b/,
    /\b(react|vue|angular|svelte|next\.js|nuxt|express|django|flask|spring|rails)\b/,
    /\b(node\.js|nodejs|deno|bun)\b/,
    /\b(react|redux|mobx|zustand|context)\b/,
    /\b(sql|nosql|mongodb|postgresql|mysql|sqlite|redis|elasticsearch)\b/,
    /\b(aws|azure|gcp|docker|kubernetes|k8s|terraform|ansible)\b/,
    /\b(git|github|gitlab|bitbucket|jira|confluence)\b/,
    /\b(html|css|sass|less|tailwind|bootstrap)\b/,
    /\b(rest|graphql|grpc|api|microservices)\b/,
    /\b(ci\/cd|jenkins|github actions|gitlab ci|circleci)\b/,
    /\b(machine learning|ml|ai|data science|nlp|cv)\b/,
    /\b(testing|jest|cypress|playwright|selenium|pytest)\b/
  ];

  const technicalSkills: string[] = [];
  words.forEach(word => {
    if (techPatterns.some(pattern => pattern.test(word))) {
      technicalSkills.push(word);
    }
  });

  return Array.from(new Set(technicalSkills));
}

export function calculateATS(resume: any, jd: string) {
  const resumeText = JSON.stringify(resume);
  const jdWords = extractKeywords(jd);
  const resumeWords = extractKeywords(resumeText);
  
  if (jdWords.length === 0) return { score: 100, matched: [], missing: [] };
  
  const isMatch = (word: string, resumeWords: string[]) => {
    return resumeWords.includes(word) || (synonyms[word]?.some(s => resumeWords.includes(s)));
  };

  const matched = jdWords.filter(w => isMatch(w, resumeWords));
  const missing = jdWords.filter(w => !isMatch(w, resumeWords));
  
  const score = Math.round((matched.length / jdWords.length) * 100);
  
  return { score, matched, missing };
}

// Advanced weighted ATS scoring
export interface WeightedATSResult {
  score: number;
  breakdown: {
    skillsMatch: number;
    experienceRelevance: number;
    keywordCoverage: number;
    roleAlignment: number;
    formattingClarity: number;
  };
  keywordAnalysis: {
    missingSkills: string[];
    weakSkills: string[];
    strongSkills: string[];
  };
}

export function calculateWeightedATS(resume: any, jd: string): WeightedATSResult {
  const resumeText = JSON.stringify(resume);
  
  // Extract technical skills from both
  const jdTechSkills = extractTechnicalSkills(jd);
  const resumeTechSkills = extractTechnicalSkills(resumeText);
  
  // Skills match (40%)
  const skillsMatch = jdTechSkills.length > 0 
    ? Math.round((resumeTechSkills.filter(s => jdTechSkills.includes(s)).length / jdTechSkills.length) * 100)
    : 100;
  
  // Experience relevance (25%) - Check if experience bullets contain relevant keywords
  const experienceText = resume.experience?.map((exp: any) => 
    `${exp.role} ${exp.company} ${exp.bullets?.join(" ") || ""}`
  ).join(" ") || "";
  const jdKeywords = extractKeywords(jd);
  const experienceKeywords = extractKeywords(experienceText);
  const experienceRelevance = jdKeywords.length > 0
    ? Math.round((experienceKeywords.filter(k => jdKeywords.includes(k)).length / jdKeywords.length) * 100)
    : 100;
  
  // Keyword coverage (15%)
  const allJdKeywords = extractKeywords(jd);
  const allResumeKeywords = extractKeywords(resumeText);
  const keywordCoverage = allJdKeywords.length > 0
    ? Math.round((allResumeKeywords.filter(k => allJdKeywords.includes(k)).length / allJdKeywords.length) * 100)
    : 100;
  
  // Role alignment (10%) - Check if resume title matches JD role requirements
  const jdRoleMatch = jd.toLowerCase().match(/(?:role|position|title):\s*([^\n,]+)/i);
  const resumeTitle = resume.title?.toLowerCase() || "";
  let roleAlignment = 50; // Base score
  if (jdRoleMatch) {
    const jdRole = jdRoleMatch[1].toLowerCase().trim();
    if (resumeTitle.includes(jdRole.split(" ")[0])) {
      roleAlignment = 90;
    } else if (jdRole.split(" ").some((word: string) => resumeTitle.includes(word))) {
      roleAlignment = 70;
    }
  }
  
  // Formatting & clarity (10%) - Check for required fields
  const hasRequiredFields = resume.name && resume.email && resume.phone && resume.title && resume.summary;
  const formattingClarity = hasRequiredFields ? 100 : 70;
  
  // Calculate weighted score
  const weightedScore = Math.round(
    (skillsMatch * 0.40) +
    (experienceRelevance * 0.25) +
    (keywordCoverage * 0.15) +
    (roleAlignment * 0.10) +
    (formattingClarity * 0.10)
  );
  
  // Keyword analysis
  const missingSkills = jdTechSkills.filter(s => !resumeTechSkills.includes(s));
  const weakSkills = resumeTechSkills.filter(s => !jdTechSkills.includes(s));
  const strongSkills = resumeTechSkills.filter(s => jdTechSkills.includes(s));
  
  return {
    score: weightedScore,
    breakdown: {
      skillsMatch,
      experienceRelevance,
      keywordCoverage,
      roleAlignment,
      formattingClarity
    },
    keywordAnalysis: {
      missingSkills,
      weakSkills,
      strongSkills
    }
  };
}
