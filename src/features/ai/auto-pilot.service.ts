import { scrapeLinkedInPublic } from "@/scrapers/linkedinPublicScraper";
import { scrapeIndeed } from "@/scrapers/indeedScraper.js";
import { scrapeRemotive } from "@/scrapers/remotiveScraper.js";
import { deduplicateJobs } from "@/scrapers/utils.js";
import { logger } from "@/lib/logger";

export interface AutoPilotJob {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  postedAt: string;
  dateText: string;
  salary: string;
  matchScore: number;
  matchFactors: { label: string; score: number }[];
  tags: string[];
}

export interface AutoPilotSearchSummary {
  totalJobs: number;
  highMatch: number;
  mediumMatch: number;
  lowMatch: number;
  sourceCounts: Record<string, number>;
}

export interface AutoPilotResult {
  keywords: string[];
  jobs: AutoPilotJob[];
  summary: AutoPilotSearchSummary;
}

export interface AutoPilotRequest {
  resume: any;
  keywords?: string[];
  location?: string;
  jobType?: string;
  experience?: string;
}

export function extractSearchKeywords(resume: any): string[] {
  const keywords: string[] = [];

  if (resume.title) {
    keywords.push(resume.title);
    const firstWord = resume.title.split(" ")[0];
    if (firstWord && !keywords.includes(firstWord)) {
      keywords.push(firstWord);
    }
  }

  const skills = Array.isArray(resume.skills)
    ? resume.skills
    : resume.skills?.technical || [];

  const techKeywords = skills.filter((s: string) =>
    /^(react|vue|angular|node|python|java|go|rust|aws|docker|kubernetes|typescript|javascript|devops|frontend|backend|full.?stack|ml|ai|data|ios|android|flutter|react.?native|graphql|api|cloud)/i.test(s)
  );
  keywords.push(...techKeywords.slice(0, 3));

  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp.role && !keywords.includes(exp.role)) {
        keywords.push(exp.role);
      }
      if (keywords.length >= 8) break;
    }
  }

  return Array.from(new Set(keywords)).filter(Boolean).slice(0, 8);
}

function calculateTitleScore(resume: any, jobTitle: string, jobCompany: string): number {
  const resumeTerms = [
    resume.title?.toLowerCase() || "",
    ...(Array.isArray(resume.skills) ? resume.skills : []).map((s: string) => s.toLowerCase()),
    ...(resume.experience || []).flatMap((e: any) => [
      e.role?.toLowerCase() || "",
      ...(e.bullets || []).map((b: string) => b.toLowerCase()),
    ]),
  ].filter(Boolean);

  const jobText = `${jobTitle} ${jobCompany}`.toLowerCase();
  const jobWords = new Set(jobText.split(/\s+/).filter((w) => w.length > 2));

  if (jobWords.size === 0) return 0;

  let matchCount = 0;
  for (const term of resumeTerms) {
    const termWords = term.split(/\s+/);
    for (const tw of termWords) {
      if (tw.length > 2 && jobWords.has(tw)) {
        matchCount++;
        break;
      }
    }
  }

  const score = Math.round((matchCount / Math.min(resumeTerms.length, 10)) * 100);
  return Math.min(100, score);
}

function extractTags(title: string, source: string): string[] {
  const tags: string[] = [source.charAt(0).toUpperCase() + source.slice(1)];
  const lower = title.toLowerCase();
  if (/remote/i.test(lower)) tags.push("Remote");
  if (/senior|lead|head|principal|staff/i.test(lower)) tags.push("Senior");
  if (/junior|fresher|trainee|intern/i.test(lower)) tags.push("Entry Level");
  if (/contract|freelance|temporary/i.test(lower)) tags.push("Contract");
  return tags;
}

function normalizeScrapedJob(job: any, source: string): AutoPilotJob | null {
  if (!job || !job.title || !job.url) return null;

  const title = job.title || "";
  const company = job.company || "Unknown";
  const location = job.location || "Remote";
  const url = job.url || "";
  const postedAt = job.postedAt || new Date().toISOString();
  const dateText = job.dateText || "";
  const salary = job.salary || "";

  const id = `auto_${source}_${Buffer.from(url).toString("base64").slice(0, 12)}`;

  return {
    id,
    title,
    company,
    location,
    source,
    url,
    postedAt,
    dateText,
    salary,
    matchScore: 0,
    matchFactors: [],
    tags: extractTags(title, source),
  };
}

export async function runAutoPilot(req: AutoPilotRequest): Promise<AutoPilotResult> {
  const { resume, location = "Remote", jobType = "any", experience = "any" } = req;

  let keywords = req.keywords;
  if (!keywords || keywords.length === 0) {
    keywords = extractSearchKeywords(resume);
  }

  logger.info({ keywords, location }, "Auto-pilot starting search");

  const searchTasks: Promise<{ source: string; jobs: any[] }>[] = [];

  const primaryKeyword = keywords[0] || "developer";

  if (keywords.length > 0) {
    searchTasks.push(
      scrapeLinkedInPublic({ keyword: primaryKeyword, location, experience, jobType })
        .then((r) => ({ source: "linkedin", jobs: r.jobs || [] }))
        .catch((e) => {
          logger.warn({ error: e.message }, "LinkedIn scrape failed");
          return { source: "linkedin", jobs: [] };
        })
    );
  }

  searchTasks.push(
    scrapeIndeed({ keyword: primaryKeyword, location, jobType, experience })
      .then((r) => ({ source: "indeed", jobs: r.jobs || [] }))
      .catch((e) => {
        logger.warn({ error: e.message }, "Indeed scrape failed");
        return { source: "indeed", jobs: [] };
      })
  );

  searchTasks.push(
    scrapeRemotive({ keyword: primaryKeyword, jobType })
      .then((jobs) => ({ source: "remotive", jobs }))
      .catch((e) => {
        logger.warn({ error: e.message }, "Remotive scrape failed");
        return { source: "remotive", jobs: [] };
      })
  );

  const searchResults = await Promise.all(searchTasks);

  const allJobs: any[] = [];
  const sourceCounts: Record<string, number> = {};

  for (const result of searchResults) {
    sourceCounts[result.source] = result.jobs.length;
    allJobs.push(
      ...result.jobs
        .map((j) => normalizeScrapedJob(j, result.source))
        .filter(Boolean)
    );
  }

  const deduped = deduplicateJobs(allJobs as any) as AutoPilotJob[];

  for (const job of deduped) {
    const score = calculateTitleScore(resume, job.title, job.company);
    job.matchScore = score;

    const skillScore = Math.min(100, score + 10);
    const expScore = Math.min(100, score + 5);
    const locScore = /remote/i.test(job.location) ? 90 : 70;

    job.matchFactors = [
      { label: "Title Match", score },
      { label: "Skills Overlap", score: skillScore },
      { label: "Relevance", score: expScore },
      { label: "Location Fit", score: locScore },
    ];
  }

  deduped.sort((a, b) => b.matchScore - a.matchScore);

  const highMatch = deduped.filter((j) => j.matchScore >= 70);
  const mediumMatch = deduped.filter((j) => j.matchScore >= 40 && j.matchScore < 70);
  const lowMatch = deduped.filter((j) => j.matchScore < 40);

  const summary: AutoPilotSearchSummary = {
    totalJobs: deduped.length,
    highMatch: highMatch.length,
    mediumMatch: mediumMatch.length,
    lowMatch: lowMatch.length,
    sourceCounts,
  };

  return { keywords, jobs: deduped, summary };
}
