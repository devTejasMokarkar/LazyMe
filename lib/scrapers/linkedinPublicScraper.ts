/*
  FALLBACK NOTE:
  If LinkedIn starts returning 999 or empty HTML (blocked):
  Option A — add a 2–3 second delay between requests:
    await new Promise(r => setTimeout(r, 2500))
  Option B — switch to JSearch API (free, 200 calls/month):
    https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
  Option C — use Playwright as a last resort (see linkedinScraper.js)
*/

import axios from "axios";
import { parse } from "node-html-parser";

interface LinkedInScraperParams {
  keyword: string;
  location: string;
  experience?: string;
  jobType?: string;
  page?: number;
}

interface JobResult {
  title: string;
  company: string;
  location: string;
  postedAt: string;
  dateText: string;
  url: string;
}

interface ScrapeResult {
  jobs: JobResult[];
  blocked: boolean;
  error?: string;
}

const EXP_MAP: Record<string, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  director: "5",
  executive: "6",
  any: "",
};

const JT_MAP: Record<string, string> = {
  "full-time": "F",
  "part-time": "P",
  contract: "C",
  temporary: "T",
  volunteer: "V",
  internship: "I",
  remote: "",
  any: "",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const TIMEOUT = 12000;

function elText(el: any): string {
  return el?.textContent?.trim?.() ?? "";
}

function elAttr(el: any, name: string): string {
  return el?.getAttribute?.(name) ?? "";
}

export async function scrapeLinkedInPublic({
  keyword,
  location,
  experience = "any",
  jobType = "any",
  page = 0,
}: LinkedInScraperParams): Promise<ScrapeResult> {
  try {
    const params: Record<string, string> = {
      keywords: keyword,
      location,
      sortBy: "DD",
      f_TPR: "r604800",
    };

    const expVal = EXP_MAP[experience] ?? "";
    if (expVal) params.f_E = expVal;

    if (jobType === "remote") {
      params.f_WT = "2";
    } else {
      const jtVal = JT_MAP[jobType] ?? "";
      if (jtVal) params.f_JT = jtVal;
    }

    if (page > 0) {
      params.start = String(page * 25);
    }

    const response = await axios.get(
      "https://in.linkedin.com/jobs/search/",
      {
        params,
        headers: HEADERS,
        timeout: TIMEOUT,
        validateStatus: null,
      }
    );

    const html = response.data;

    if (!html || html.length < 500) {
      console.error("[LinkedInScraper] Empty / blocked response — status:", response.status);
      return { jobs: [], blocked: true, error: "LinkedIn returned an empty or blocked response." };
    }

    if (response.status === 999 || response.status === 403) {
      console.error("[LinkedInScraper] Blocked — HTTP", response.status);
      return { jobs: [], blocked: true, error: `LinkedIn blocked the request (HTTP ${response.status}).` };
    }

    if (response.status !== 200) {
      console.error("[LinkedInScraper] Unexpected HTTP", response.status);
      return { jobs: [], blocked: true, error: `Unexpected HTTP status ${response.status}.` };
    }

    const root = parse(html as string);
    const resultsList = root.querySelector("ul.jobs-search__results-list");
    const cards = resultsList?.querySelectorAll("li") ?? [];
    const jobs: JobResult[] = [];
    const now = new Date();

    for (const card of cards) {
      const title = elText(card.querySelector("h3.base-search-card__title"));
      const company = elText(card.querySelector("h4.base-search-card__subtitle a"));
      const loc = elText(card.querySelector("span.job-search-card__location"));
      const timeEl = card.querySelector("time");
      const datetime = elAttr(timeEl, "datetime");
      const dateText = elText(timeEl);
      const url = elAttr(card.querySelector("a.base-card__full-link"), "href");

      if (!title || !url || !datetime) continue;

      const posted = new Date(datetime);
      const daysAgo = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);

      if (daysAgo > 7) continue;

      jobs.push({
        title,
        company: company || "Unknown",
        location: loc || location,
        postedAt: posted.toISOString(),
        dateText: dateText || datetime,
        url,
      });
    }

    return { jobs, blocked: false };
  } catch (e: any) {
    console.error("[LinkedInScraper] Error:", e.message);
    return { jobs: [], blocked: true, error: e.message };
  }
}
