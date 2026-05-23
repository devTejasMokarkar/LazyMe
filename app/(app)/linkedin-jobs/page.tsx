"use client";

import { useState, useCallback } from "react";
import { Search, Briefcase, MapPin, ExternalLink, Loader2, AlertTriangle, RefreshCw, Clock } from "lucide-react";

interface LinkedInJob {
  title: string;
  company: string;
  location: string;
  postedAt: string;
  dateText: string;
  url: string;
}

const EXPERIENCE_OPTIONS = [
  { label: "Any Level", value: "any" },
  { label: "Internship", value: "internship" },
  { label: "Entry Level", value: "entry" },
  { label: "Associate", value: "associate" },
  { label: "Mid-Senior", value: "mid-senior" },
  { label: "Director", value: "director" },
  { label: "Executive", value: "executive" },
];

const JOBTYPE_OPTIONS = [
  { label: "Any Type", value: "any" },
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
  { label: "Contract", value: "contract" },
  { label: "Temporary", value: "temporary" },
  { label: "Volunteer", value: "volunteer" },
  { label: "Internship", value: "internship" },
  { label: "Remote", value: "remote" },
];

function getDateBadgeClass(dateText: string): string {
  let daysAgo: number;
  try {
    const days = (Date.now() - new Date(dateText).getTime()) / (86_400_000);
    daysAgo = Math.floor(days);
  } catch {
    daysAgo = 10;
  }

  if (daysAgo <= 2) return "bg-green-100 text-green-700 border-green-300";
  if (daysAgo <= 5) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-gray-100 text-gray-600 border-gray-300";
}

export default function LinkedInJobsPage() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("Nagpur, India");
  const [experience, setExperience] = useState("any");
  const [jobType, setJobType] = useState("any");
  const [page, setPage] = useState(0);

  const [jobs, setJobs] = useState<LinkedInJob[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [count, setCount] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const doSearch = useCallback(
    async (reset: boolean, pg: number) => {
      if (!keyword.trim()) return;

      const url = `/api/linkedin-jobs?q=${encodeURIComponent(keyword.trim())}&l=${encodeURIComponent(location.trim())}&experience=${experience}&jobType=${jobType}&page=${pg}`;

      try {
        const isAppend = !reset;
        if (isAppend) {
          setIsLoadingMore(true);
        } else {
          setIsSearching(true);
          setPage(0);
        }
        setBlocked(false);
        setErrorMsg("");

        const res = await fetch(url);
        const data = await res.json();

        if (data.blocked) {
          setBlocked(true);
          setErrorMsg("LinkedIn temporarily blocked this request. Please wait 2–3 minutes and try again.");
          return;
        }

        setJobs((prev) => (reset || pg === 0 ? data.jobs : [...prev, ...data.jobs]));
        setCount(data.count);
        setPage(pg);
      } catch (e: any) {
        setErrorMsg(e.message || "An unexpected error occurred.");
      } finally {
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    },
    [keyword, location, experience, jobType]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(true, 0);
  };

  const handleLoadMore = () => {
    doSearch(false, page + 1);
  };

  const handleRetry = () => {
    setBlocked(false);
    setErrorMsg("");
    setJobs([]);
    setPage(0);
    setCount(0);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-on-background">LinkedIn Job Search</h1>
          <p className="text-sm text-on-surface-variant mt-1">Jobs posted in the last 7 days</p>
        </div>

        {/* ── Filter Form ───────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 mb-6 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
            {/* Job Title */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Title</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. React Developer"
                required
                className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Location */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Nagpur, India"
                className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Experience */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Experience Level</label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer"
              >
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Job Type */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer"
              >
                {JOBTYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSearching || !keyword.trim()}
              className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-primary text-on-primary font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Search Jobs
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Error: blocked ────────────────────────────────── */}
        {blocked && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 dark:text-amber-300">{errorMsg}</p>
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Error: other ───────────────────────────────────── */}
        {!blocked && errorMsg && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{errorMsg}</p>
              <button
                onClick={handleRetry}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────── */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-on-surface-variant">Searching LinkedIn…</p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────── */}
        {!isSearching && count > 0 && (
          <>
            <p className="text-xs text-on-surface-variant mb-3">
              Found <span className="font-medium text-on-surface-variant">{count}</span> jobs for{" "}
              <span className="font-medium text-on-surface-variant">&apos;{keyword}&apos;</span> in{" "}
              <span className="font-medium text-on-surface-variant">{location}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {jobs.map((job, idx) => {
                const badgeClass = getDateBadgeClass(job.dateText);
                return (
                  <div
                    key={`${job.url}-${idx}`}
                    className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:border-outline-variant transition-colors"
                  >
                    <h3 className="text-base font-semibold text-on-background mb-1">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {job.title}
                      </a>
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-3">
                      <Briefcase className="w-3.5 h-3.5 inline mr-1" />
                      {job.company}
                      {"  ·  "}
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      {job.location}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${badgeClass}`}>
                        <Clock className="w-3 h-3" />
                        {job.dateText}
                      </span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Job
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ────────────────────────────────── */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high disabled:opacity-50 transition-colors"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </>
                ) : (
                  "Load More"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!isSearching && !blocked && !errorMsg && jobs.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No jobs found. Try a broader keyword or different location.</p>
          </div>
        )}
      </div>
    </div>
  );
}
