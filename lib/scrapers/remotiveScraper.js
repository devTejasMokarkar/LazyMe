// Remotive free API docs: https://remotive.com/api/remote-jobs

import axios from "axios";
import { normalizeJob, isWithin7Days, formatDateText } from "./utils.js";

/**
 * Scrapes job listings from the Remotive public JSON API.
 * 
 * @param {Object} params - The scraping parameters.
 * @param {string} [params.keyword] - The search keyword (e.g. "developer").
 * @param {string} [params.jobType] - The job category/type (e.g. "software-development").
 * @returns {Promise<import('./types').Job[]>} A list of normalized and filtered jobs.
 */
export async function scrapeRemotive({ keyword, jobType } = {}) {
  try {
    let url = "https://remotive.com/api/remote-jobs?limit=50";
    if (keyword) {
      url += `&search=${encodeURIComponent(keyword)}`;
    }
    if (jobType && jobType !== "any") {
      url += `&category=${encodeURIComponent(jobType)}`;
    }

    const response = await axios.get(url, { timeout: 10000 });

    if (!response.data || !Array.isArray(response.data.jobs)) {
      return [];
    }

    const normalizedJobs = response.data.jobs
      .filter(job => job && isWithin7Days(job.publication_date))
      .map(job => {
        const raw = {
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || "Remote",
          url: job.url,
          postedAt: job.publication_date,
          dateText: formatDateText(job.publication_date),
          salary: job.salary || "",
          jobType: job.job_type || ""
        };
        return normalizeJob(raw, "remotive");
      })
      .filter(job => job !== ""); // remove invalid entries

    return normalizedJobs;
  } catch (error) {
    console.error("Error scraping Remotive:", error.message || error);
    return [];
  }
}
