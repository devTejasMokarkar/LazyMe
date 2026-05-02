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

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const stopWords = new Set(["the","and","a","to","of","in","i","is","that","it","on","you","this","for","but","with","are","have","be","at","or","as","was","so","if","out","not"]);
  return Array.from(new Set(words.filter(w => w.length > 2 && !stopWords.has(w))));
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
