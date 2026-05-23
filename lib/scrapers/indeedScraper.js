/*
  FALLBACK: If Indeed blocks (returns blocked: true):
  1. Wait 2-3 minutes and retry
  2. Switch to JSearch API: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
*/

import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeJob, isWithin7Days, formatDateText, getHeaders } from "./utils.js";

/**
 * Parses a relative Indeed date text (e.g. "3 days ago", "Just posted") into an ISO 8601 string.
 * 
 * @param {string} dateText - The relative date string.
 * @returns {string} The ISO 8601 date string.
 */
function parseDateTextToIso(dateText) {
  if (!dateText) {
    return new Date().toISOString();
  }
  const text = dateText.toLowerCase().trim();
  const now = new Date();

  if (
    text.includes("just posted") ||
    text.includes("today") ||
    text.includes("active today") ||
    text.includes("active 0 days ago") ||
    text.includes("0 days ago")
  ) {
    return now.toISOString();
  }

  if (
    text.includes("yesterday") ||
    text.includes("active yesterday") ||
    text.includes("active 1 day ago") ||
    text.includes("1 day ago")
  ) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }

  // Match "X days ago" or "posted X days ago" or "active X days ago" or "X days"
  const match = text.match(/(\d+)\s+day/);
  if (match && match[1]) {
    const days = parseInt(match[1], 10);
    now.setDate(now.getDate() - days);
    return now.toISOString();
  }

  if (text.includes("30+")) {
    now.setDate(now.getDate() - 35);
    return now.toISOString();
  }

  return now.toISOString();
}

/**
 * Scrapes job listings from Indeed India (in.indeed.com) matching the specified criteria.
 * 
 * @param {Object} params - The search filters.
 * @param {string} [params.keyword] - The search query/job title.
 * @param {string} [params.location] - The location (defaults to "Nagpur").
 * @param {string} [params.jobType] - Job type filter ("full-time" | "part-time" | "remote" | "contract" | "any").
 * @param {string} [params.experience] - Experience level filter (optional).
 * @param {number} [params.page] - Page number for pagination (0-indexed).
 * @returns {Promise<{jobs: import('./types').Job[], blocked: boolean, error?: string}>} The scraping result.
 */
export async function scrapeIndeed({ keyword, location, jobType, experience, page = 0 } = {}) {
  try {
    const queryParams = new URLSearchParams({
      q: keyword || "",
      l: location || "Nagpur",
      fromage: "7",
      sort: "date",
      start: String((page || 0) * 10)
    });

    if (jobType && jobType !== "any") {
      if (jobType === "remote") {
        queryParams.set("jt", "fulltime");
        queryParams.set("remotejob", "1");
      } else {
        const jtMap = {
          "full-time": "fulltime",
          "part-time": "parttime",
          "contract": "contract"
        };
        queryParams.set("jt", jtMap[jobType] || jobType);
      }
    }

    const url = `https://in.indeed.com/jobs?${queryParams.toString()}`;

    const response = await axios.get(url, {
      headers: getHeaders(),
      timeout: 12000,
      responseType: "text"
    });

    const $ = cheerio.load(response.data);

    let cards = $("div.job_seen_beacon");
    if (cards.length === 0) {
      cards = $("div.resultContent");
    }

    // Indeed blocked page or captcha
    if (cards.length === 0) {
      return { jobs: [], blocked: true, error: "Indeed blocked the request" };
    }

    const jobs = [];

    cards.each((_, element) => {
      const card = $(element);
      const titleEl = card.find("h2.jobTitle a, a.jcs-JobTitle");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href") || "";

      if (!title || !href) {
        return; // skip if invalid
      }

      const applyUrl = href.startsWith("http") ? href : `https://in.indeed.com${href}`;
      const company = card.find('[data-testid="company-name"], span.companyName').text().trim();
      const loc = card.find('[data-testid="text-location"], div.companyLocation').text().trim() || location || "Nagpur";
      const rawDateText = card.find('[data-testid="myJobsStateDate"], span.date').text().trim();
      const postedAt = parseDateTextToIso(rawDateText);
      const salary = card.find('[data-testid="attribute_snippet_testid"], div.salarySnippet, div.metadata').text().trim();

      const raw = {
        title,
        company: company || "Indeed Employer",
        location: loc,
        url: applyUrl,
        postedAt,
        dateText: formatDateText(postedAt),
        salary: salary || "",
        jobType: jobType || ""
      };

      if (isWithin7Days(postedAt)) {
        const normalized = normalizeJob(raw, "indeed");
        if (normalized) {
          jobs.push(normalized);
        }
      }
    });

    return { jobs, blocked: false };
  } catch (error) {
    const is403 = error.response && error.response.status === 403;
    if (is403) {
      return { jobs: [], blocked: true, error: "Indeed blocked the request" };
    }
    return { jobs: [], blocked: false, error: error.message || String(error) };
  }
}
