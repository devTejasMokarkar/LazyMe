"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Briefcase, MapPin, ExternalLink, Loader2,
  AlertCircle, DollarSign, Clock, ChevronDown, Inbox, RefreshCw, Linkedin,
  Sparkles, Check, Zap, Target, BarChart3, Brain
} from 'lucide-react';
import DirectMailToHR from '@/components/apply/DirectMailToHR';

interface IndeedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  postedAt: string;
  dateText: string;
  salary: string;
  jobType: string;
  experience: string;
}

interface SourceStatus {
  status: string;
  count: number;
}

interface JobsResponse {
  jobs: IndeedJob[];
  count: number;
  scrapedAt: string;
  page: number;
  sources: {
    indeed: SourceStatus;
    remotive: SourceStatus;
  };
}

interface AutoPilotJob {
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

interface AutoPilotResponse {
  keywords: string[];
  jobs: AutoPilotJob[];
  summary: {
    totalJobs: number;
    highMatch: number;
    mediumMatch: number;
    lowMatch: number;
    sourceCounts: Record<string, number>;
  };
}

const JOB_TYPE_OPTIONS = [
  { label: "Any Type", value: "any" },
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
  { label: "Contract", value: "contract" },
  { label: "Remote", value: "remote" },
];

const EXPERIENCE_OPTIONS = [
  { label: "Any Level", value: "any" },
  { label: "Entry Level", value: "entry-level" },
  { label: "Mid-Senior", value: "mid-senior" },
  { label: "Senior", value: "senior" },
];

const SOURCE_OPTIONS = ["Indeed", "Remotive", "Both"] as const;
type TabMode = 'linkedin' | 'indeed' | 'autopilot';

const JOB_TITLES = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "React Developer",
  "Node.js Developer",
  "Python Developer",
  "Java Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "UI/UX Designer",
  "Product Manager",
  "QA Engineer",
  "Mobile Developer",
  "Angular Developer",
  "Go Developer",
  "AI Engineer",
  "Data Analyst",
];

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Noida", "Gurgaon",
  "Nagpur", "Jaipur", "Lucknow", "Indore", "Bhopal",
  "Chandigarh", "Thane", "Surat", "Visakhapatnam", "Kochi",
  "Coimbatore", "Vadodara", "Agra", "Varanasi", "Patna",
  "Ranchi", "Bhubaneswar", "Guwahati", "Mysore", "Nashik",
];

function inferExperienceLevel(resume: any): string {
  const exp = Array.isArray(resume?.experience) ? resume.experience : [];
  const text = `${resume?.summary || ''} ${resume?.title || ''} ${exp.map((e: any) => `${e.duration || ''} ${e.role || ''}`).join(' ')}`.toLowerCase();
  const yearMatches: number[] = [];
  const yearRegex = /(\d+)\+?\s*(?:years|yrs|year|yr)/g;
  let match = yearRegex.exec(text);
  while (match) {
    const years = Number(match[1]);
    if (years) yearMatches.push(years);
    match = yearRegex.exec(text);
  }
  const maxYears = yearMatches.length ? Math.max(...yearMatches) : exp.length * 2;
  if (/\b(entry|fresher|intern|junior)\b/.test(text) || maxYears <= 1) return "entry-level";
  if (/\b(senior|lead|principal|architect|manager)\b/.test(text) || maxYears >= 5) return "senior";
  if (maxYears >= 2) return "mid-senior";
  return "any";
}

function inferJobType(resume: any): string {
  const text = `${resume?.summary || ''} ${resume?.title || ''} ${(resume?.skills || []).join(' ')}`.toLowerCase();
  if (/\b(remote|work from home|wfh)\b/.test(text)) return "remote";
  if (/\b(contract|freelance|consultant)\b/.test(text)) return "contract";
  if (/\b(part[-\s]?time)\b/.test(text)) return "part-time";
  if (/\b(full[-\s]?time|permanent)\b/.test(text)) return "full-time";
  return "full-time";
}

function normalizeResumeTitle(title: string): string {
  const clean = (title || '').trim();
  if (!clean) return "";
  const exact = JOB_TITLES.find((t) => t.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;
  const fuzzy = JOB_TITLES.find((t) => clean.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(clean.toLowerCase()));
  return fuzzy || clean;
}

function getDaysAgo(dateText: string): number {
  try {
    const iso = getIsoDate(dateText);
    if (!iso) return 10;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  } catch {
    return 10;
  }
}

function getIsoDate(dateText: string): string | null {
  try {
    const d = new Date(dateText);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function getDateBadgeClass(dateText: string): string {
  const days = getDaysAgo(dateText);
  if (days <= 1)
    return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
  if (days <= 4)
    return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
  return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600";
}

function getSourceBadgeClass(source: string): string {
  if (source === "indeed")
    return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
  if (source === "linkedin")
    return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
  return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
}

function buildIndeedUrl(params: { q: string; l: string; jobType: string; experience: string; sources: string; page: number }): string {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.l) p.set("l", params.l);
  if (params.jobType && params.jobType !== "any") p.set("jobType", params.jobType);
  if (params.experience && params.experience !== "any") p.set("experience", params.experience);
  if (params.sources && params.sources !== "both") p.set("sources", params.sources);
  if (params.page > 0) p.set("page", String(params.page));
  return `/api/jobs?${p.toString()}`;
}

function parseSourcesParam(val: string): string[] {
  if (val === "both") return ["both"];
  if (val === "indeed") return ["indeed"];
  if (val === "remotive") return ["remotive"];
  return ["both"];
}

function sourcesToParam(sources: string[]): string {
  if (sources.includes("both") || sources.length === 0) return "both";
  return sources.join(",");
}

function isLocationDisabled(sources: string[]): boolean {
  return sources.includes("indeed") || sources.includes("remotive");
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container border border-outline-variant/40 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-3 w-16 bg-surface-container-high rounded-full" />
        <div className="h-3 w-20 bg-surface-container-high rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-surface-container-high rounded mb-2" />
      <div className="h-4 w-1/2 bg-surface-container-high rounded mb-1" />
      <div className="h-4 w-2/5 bg-surface-container-high rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 bg-surface-container-high rounded-full" />
        <div className="h-8 w-28 bg-surface-container-high rounded-lg" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

function getMatchScoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
  if (score >= 40) return "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700";
  return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
}

export default function ApplyPage() {
  const [tab, setTab] = useState<TabMode>('indeed');

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("Nagpur, India");
  const [experience, setExperience] = useState("any");
  const [jobType, setJobType] = useState("any");

  const [indeedSources, setIndeedSources] = useState<string[]>(["both"]);
  const [indeedJobs, setIndeedJobs] = useState<IndeedJob[]>([]);
  const [isIndeedSearching, setIsIndeedSearching] = useState(false);
  const [isIndeedLoadingMore, setIsIndeedLoadingMore] = useState(false);
  const [indeedCount, setIndeedCount] = useState(0);
  const [indeedPage, setIndeedPage] = useState(0);
  const [indeedSourceStatus, setIndeedSourceStatus] = useState<{ indeed: SourceStatus; remotive: SourceStatus } | null>(null);
  const [indeedErrorMsg, setIndeedErrorMsg] = useState("");
  const [indeedBlocked, setIndeedBlocked] = useState(false);
  const [indeedAllFailed, setIndeedAllFailed] = useState(false);
  const [resumePrefill, setResumePrefill] = useState<{ title?: string; experience?: string; jobType?: string } | null>(null);
  const initialized = useRef(false);

  const locationDisabled = isLocationDisabled(indeedSources);
  const hasIndeedSearched = indeedJobs.length > 0 || isIndeedSearching || indeedErrorMsg || (indeedSourceStatus && !indeedSourceStatus.indeed.status?.startsWith("skipped") && !indeedSourceStatus.remotive.status?.startsWith("skipped"));

  const doIndeedFetch = useCallback(async (pg: number, append: boolean) => {
    const url = buildIndeedUrl({
      q: keyword, l: location, jobType, experience,
      sources: sourcesToParam(indeedSources), page: pg,
    });

    const res = await fetch(url);
    const data = (await res.json()) as JobsResponse & { message?: string };

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch jobs");
    }

    setIndeedJobs((prev) => (append ? [...prev, ...data.jobs] : data.jobs));
    setIndeedCount(data.count);
    setIndeedPage(pg);
    setIndeedSourceStatus(data.sources);

    const indeedStatus = data.sources?.indeed?.status;
    const remotiveStatus = data.sources?.remotive?.status;

    setIndeedBlocked(indeedStatus === "blocked");
    setIndeedAllFailed(
      indeedStatus !== "ok" && indeedStatus !== "skipped" &&
      remotiveStatus !== "ok" && remotiveStatus !== "skipped"
    );

    if (indeedStatus === "blocked" && remotiveStatus === "ok") {
      setIndeedErrorMsg("Indeed temporarily blocked. Showing Remotive results only. Try Indeed again in 2 min.");
    } else if (indeedStatus === "blocked" && remotiveStatus !== "ok") {
      setIndeedErrorMsg("Could not fetch jobs. Check your connection.");
    } else {
      setIndeedErrorMsg("");
    }
    return data;
  }, [keyword, location, jobType, experience, indeedSources]);

  const handleIndeedSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!keyword.trim()) return;
      setIsIndeedSearching(true);
      setIndeedJobs([]);
      setIndeedCount(0);
      setIndeedErrorMsg("");
      setIndeedBlocked(false);
      setIndeedAllFailed(false);
      setIndeedSourceStatus(null);
      doIndeedFetch(0, false).finally(() => setIsIndeedSearching(false));
    },
    [keyword, doIndeedFetch]
  );

  const handleIndeedLoadMore = useCallback(() => {
    setIsIndeedLoadingMore(true);
    doIndeedFetch(indeedPage + 1, true).finally(() => setIsIndeedLoadingMore(false));
  }, [indeedPage, doIndeedFetch]);

  const handleIndeedRetry = useCallback(() => {
    setIsIndeedSearching(true);
    setIndeedJobs([]);
    setIndeedCount(0);
    setIndeedErrorMsg("");
    setIndeedBlocked(false);
    setIndeedAllFailed(false);
    setIndeedSourceStatus(null);
    doIndeedFetch(0, false).finally(() => setIsIndeedSearching(false));
  }, [doIndeedFetch]);

  const [liPage, setLiPage] = useState(0);
  const [liJobs, setLiJobs] = useState<IndeedJob[]>([]);
  const [liCount, setLiCount] = useState(0);
  const [liIsSearching, setLiIsSearching] = useState(false);
  const [liIsLoadingMore, setLiIsLoadingMore] = useState(false);
  const [liBlocked, setLiBlocked] = useState(false);
  const [liErrorMsg, setLiErrorMsg] = useState("");

  const liGetDateBadgeClass = (dateText: string) => {
    let daysAgo: number;
    try {
      const days = (Date.now() - new Date(dateText).getTime()) / 86_400_000;
      daysAgo = Math.floor(days);
    } catch {
      daysAgo = 10;
    }
    if (daysAgo <= 2) return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
    if (daysAgo <= 5) return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
    return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600";
  };

  const doLiSearch = useCallback(async (reset: boolean, pg: number) => {
    if (!keyword.trim()) return;

    const url = `/api/linkedin-jobs?q=${encodeURIComponent(keyword.trim())}&l=${encodeURIComponent(location.trim())}&experience=${experience}&jobType=${jobType}&page=${pg}`;

    try {
      const isAppend = !reset;
      if (isAppend) {
        setLiIsLoadingMore(true);
      } else {
        setLiIsSearching(true);
        setLiPage(0);
      }
      setLiBlocked(false);
      setLiErrorMsg("");

      const res = await fetch(url);
      const data = await res.json();

      if (data.blocked) {
        setLiBlocked(true);
        setLiErrorMsg("LinkedIn temporarily blocked this request. Please wait 2–3 minutes and try again.");
        return;
      }

      setLiJobs((prev) => (reset || pg === 0 ? data.jobs : [...prev, ...data.jobs]));
      setLiCount(data.count);
      setLiPage(pg);
    } catch (e: any) {
      setLiErrorMsg(e.message || "An unexpected error occurred.");
    } finally {
      setLiIsSearching(false);
      setLiIsLoadingMore(false);
    }
  }, [keyword, location, experience, jobType]);

  const handleLiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLiSearch(true, 0);
  };

  const handleLiLoadMore = () => {
    doLiSearch(false, liPage + 1);
  };

  const handleLiRetry = () => {
    setLiBlocked(false);
    setLiErrorMsg("");
    setLiJobs([]);
    setLiPage(0);
    setLiCount(0);
  };

  useEffect(() => {
    if (tab !== 'indeed') return;
    if (!indeedCount && !isIndeedSearching) return;

    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.trim()) params.set("l", location.trim());
    if (jobType !== "any") params.set("jobType", jobType);
    if (experience !== "any") params.set("experience", experience);
    const sp = sourcesToParam(indeedSources);
    if (sp !== "both") params.set("sources", sp);

    const newUrl = params.toString() ? `/apply?tab=indeed&${params.toString()}` : "/apply?tab=indeed";
    window.history.replaceState(null, "", newUrl);
  }, [keyword, location, jobType, experience, indeedSources, indeedCount, isIndeedSearching, tab]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as TabMode | null;

    const q = params.get("q") || "";
    const l = params.get("l") || "";
    const jt = params.get("jobType") || "";
    const exp = params.get("experience") || "";
    const src = params.get("sources") || "";

    if (q) setKeyword(q);
    if (l) setLocation(l);
    if (jt) setJobType(jt);
    if (exp) setExperience(exp);

    if (tabParam === 'indeed' && q) {
      setTab('indeed');
      if (src) setIndeedSources(parseSourcesParam(src));
      setIsIndeedSearching(true);
      doIndeedFetch(0, false).finally(() => setIsIndeedSearching(false));
      return;
    }

    if (tabParam === 'linkedin') {
      setTab('linkedin');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasUrlFilters = params.has("q") || params.has("experience") || params.has("jobType");
    if (hasUrlFilters) return;

    fetch('/api/resumes')
      .then((r) => r.ok ? r.json() : [])
      .then((resumes) => {
        if (!Array.isArray(resumes) || resumes.length === 0) return;
        const primary = resumes.find((r: any) => r.isDefault) || resumes[0];
        const resume = primary?.content || {};
        const title = normalizeResumeTitle(resume.title || '');
        const inferredExperience = inferExperienceLevel(resume);
        const inferredJobType = inferJobType(resume);

        if (title) setKeyword(title);
        if (inferredExperience !== "any") setExperience(inferredExperience);
        if (inferredJobType !== "any") setJobType(inferredJobType);
        setResumePrefill({ title, experience: inferredExperience, jobType: inferredJobType });
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    if (tab === 'linkedin') {
      handleLiSubmit(e);
    } else {
      handleIndeedSubmit(e);
    }
  };

  const isSearching = tab === 'linkedin' ? liIsSearching : isIndeedSearching;

  // ── AUTO-PILOT STATE ─────────────────────────────────────────
  const [apKeywords, setApKeywords] = useState<string[]>([]);
  const [apJobs, setApJobs] = useState<AutoPilotJob[]>([]);
  const [apSummary, setApSummary] = useState<AutoPilotResponse['summary'] | null>(null);
  const [apIsSearching, setIsApSearching] = useState(false);
  const [apError, setApError] = useState("");
  const [apSelectedIds, setApSelectedIds] = useState<Set<string>>(new Set());
  const [apIsApplying, setIsApApplying] = useState(false);
  const [apApplyResults, setApApplyResults] = useState<any | null>(null);
  const [apHasResume, setApHasResume] = useState<boolean | null>(null);

  useEffect(() => {
    if (tab === 'autopilot' && apHasResume === null) {
      fetch('/api/resumes')
        .then((r) => r.json())
        .then((resumes) => {
          const hasResume = Array.isArray(resumes) && resumes.length > 0;
          setApHasResume(hasResume);
        })
        .catch(() => setApHasResume(false));
    }
  }, [tab, apHasResume]);

  const runAutoPilotSearch = async () => {
    setIsApSearching(true);
    setApError("");
    setApJobs([]);
    setApSummary(null);
    setApSelectedIds(new Set());
    setApApplyResults(null);

    try {
      const params = new URLSearchParams();
      if (jobType !== "any") params.set("jobType", jobType);
      if (experience !== "any") params.set("experience", experience);

      const res = await fetch(`/api/auto-pilot?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Auto-pilot search failed");
      }
      const data: AutoPilotResponse = await res.json();
      setApKeywords(data.keywords);
      setApJobs(data.jobs);
      setApSummary(data.summary);
    } catch (e: any) {
      setApError(e.message || "Auto-pilot search failed");
    } finally {
      setIsApSearching(false);
    }
  };

  const toggleApJobSelection = (id: string) => {
    setApSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleApSelectAll = () => {
    if (apSelectedIds.size === apJobs.length) {
      setApSelectedIds(new Set());
    } else {
      setApSelectedIds(new Set(apJobs.map((j) => j.id)));
    }
  };

  const runAutoPilotApply = async () => {
    const selectedJobs = apJobs.filter((j) => apSelectedIds.has(j.id));
    if (selectedJobs.length === 0) return;

    setIsApApplying(true);
    try {
      const res = await fetch("/api/auto-pilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: selectedJobs.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            url: j.url,
            source: j.source,
            salary: j.salary,
          })),
          sendEmails: false,
          generateCoverLetter: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Auto-pilot apply failed");
      }

      const data = await res.json();
      setApApplyResults(data);
    } catch (e: any) {
      setApError(e.message || "Apply failed");
    } finally {
      setIsApApplying(false);
    }
  };

  const renderIndeedJobCard = (job: IndeedJob, idx: number) => (
    <div
      key={`${job.id}-${job.url}-${idx}`}
      className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:border-outline-variant hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 animate-fade-in group"
      style={{ animationDelay: `${(idx % 10) * 50}ms`, animationFillMode: "both" }}
    >
      <div className="flex justify-end mb-2">
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSourceBadgeClass(job.source)}`}
        >
          {job.source === "indeed" ? "Indeed" : "Remotive"}
        </span>
      </div>
      <h3 className="text-base font-semibold text-on-background mb-1 leading-snug">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
          {job.title}
        </a>
      </h3>
      <p className="text-sm text-on-surface-variant mb-1">
        <Briefcase className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        {job.company}
      </p>
      <p className="text-sm text-on-surface-variant mb-3">
        {job.location.toLowerCase().includes("remote") ? (
          <><MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> Remote</>
        ) : (
          <><MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />{job.location}</>
        )}
      </p>
      {job.salary && (
        <p className="text-sm text-on-surface-variant mb-3">
          <DollarSign className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          {job.salary}
        </p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${getDateBadgeClass(job.dateText)}`}>
          <Clock className="w-3 h-3" />
          {job.dateText}
        </span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
        >
          View Job <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );

  const renderIndeedSourcePills = () => {
    if (!indeedSourceStatus) return null;
    const { indeed, remotive } = indeedSourceStatus;

    const pillClass = (color: string) =>
      `inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
        color === "green"
          ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
          : color === "amber"
          ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700"
          : "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600"
      }`;

    const makePill = (name: string, src: SourceStatus) => {
      if (src.status === "skipped")
        return <span key={name} className={pillClass("gray")}>{name}: skipped</span>;
      if (src.status === "ok")
        return (
          <span key={name} className={pillClass("green")}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {name}: {src.count} jobs
          </span>
        );
      if (src.status === "blocked")
        return (
          <span key={name} className={pillClass("amber")}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {name}: blocked — retrying
          </span>
        );
      return <span key={name} className={pillClass("gray")}>{name}: 0 jobs</span>;
    };

    return (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {makePill("Indeed", indeed)}
        {makePill("Remotive", remotive)}
        <span className="text-xs text-on-surface-variant ml-2">
          {indeedCount} jobs found · sorted by newest
        </span>
      </div>
    );
  };

  const TABS: { key: TabMode; label: string; icon: any }[] = [
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { key: 'indeed', label: 'Indeed/Remotive', icon: Search },
    { key: 'autopilot', label: 'Auto-Pilot', icon: Sparkles },
  ];

  // ── Auto-Pilot render ───────────────────────────────────────
  const renderAutoPilotTab = () => {
    if (apHasResume === false) {
      return (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
          <h3 className="text-lg font-semibold text-on-background mb-2">No Resume Found</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            Upload your resume first to enable AI-powered job discovery and auto-apply.
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Resume keywords & controls */}
        <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-on-background">AI Auto-Pilot</h3>
            </div>
            <button
              onClick={runAutoPilotSearch}
              disabled={apIsSearching}
              className="flex items-center gap-2 h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-on-primary font-medium text-sm hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
            >
              {apIsSearching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Start Auto-Pilot</>
              )}
            </button>
          </div>

          {apKeywords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-on-surface-variant">Keywords:</span>
              {apKeywords.map((kw) => (
                <span
                  key={kw}
                  className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {apError && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{apError}</p>
          </div>
        )}

        {/* Summary bar */}
        {apSummary && !apIsSearching && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {apSummary.totalJobs} jobs found
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
              {apSummary.highMatch} high match
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
              {apSummary.mediumMatch} medium match
            </span>
            {Object.entries(apSummary.sourceCounts).map(([src, count]) => (
              count > 0 && (
                <span key={src} className="inline-flex items-center gap-1 text-xs text-on-surface-variant">
                  {src}: {count}
                </span>
              )
            ))}
          </div>
        )}

        {/* Apply results */}
        {apApplyResults && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Applications Prepared</h3>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-green-700 dark:text-green-400">
                {apApplyResults.summary?.successful || 0} ready
              </span>
              <span className="text-green-700 dark:text-green-400">
                Avg ATS: {apApplyResults.summary?.averageAtsScore || 0}%
              </span>
            </div>
          </div>
        )}

        {/* Batch controls */}
        {apJobs.length > 0 && !apIsSearching && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleApSelectAll}
                className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                {apSelectedIds.size === apJobs.length ? "Deselect All" : "Select All"}
              </button>
              <span className="text-xs text-on-surface-variant">
                {apSelectedIds.size} of {apJobs.length} selected
              </span>
            </div>
            <button
              onClick={runAutoPilotApply}
              disabled={apSelectedIds.size === 0 || apIsApplying}
              className="flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md"
            >
              {apIsApplying ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
              ) : (
                <><Zap className="w-3.5 h-3.5" /> Apply to {apSelectedIds.size}</>
              )}
            </button>
          </div>
        )}

        {/* Results grid */}
        {apIsSearching && <SkeletonGrid />}

        {!apIsSearching && apJobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apJobs.map((job, idx) => {
              const isSelected = apSelectedIds.has(job.id);
              return (
                <div
                  key={job.id}
                  onClick={() => toggleApJobSelection(job.id)}
                  className={`bg-surface-container border rounded-xl p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-outline-variant/50 hover:border-outline-variant hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSourceBadgeClass(job.source)}`}>
                      {job.source === "indeed" ? "Indeed" : job.source === "linkedin" ? "LinkedIn" : "Remotive"}
                    </span>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-outline-variant"
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-on-primary" />}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-on-background mb-1 leading-snug">
                    {job.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-1">
                    <Briefcase className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {job.company}
                  </p>
                  <p className="text-sm text-on-surface-variant mb-2">
                    <MapPin className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {job.location.toLowerCase().includes("remote") ? "Remote" : job.location}
                  </p>

                  {job.matchFactors.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {job.matchFactors.slice(0, 3).map((f) => (
                        <div key={f.label} className="flex items-center gap-1">
                          <span className="text-[10px] text-on-surface-variant">{f.label}</span>
                          <div className="w-12 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                f.score >= 70 ? "bg-green-500" : f.score >= 40 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${f.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${getMatchScoreColor(job.matchScore)}`}>
                      <Target className="w-3 h-3" />
                      {job.matchScore}% match
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${getDateBadgeClass(job.dateText)}`}>
                        <Clock className="w-3 h-3" />
                        {job.dateText}
                      </span>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!apIsSearching && apJobs.length === 0 && !apError && apHasResume && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
            <p className="text-sm text-on-surface-variant mb-2">Ready to discover your next role</p>
            <p className="text-xs text-on-surface-variant/60">
              Click &quot;Start Auto-Pilot&quot; to search all sources and find matching jobs
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="scrollable-page bg-background px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-on-background">Job Search</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">Search roles, email HR, and run auto-pilot from one workspace.</p>
          </div>
          {resumePrefill && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Prefilled from resume
            </span>
          )}
        </div>

        <div className="mb-4 rounded-lg border border-outline-variant/50 bg-surface-container p-3 shadow-sm">
          <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Job Title <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                required
                list="job-title-suggestions"
                placeholder="Job title"
                autoComplete="organization-title"
                className="h-10 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
              />
              <datalist id="job-title-suggestions">
                {JOB_TITLES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                list="city-suggestions"
                placeholder="City"
                autoComplete="address-level2"
                disabled={tab === 'indeed' && locationDisabled}
                title={tab === 'indeed' && locationDisabled ? "Disabled when Indeed/Remotive is selected (remote-only)" : ""}
                className={`h-10 w-full rounded-md border px-3 text-sm ${
                  tab === 'indeed' && locationDisabled
                    ? "bg-surface-container-high/50 text-on-surface-variant/50 cursor-not-allowed"
                    : "bg-background text-on-background"
                } border-outline-variant`}
              />
              <datalist id="city-suggestions">
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Experience</label>
              <div className="relative">
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="h-10 w-full rounded-md border border-outline-variant bg-background px-3 pr-8 text-sm text-on-background cursor-pointer appearance-none"
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Type</label>
              <div className="relative">
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="h-10 w-full rounded-md border border-outline-variant bg-background px-3 pr-8 text-sm text-on-background cursor-pointer appearance-none"
                >
                  {JOB_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-outline-variant pointer-events-none" />
              </div>
            </div>
            <div className="flex items-end md:col-span-1">
              <button
                type="submit"
                disabled={isSearching || !keyword.trim()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary shadow-[0_4px_14px_rgba(61,82,160,0.25)] transition-all hover:bg-primary/90 disabled:opacity-50"
                title="Search jobs"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="sr-only">Search Jobs</span>
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      tab === t.key
                        ? 'bg-primary text-on-primary'
                        : 'bg-background text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant/70">
              {tab === 'indeed' && (
                <span>{locationDisabled ? "Remote only: location disabled" : "Indeed and Remotive results"}</span>
              )}
            </div>
          </div>
          </form>
        </div>

        <div className="mb-4">
          <DirectMailToHR jobTitle={keyword} />
        </div>

        {tab === 'linkedin' && (
          <>
            {liBlocked && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-300">{liErrorMsg}</p>
                  <button
                    onClick={handleLiRetry}
                    className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            )}

            {!liBlocked && liErrorMsg && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-300">{liErrorMsg}</p>
                  <button
                    onClick={handleLiRetry}
                    className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            )}

            {liIsSearching && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-on-surface-variant">Searching LinkedIn...</p>
              </div>
            )}

            {!liIsSearching && liCount > 0 && (
              <>
                <p className="text-xs text-on-surface-variant mb-3">
                  Found <span className="font-medium">{liCount}</span> jobs for{' '}
                  <span className="font-medium">&apos;{keyword}&apos;</span> in{' '}
                  <span className="font-medium">{location}</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {liJobs.map((job, idx) => (
                    <div
                      key={`${job.url}-${idx}`}
                      className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:border-outline-variant transition-colors"
                    >
                      <h3 className="text-base font-semibold text-on-background mb-1">
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
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
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${liGetDateBadgeClass(job.dateText)}`}>
                          <Clock className="w-3 h-3" />
                          {job.dateText}
                        </span>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> View Job
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mb-8">
                  <button
                    onClick={handleLiLoadMore}
                    disabled={liIsLoadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high disabled:opacity-50 transition-colors"
                  >
                    {liIsLoadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              </>
            )}

            {!liIsSearching && !liBlocked && !liErrorMsg && (liJobs?.length ?? 0) === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No jobs found. Try a broader keyword or different location.</p>
              </div>
            )}
          </>
        )}

        {tab === 'indeed' && (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-1 bg-surface-container-high/60 border border-outline-variant rounded-lg p-1">
                {SOURCE_OPTIONS.map((opt) => {
                  const active = indeedSources.includes(opt.toLowerCase());
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setIndeedSources([opt.toLowerCase()])}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                        active
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant hover:text-on-background hover:bg-surface-container/60"
                      }`}
                    >
                      {active ? "\u2713 " : ""}{opt}
                    </button>
                  );
                })}
              </div>
              {locationDisabled && (
                <span className="text-[10px] text-on-surface-variant/60">Remote only — location disabled</span>
              )}
            </div>

            {indeedBlocked && indeedSourceStatus?.remotive.count! > 0 && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Indeed temporarily blocked. Showing Remotive results only. Try Indeed again in 2 min.
                  </p>
                  <button onClick={handleIndeedRetry} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Indeed
                  </button>
                </div>
              </div>
            )}

            {indeedAllFailed && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg px-4 py-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-300">Could not fetch jobs. Check your connection.</p>
                  <button onClick={handleIndeedRetry} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:underline">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </button>
                </div>
              </div>
            )}

            {isIndeedSearching && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-on-surface-variant">Searching Indeed & Remotive...</p>
              </div>
            )}

            {!isIndeedSearching && indeedSourceStatus && !indeedAllFailed && hasIndeedSearched && (
              <div className="mb-4">{renderIndeedSourcePills()}</div>
            )}

            {!isIndeedSearching && indeedCount > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {indeedJobs.map((job, idx) => renderIndeedJobCard(job, idx))}
                </div>

                {indeedJobs.length < indeedCount && (
                  <div className="flex justify-center mt-6 mb-8">
                    <button
                      onClick={handleIndeedLoadMore}
                      disabled={isIndeedLoadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant text-sm font-medium hover:bg-surface-container-high disabled:opacity-50 transition-colors"
                    >
                      {isIndeedLoadingMore ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                      ) : (
                        "Load More"
                      )}
                    </button>
                    <span className="ml-4 text-xs text-on-surface-variant/70 items-center flex">
                      Showing {indeedJobs.length} of {indeedCount} jobs
                    </span>
                  </div>
                )}

                {indeedJobs.length >= indeedCount && indeedJobs.length > 0 && (
                  <p className="text-center text-xs text-on-surface-variant/50 py-4">All {indeedCount} jobs loaded</p>
                )}
              </>
            )}

            {!isIndeedSearching && !indeedErrorMsg && !indeedBlocked && indeedCount === 0 && hasIndeedSearched && (
              <div className="text-center py-16">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
                <p className="text-sm text-on-surface-variant mb-5">No jobs found</p>
                <div className="flex flex-wrap items-center gap-2 justify-center text-xs text-on-surface-variant/70">
                  <span className="opacity-60">Suggestions:</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/50">Try a broader keyword</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/50">Remove filters</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high/60 border border-outline-variant/50">Check both sources</span>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'autopilot' && renderAutoPilotTab()}
      </div>
    </div>
  );
}
