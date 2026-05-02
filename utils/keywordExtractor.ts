export function extractKeywords(jobDescription: string): string[] {
  const text = jobDescription.toLowerCase();
  const commonSkills = [
    "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#",
    "react", "next.js", "vue", "angular", "svelte", "node.js", "express",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "sql", "postgresql", "mongodb", "redis", "graphql", "rest",
    "machine learning", "ai", "data science", "pandas", "numpy",
    "leadership", "agile", "scrum", "communication", "problem solving",
    "git", "ci/cd", "jenkins", "github actions", "linux",
    "figma", "ui/ux", "tailwind", "css", "html",
    "product management", "project management", "strategy",
    "salesforce", "tableau", "power bi", "excel",
    "seo", "marketing", "content", "social media",
    "blockchain", "solidity", "web3", "ethereum",
  ];

  const found = commonSkills.filter(skill => text.includes(skill));

  // Extract additional keywords (capitalized words that look like tech/tools)
  const wordMatches = text.match(/\b[a-z]+(?:\s[a-z]+){0,2}\b/g) || [];
  const freq: Record<string, number> = {};
  wordMatches.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const frequent = Object.entries(freq)
    .filter(([word, count]) => count > 1 && word.length > 3)
    .map(([word]) => word)
    .filter(w => !["with", "from", "that", "this", "have", "will", "your", "their", "they", "them", "than", "been", "were", "what", "when", "where", "which", "while", "about", "after", "before", "during", "under", "over", "into", "onto", "upon", "within", "without", "through", "between", "among", "against", "towards", "across", "around", "behind", "below", "above", "beyond", "except", "despite", "including", "regarding", "concerning", "following", "according", "because", "although", "however", "therefore", "furthermore", "moreover", "nevertheless", "otherwise", "meanwhile", "otherwise", "nonetheless", "accordingly", "consequently", "subsequently", "previously", "originally", "currently", "recently", "frequently", "typically", "generally", "specifically", "particularly", "especially", "essentially", "basically", "actually", "literally", "definitely", "probably", "possibly", "certainly", "obviously", "apparently", "evidently", "presumably", "supposedly", "reportedly", "allegedly", "notably", "remarkably", "significantly", "considerably", "substantially", "dramatically", "drastically", "radically", "entirely", "completely", "totally", "absolutely", "relatively", "approximately", "roughly", "nearly", "almost", "exactly", "precisely", "specifically", "mainly", "mostly", "largely", "partly", "partially", "primarily", "principally", "chiefly", "exclusively", "solely", "only", "just", "simply", "merely", "barely", "hardly", "scarcely", "rarely", "seldom", "never", "always", "often", "usually", "sometimes", "occasionally", "constantly", "continuously", "repeatedly", "regularly", "periodically", "daily", "weekly", "monthly", "annually", "yearly", "quarterly", "hourly", "minutely", "secondly"].includes(w));

  return Array.from(new Set([...found, ...frequent])).slice(0, 20);
}

export function calculateATSScore(resumeText: string, jobDescription: string): { score: number; matched: string[]; missing: string[] } {
  const keywords = extractKeywords(jobDescription);
  const resumeLower = resumeText.toLowerCase();

  const matched = keywords.filter(kw => resumeLower.includes(kw.toLowerCase()));
  const missing = keywords.filter(kw => !resumeLower.includes(kw.toLowerCase()));

  const score = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;

  return { score, matched, missing };
}
