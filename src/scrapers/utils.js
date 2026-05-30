/**
 * Normalizes a raw job object from any scraper into a unified Job object.
 * 
 * @param {Object} raw - The raw job data from a scraper.
 * @param {string} source - The job source ("indeed" | "remotive").
 * @returns {import('./types').Job|string} A Job object with all fields filled, or an empty string if invalid.
 */
export function normalizeJob(raw, source) {
  if (!raw || typeof raw !== 'object' || !raw.url || !raw.title || !raw.company) {
    return "";
  }
  try {
    const urlHash = typeof btoa === 'function'
      ? btoa(raw.url).slice(0, 12)
      : Buffer.from(raw.url).toString('base64').slice(0, 12);
      
    return {
      id: `${source || ""}_${urlHash}`,
      title: raw.title || "",
      company: raw.company || "",
      location: raw.location || "",
      source: source || "",
      url: raw.url || "",
      postedAt: raw.postedAt || "",
      dateText: raw.dateText || "",
      salary: raw.salary || "",
      jobType: raw.jobType || "",
      experience: raw.experience || ""
    };
  } catch (err) {
    return "";
  }
}

/**
 * Checks if an ISO 8601 date string is within the last 7 days.
 * 
 * @param {string} isoDateString - The ISO 8601 date string to check.
 * @returns {boolean} True if the date is within the last 7 days, false otherwise.
 */
export function isWithin7Days(isoDateString) {
  if (!isoDateString) return false;
  const date = new Date(isoDateString);
  const time = date.getTime();
  if (isNaN(time)) return false;

  const now = new Date();
  const diffTime = now.getTime() - time;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  // Within the last 7 days (with 1 day buffer in the future for timezone offsets)
  return diffDays >= -1 && diffDays <= 7;
}

/**
 * Deduplicates an array of jobs by their unique job id, keeping the first occurrence,
 * and sorts the unique list by postedAt in descending order (newest first).
 * 
 * @param {import('./types').Job[]} jobsArray - An array of Job objects to deduplicate and sort.
 * @returns {import('./types').Job[]} A new array of unique Job objects sorted by date descending.
 */
export function deduplicateJobs(jobsArray) {
  if (!Array.isArray(jobsArray)) return [];

  const seen = new Set();
  const uniqueJobs = [];

  for (const job of jobsArray) {
    if (job && job.id && !seen.has(job.id)) {
      seen.add(job.id);
      uniqueJobs.push(job);
    }
  }

  return uniqueJobs.sort((a, b) => {
    const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;

    const valA = isNaN(timeA) ? 0 : timeA;
    const valB = isNaN(timeB) ? 0 : timeB;

    return valB - valA;
  });
}

/**
 * Returns a headers object for axios requests to mimic a modern browser request.
 * 
 * @returns {Object} An object containing the User-Agent, Accept-Language, and Accept headers.
 */
export function getHeaders() {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  };
}

/**
 * Formats an ISO 8601 date string into a relative human-readable label or the date string itself.
 * 
 * @param {string} isoDateString - The ISO date string to format.
 * @returns {string} "Today", "Yesterday", "X days ago", the date string, or "" for invalid input.
 */
export function formatDateText(isoDateString) {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays > 1) {
    return `${diffDays} days ago`;
  }

  return isoDateString;
}
