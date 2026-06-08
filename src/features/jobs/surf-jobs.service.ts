export interface SurfJob {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedDate: string;
  relevanceScore: number;
  query: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

const TRUSTED_DOMAINS = [
  "linkedin.com", "naukri.com", "indeed.com", "glassdoor",
  "greenhouse.io", "careers.", "jobs.", "instahyre", "hirist",
  "wellfound", "cutshort", "unstop",
];

const JOB_KEYWORDS = [
  "hiring", "apply", "job", "developer", "engineer",
  "vacancy", "opening", "position", "salary", "lpa", "remote",
];

const IRRELEVANT = [
  "tutorial", "course", "learn", "training", "certification",
  "resume sample", "template", "example resume", "how to write",
];

function scoreResult(
  title: string,
  description: string,
  url: string,
  skills: string[],
): number {
  let score = 0;
  const text = `${title} ${description}`.toLowerCase();

  for (const skill of skills) {
    if (text.includes(skill.toLowerCase())) {
      score += 1;
    }
  }

  for (const kw of JOB_KEYWORDS) {
    if (text.includes(kw)) {
      score += 0.5;
    }
  }

  for (const domain of TRUSTED_DOMAINS) {
    if (url.includes(domain)) {
      score += 3;
    }
  }

  for (const word of IRRELEVANT) {
    if (text.includes(word)) {
      score -= 5;
    }
  }

  return Math.round(score);
}

function buildQueries(
  keyword: string,
  skills: string[],
  location: string,
  workMode: string,
): string[] {
  const skillsLower = skills.map((s) => s.toLowerCase());
  const prioritySkills: string[] = [];
  const preferred = [
    "spring boot", "kafka", "node.js", "java", "microservices",
    "langchain", "rag", "python", "react", "docker", "aws",
  ];
  for (const s of preferred) {
    if (skillsLower.includes(s)) {
      prioritySkills.push(s);
      if (prioritySkills.length >= 3) break;
    }
  }

  const skillStr = prioritySkills.length > 0
    ? prioritySkills.slice(0, 2).join(" ")
    : keyword;

  const queries = [
    `${keyword} ${skillStr} jobs ${location} 2026`,
    `${keyword} ${location} hiring 2026`,
    `${keyword} ${location} ${prioritySkills.join(" ")} jobs 2026`,
    `${keyword} ${location} OR remote jobs 2026`,
    `${keyword} ${location} site:linkedin.com OR site:naukri.com`,
    `${keyword} ${location} ${skillStr} apply now 2026`,
  ];

  if (workMode === "remote" || workMode === "any") {
    queries.push(`remote ${keyword} ${skillStr} 2026`);
  }

  return queries.slice(0, 6);
}

async function tavilySearch(
  query: string,
  apiKey: string,
  maxResults: number,
): Promise<TavilyResult[]> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function searchSurfJobs(
  keyword: string,
  skills: string[],
  location: string,
  workMode: string,
): Promise<{ jobs: SurfJob[]; count: number }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const queries = buildQueries(keyword, skills, location, workMode);
  const allResults: SurfJob[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < queries.length; i++) {
    const results = await tavilySearch(queries[i], apiKey, 5);
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allResults.push({
          title: r.title || "Untitled",
          url: r.url,
          description: (r.content || "").slice(0, 300),
          source: "surf",
          publishedDate: r.published_date || "Recent",
          relevanceScore: scoreResult(r.title, r.content || "", r.url, skills),
          query: queries[i],
        });
      }
    }
  }

  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return { jobs: allResults, count: allResults.length };
}
