/*
  FALLBACK NOTE:
  If LinkedIn starts returning 999 or empty HTML (blocked):
  Option A — add a 2-3 second delay between requests:
    await new Promise(r => setTimeout(r, 2500))
  Option B — switch to JSearch API (free, 200 calls/month):
    https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
  Option C — use Playwright as a last resort (see linkedinScraper.js)
*/

const axios = require("axios");
const cheerio = require("cheerio");

const EXPERIENCE_MAP = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  director: "5",
  executive: "6",
  any: "",
};

const JOBTYPE_MAP = {
  "full-time": "F",
  "part-time": "P",
  contract: "C",
  temporary: "T",
  volunteer: "V",
  internship: "I",
  remote: "",  // handled via f_WT=2 instead
  any: "",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const TIMEOUT_MS = 12000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Scrape public LinkedIn job search results.
 *
 * @param {Object} opts
 * @param {string} opts.keyword   - Job title / search keyword
 * @param {string} opts.location  - City, region, etc.
 * @param {string} opts.experience - One of the EXPERIENCE_MAP keys
 * @param {string} opts.jobType   - One of the JOBTYPE_MAP keys
 * @param {number} opts.page      - Page number (0-indexed; LinkedIn uses start=25*page)
 * @returns {Promise<{jobs: Array, blocked?: boolean, error?: string}>}
 */
async function scrapeLinkedInPublic({
  keyword,
  location = "Nagpur, India",
  experience = "any",
  jobType = "any",
  page = 0,
} = {}) {
  try {
    const params = new URLSearchParams();

    params.set("keywords", keyword || "");
    params.set("location", location || "");
    params.set("f_TPR", "r604800"); // last 7 days
    params.set("sortBy", "DD");      // newest first

    // Experience level
    const expCode = EXPERIENCE_MAP[experience];
    if (expCode) {
      params.set("f_E", expCode);
    }

    // Job type — remote is special (uses f_WT=2 instead of f_JT)
    if (jobType === "remote") {
      params.set("f_WT", "2");
    } else {
      const jtCode = JOBTYPE_MAP[jobType];
      if (jtCode) {
        params.set("f_JT", jtCode);
      }
    }

    // Pagination: LinkedIn uses ?start=N (25 results per page)
    const start = page * 25;
    if (start > 0) {
      params.set("start", String(start));
    }

    const url = `https://in.linkedin.com/jobs/search/?${params.toString()}`;

    console.log("[linkedinPublicScraper] fetching:", url);

    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: TIMEOUT_MS,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const now = Date.now();

    const jobs = [];

    // LinkedIn public job cards selector
    $(`ul.jobs-search__results-list > li`).each((_i, el) => {
      const $el = $(el);

      const title = $el.find("h3.base-search-card__title").text().trim();
      const company = $el.find("h4.base-search-card__subtitle a").text().trim();
      const locationText = $el.find("span.job-search-card__location").text().trim();
      const urlAttr = $el.find("a.base-card__full-link").attr("href") || "";

      const $time = $el.find("time[datetime]");
      const datetime = $time.attr("datetime") || "";
      const dateText = $time.text().trim() || datetime;

      // Skip if any required field is missing
      if (!title || !company || !urlAttr) return;

      // Filter: only jobs posted within the last 7 days
      if (datetime) {
        const postedMs = new Date(datetime).getTime();
        if (isNaN(postedMs) || now - postedMs > SEVEN_DAYS_MS) return;
      }

      jobs.push({
        title,
        company,
        location: locationText,
        postedAt: datetime,
        dateText,
        url: urlAttr.split("?")[0], // strip tracking params
      });
    });

    console.log(`[linkedinPublicScraper] found ${jobs.length} jobs`);

    return { jobs };
  } catch (error) {
    console.error("[linkedinPublicScraper] error:", error.message);

    // Detect blocked responses
    const status = error.response?.status;
    const isBlocked =
      status === 999 ||
      status === 429 ||
      (error.response?.data &&
        typeof error.response.data === "string" &&
        error.response.data.includes("security"));

    return {
      jobs: [],
      blocked: isBlocked || false,
      error: error.message,
    };
  }
}

module.exports = { scrapeLinkedInPublic };
