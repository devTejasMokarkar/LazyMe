// TODO: wrap in node-cache for 5-minute caching to avoid hammering sources

import { NextResponse } from "next/server";
import { scrapeIndeed } from "@/lib/scrapers/indeedScraper.js";
import { scrapeRemotive } from "@/lib/scrapers/remotiveScraper.js";
import { deduplicateJobs } from "@/lib/scrapers/utils.js";

/**
 * GET /api/jobs
 *
 * Unified job search endpoint that fans out to multiple scrapers in parallel,
 * merges and deduplicates the results, and returns a single JSON payload.
 *
 * Query params (all optional):
 *   q          – keyword           (default: "developer")
 *   l          – location          (default: "Nagpur, India")
 *   jobType    – filter            (default: "any")
 *   experience – level filter      (default: "any")
 *   sources    – comma-separated   (default: "indeed,remotive")
 *   page       – pagination index  (default: 0)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const keyword    = searchParams.get("q")          || "developer";
  const location   = searchParams.get("l")          || "Nagpur, India";
  const jobType    = searchParams.get("jobType")    || "any";
  const experience = searchParams.get("experience") || "any";
  const page       = parseInt(searchParams.get("page") || "0", 10);

  const sourcesParam = searchParams.get("sources") || "indeed,remotive";
  const sources = sourcesParam
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // ── Build parallel task list ──────────────────────────────────────────
  const taskMeta = []; // keeps source name aligned with Promise index
  const tasks    = [];

  if (sources.includes("indeed")) {
    taskMeta.push("indeed");
    tasks.push(scrapeIndeed({ keyword, location, jobType, experience, page }));
  }

  if (sources.includes("remotive")) {
    taskMeta.push("remotive");
    tasks.push(scrapeRemotive({ keyword, jobType }));
  }

  // ── Init per-source status tracking ───────────────────────────────────
  const sourceStatus = {
    indeed:   { status: sources.includes("indeed")   ? "pending" : "skipped", count: 0 },
    remotive: { status: sources.includes("remotive") ? "pending" : "skipped", count: 0 },
  };

  // Nothing to scrape
  if (tasks.length === 0) {
    sourceStatus.indeed.status   = "skipped";
    sourceStatus.remotive.status = "skipped";

    return NextResponse.json({
      jobs: [],
      count: 0,
      scrapedAt: new Date().toISOString(),
      page,
      sources: sourceStatus,
    });
  }

  // ── Run all scrapers in parallel ──────────────────────────────────────
  const results = await Promise.allSettled(tasks);

  let allJobs   = [];
  let allFailed = true;

  results.forEach((result, idx) => {
    const sourceName = taskMeta[idx];

    if (result.status === "fulfilled") {
      const value = result.value;

      // Indeed returns { jobs, blocked, error? }
      if (sourceName === "indeed") {
        if (value.blocked) {
          sourceStatus.indeed.status = "blocked";
          sourceStatus.indeed.count  = 0;
        } else if (value.error) {
          sourceStatus.indeed.status = "error";
          sourceStatus.indeed.count  = 0;
        } else {
          sourceStatus.indeed.status = "ok";
          sourceStatus.indeed.count  = Array.isArray(value.jobs) ? value.jobs.length : 0;
          allFailed = false;
        }
        if (Array.isArray(value.jobs)) {
          allJobs = allJobs.concat(value.jobs);
        }
      }

      // Remotive returns Job[] directly
      if (sourceName === "remotive") {
        const jobs = Array.isArray(value) ? value : [];
        sourceStatus.remotive.status = "ok";
        sourceStatus.remotive.count  = jobs.length;
        allJobs = allJobs.concat(jobs);
        allFailed = false;
      }
    } else {
      // Promise rejected
      sourceStatus[sourceName].status = "error";
      sourceStatus[sourceName].count  = 0;
      console.error(`[/api/jobs] ${sourceName} scraper rejected:`, result.reason);
    }
  });

  // ── Deduplicate & respond ─────────────────────────────────────────────
  const dedupedJobs = deduplicateJobs(allJobs);

  const status = allFailed ? 500 : 200;

  return NextResponse.json(
    {
      jobs: dedupedJobs,
      count: dedupedJobs.length,
      scrapedAt: new Date().toISOString(),
      page,
      sources: sourceStatus,
    },
    { status }
  );
}
