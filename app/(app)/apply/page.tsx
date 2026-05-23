"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Briefcase, MapPin, ExternalLink, Eye, Loader2, Sparkles, X, Zap,
  Target, TrendingUp, AlertCircle, DollarSign, Clock, ChevronDown, Filter, Inbox, RefreshCw, Linkedin
} from 'lucide-react';

// ── Old search types ──────────────────────────────────────────────
interface Job {
  title: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  skills: string[];
  postedOn: string;
  url: string;
  matchScore?: number;
  matchAnalysis?: {
    strengths: string[];
    gaps: string[];
    missingSkills: string[];
    recommendation: string;
    shouldApply: boolean;
  };
  [key: string]: any;
}

interface ResumeData {
  title?: string;
  skills?: string[];
  location?: string;
  experience?: Array<{ role?: string; company?: string }>;
}

// ── Indeed/Remotive types ─────────────────────────────────────────
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
type TabMode = 'manual' | 'ai' | 'linkedin' | 'indeed';

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
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Noida",
  "Gurgaon",
  "Nagpur",
  "Jaipur",
  "Lucknow",
  "Indore",
  "Bhopal",
  "Chandigarh",
  "Thane",
  "Surat",
  "Visakhapatnam",
  "Kochi",
  "Coimbatore",
  "Vadodara",
  "Agra",
  "Varanasi",
  "Patna",
  "Ranchi",
  "Bhubaneswar",
  "Guwahati",
  "Mysore",
  "Nashik",
];

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
  return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
}

function readUrlParams() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") || "",
    l: params.get("l") || "Nagpur, India",
    jobType: params.get("jobType") || "any",
    experience: params.get("experience") || "any",
    sources: params.get("sources") || "both",
  };
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

export default function ApplyPage() {
  const [tab, setTab] = useState<TabMode>('ai');

  // ── Old search state ────────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debugJob, setDebugJob] = useState<number | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [showAutoSearch, setShowAutoSearch] = useState(true);

  // ── Indeed/Remotive state ───────────────────────────────────────
  const [indeedKeyword, setIndeedKeyword] = useState("");
  const [indeedLocation, setIndeedLocation] = useState("Nagpur, India");
  const [indeedJobType, setIndeedJobType] = useState("any");
  const [indeedExperience, setIndeedExperience] = useState("any");
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const initialized = useRef(false);

  const locationDisabled = isLocationDisabled(indeedSources);
  const hasSearched = indeedJobs.length > 0 || isIndeedSearching || indeedErrorMsg || (indeedSourceStatus && !indeedSourceStatus.indeed.status?.startsWith("skipped") && !indeedSourceStatus.remotive.status?.startsWith("skipped"));

  useEffect(() => {
    if (tab === 'ai' || tab === 'manual') fetchResumeData();
  }, [tab]);

  const fetchResumeData = async () => {
    try {
      const res = await fetch('/api/user/resume');
      if (res.ok) {
        const data = await res.json();
        setResumeData(data);
      }
    } catch (e) {
      console.log('No resume data found');
    }
  };

  // ── Old search: autoSearch (AI) ─────────────────────────────────
  const autoSearch = async () => {
    if (!resumeData?.title && !resumeData?.skills?.length) {
      setStatus('No resume data found. Please fill in your resume first.');
      setIsError(true);
      setShowAutoSearch(false);
      return;
    }

    setIsSearching(true);
    setStatus('Analyzing your resume and finding the most relevant jobs...');

    try {
      const response = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData,
          minSalary: minSalary || undefined,
          maxSalary: maxSalary || undefined,
          expFilter: expFilter || undefined,
          useAI: true
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'UPGRADE_REQUIRED') {
          if (result.jobs && result.jobs.length > 0) {
            setJobs(result.jobs);
            setStatus(`Found ${result.jobs.length} jobs. Note: ${result.message || 'Search limit reached, showing available results.'}`);
            setIsError(false);
            return;
          }
          if (result.suggestion === 'manual') {
            setStatus('Apify free tier limit reached. Try manual search below with the same keywords.');
            setTab('manual');
            setKeyword(result.searchKeyword || '');
            setIsError(false);
            return;
          }
          setStatus('Apify search limit reached. Try manual search below or wait a few minutes before retrying.');
          setIsError(true);
          return;
        }
        throw new Error(result.error || 'Search failed');
      }

      setJobs(result.jobs);
      const aiMsg = result.expandedKeywords?.length > 0
        ? `Found ${result.jobs.length} jobs using AI-enhanced search`
        : `Found ${result.jobs.length} relevant jobs for your profile!`;
      setStatus(aiMsg);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
      setIsError(true);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Old search: manualSearch ────────────────────────────────────
  const manualSearch = async () => {
    if (!keyword.trim()) {
      setStatus('Please enter a job title or keyword.');
      setIsError(true);
      return;
    }

    setIsSearching(true);
    setStatus('Searching for jobs...');

    try {
      const response = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          location: location.trim(),
          minSalary: minSalary || undefined,
          maxSalary: maxSalary || undefined,
          expFilter: expFilter || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'UPGRADE_REQUIRED') {
          if (result.jobs && result.jobs.length > 0) {
            setJobs(result.jobs);
            setStatus(`Found ${result.jobs.length} jobs. Note: Search limit reached.`);
            setIsError(false);
            return;
          }
          setStatus('Job search limit reached. Please try again in a few minutes.');
          setIsError(true);
          return;
        }
        throw new Error(result.error || 'Search failed');
      }

      setJobs(result.jobs);
      setStatus(`Found ${result.jobs.length} jobs.`);
      setIsError(false);
    } catch (e: any) {
      setStatus('Error: ' + e.message);
      setIsError(true);
    } finally {
      setIsSearching(false);
    }
  };

  const escHtml = (str: string) => {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const extractUrl = (job: Job) => {
    const candidates = [
      job.url, job.jobUrl, job.link, job.applyUrl, job.applyLink,
      job.jobLink, job.detailUrl, job.pageUrl, job.href,
      job.externalApplyLink, job.applyNowLink, job.redirectUrl
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.startsWith('http')) return c;
    }
    if (job.jdURL) return job.jdURL;
    if (job.jobId) return `https://www.naukri.com/job-listings-${job.jobId}`;
    return null;
  };

  const toggleDebug = (idx: number) => {
    setDebugJob(debugJob === idx ? null : idx);
  };

  const getDebugInfo = (job: Job) => {
    return JSON.stringify(
      Object.keys(job).reduce((acc: any, k) => {
        const v = job[k];
        if (typeof v === 'string' && v.startsWith('http')) acc[k] = v;
        else if (k.toLowerCase().includes('url') || k.toLowerCase().includes('link') || k.toLowerCase().includes('id')) acc[k] = v;
        return acc;
      }, {}),
      null,
      2
    );
  };

  const openUpgrade = () => {
    window.open('https://console.apify.com/billing/subscription', '_blank');
  };

  // ── Indeed/Remotive fetch ───────────────────────────────────────
  const doIndeedFetch = useCallback(async (pg: number, append: boolean) => {
    const url = buildIndeedUrl({
      q: indeedKeyword,
      l: indeedLocation,
      jobType: indeedJobType,
      experience: indeedExperience,
      sources: sourcesToParam(indeedSources),
      page: pg,
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
  }, [indeedKeyword, indeedLocation, indeedJobType, indeedExperience, indeedSources]);

  const handleIndeedSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!indeedKeyword.trim()) return;
      setIsIndeedSearching(true);
      setIndeedJobs([]);
      setIndeedCount(0);
      setIndeedErrorMsg("");
      setIndeedBlocked(false);
      setIndeedAllFailed(false);
      setIndeedSourceStatus(null);

      doIndeedFetch(0, false).finally(() => setIsIndeedSearching(false));
    },
    [indeedKeyword, indeedLocation, indeedJobType, indeedExperience, indeedSources, doIndeedFetch]
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

  const handleSourceClick = (val: string) => {
    setIndeedSources([val]);
  };

  // ── LinkedIn state ──────────────────────────────────────────────
  const [liKeyword, setLiKeyword] = useState("");
  const [liLocation, setLiLocation] = useState("Nagpur, India");
  const [liExperience, setLiExperience] = useState("any");
  const [liJobType, setLiJobType] = useState("any");
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
    if (!liKeyword.trim()) return;

    const url = `/api/linkedin-jobs?q=${encodeURIComponent(liKeyword.trim())}&l=${encodeURIComponent(liLocation.trim())}&experience=${liExperience}&jobType=${liJobType}&page=${pg}`;

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
  }, [liKeyword, liLocation, liExperience, liJobType]);

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

  // ── URL sync for Indeed/Remotive ────────────────────────────────
  useEffect(() => {
    if (tab !== 'indeed') return;
    if (!indeedCount && !isIndeedSearching) return;

    const params = new URLSearchParams();
    if (indeedKeyword.trim()) params.set("q", indeedKeyword.trim());
    if (indeedLocation.trim()) params.set("l", indeedLocation.trim());
    if (indeedJobType !== "any") params.set("jobType", indeedJobType);
    if (indeedExperience !== "any") params.set("experience", indeedExperience);
    const sp = sourcesToParam(indeedSources);
    if (sp !== "both") params.set("sources", sp);

    const newUrl = params.toString() ? `/apply?tab=indeed&${params.toString()}` : "/apply?tab=indeed";
    window.history.replaceState(null, "", newUrl);
  }, [indeedKeyword, indeedLocation, indeedJobType, indeedExperience, indeedSources, indeedCount, isIndeedSearching, tab]);

  // ── Auto-run Indeed from URL params on mount ────────────────────
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

    if (tabParam === 'indeed' && q) {
      setTab('indeed');
      setIndeedKeyword(q);
      if (l) setIndeedLocation(l);
      if (jt) setIndeedJobType(jt);
      if (exp) setIndeedExperience(exp);
      if (src) setIndeedSources(parseSourcesParam(src));
      setIsIndeedSearching(true);
      doIndeedFetch(0, false).finally(() => setIsIndeedSearching(false));
      return;
    }

    if (tabParam === 'ai' || tabParam === 'manual') {
      setTab(tabParam);
    }
  }, []);

  // ── Render: Indeed job card ─────────────────────────────────────
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

  // ── Render: Indeed/Remotive search form ─────────────────────────
  const renderIndeedForm = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Job title or keyword <span className="text-red-500">*</span>
          </label>
          <select
            value={indeedKeyword}
            onChange={(e) => setIndeedKeyword(e.target.value)}
            required
            className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
          >
            <option value="">Select job title</option>
            {JOB_TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Location
          </label>
          <select
            value={indeedLocation}
            onChange={(e) => setIndeedLocation(e.target.value)}
            disabled={locationDisabled}
            title={locationDisabled ? "Location is disabled because Indeed or Remotive is selected (remote-only sources)" : ""}
            className={`w-full h-10 px-3 rounded-lg border text-sm cursor-pointer appearance-none ${
              locationDisabled
                ? "bg-surface-container-high/50 text-on-surface-variant/50 cursor-not-allowed"
                : "bg-background text-on-background"
            } border-outline-variant`}
          >
            <option value="">Select city</option>
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {locationDisabled && (
            <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Remote only — location disabled</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Type</label>
          <div className="relative">
            <select
              value={indeedJobType}
              onChange={(e) => setIndeedJobType(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
            >
              {JOB_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Experience</label>
          <div className="relative">
            <select
              value={indeedExperience}
              onChange={(e) => setIndeedExperience(e.target.value)}
              className="w-full h-10 px-3 pr-8 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
            >
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <div className="flex items-center gap-1 bg-surface-container-high/60 border border-outline-variant rounded-lg p-1">
          {SOURCE_OPTIONS.map((opt) => {
            const active = indeedSources.includes(opt.toLowerCase());
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSourceClick(opt.toLowerCase())}
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
        <button
          type="submit"
          disabled={isIndeedSearching || !indeedKeyword.trim()}
          className="sm:ml-auto flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-primary text-on-primary font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-all whitespace-nowrap shadow-[0_4px_14px_rgba(61,82,160,0.35)]"
        >
          {isIndeedSearching ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
          ) : (
            <><Search className="w-4 h-4" /> Search Jobs</>
          )}
        </button>
      </div>
    </>
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

  // ── Render: Old job card ────────────────────────────────────────
  const renderOldJobCard = (job: Job, idx: number) => {
    const title = job.title || job.jobTitle || job.designation || 'Untitled';
    const company = job.company || job.companyName || job.employer || '';
    const loc = Array.isArray(job.location) ? job.location.join(', ') : (job.location || job.jobLocation || job.city || '');
    const exp = job.experience || job.minExp || job.experienceRange || '';
    const sal = job.salary || job.salaryRange || job.ctc || '';
    const posted = job.postedOn || job.postedDate || job.postedAt || '';
    const skills = Array.isArray(job.skills) ? job.skills.slice(0, 4) : (Array.isArray(job.keySkills) ? job.keySkills.slice(0, 4) : []);
    const jobUrl = extractUrl(job);
    const matchScore = job.matchScore || 0;
    const analysis = job.matchAnalysis;

    const getScoreColor = (score: number) => {
      if (score >= 80) return 'from-green-500 to-emerald-600';
      if (score >= 60) return 'from-blue-500 to-cyan-600';
      if (score >= 40) return 'from-yellow-500 to-orange-600';
      return 'from-red-500 to-rose-600';
    };

    const getScoreBg = (score: number) => {
      if (score >= 80) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    };

    const getScoreText = (score: number) => {
      if (score >= 80) return 'text-green-700 dark:text-green-400';
      if (score >= 60) return 'text-blue-700 dark:text-blue-400';
      if (score >= 40) return 'text-yellow-700 dark:text-yellow-400';
      return 'text-red-700 dark:text-red-400';
    };

    return (
      <div key={idx} className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:border-outline-variant transition-colors">
        {matchScore > 0 && analysis && (
          <div className={`flex items-center gap-3 mb-3 p-3 rounded-lg border ${getScoreBg(matchScore)}`}>
            <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${getScoreColor(matchScore)} text-white font-bold text-sm`}>
              {matchScore}%
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Target className={`w-4 h-4 ${getScoreText(matchScore)}`} />
                <span className={`text-sm font-semibold ${getScoreText(matchScore)}`}>
                  {matchScore >= 80 ? 'Excellent Match' : matchScore >= 60 ? 'Good Match' : matchScore >= 40 ? 'Moderate Match' : 'Poor Match'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">{analysis.recommendation}</p>
            </div>
            {analysis.shouldApply ? (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Apply</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">Skip</span>
            )}
          </div>
        )}

        <h3 className="text-base font-medium text-on-background mb-1">{escHtml(title)}</h3>
        <p className="text-sm text-on-surface-variant mb-3">
          {escHtml(company)}{loc ? ` · ${escHtml(loc)}` : ''}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {exp && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Briefcase className="w-3 h-3 inline mr-1" />
              {escHtml(String(exp))}
            </span>
          )}
          {sal && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              <DollarSign className="w-3 h-3 inline mr-1" />
              {escHtml(String(sal))}
            </span>
          )}
          {skills.map((s: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
              {escHtml(s)}
            </span>
          ))}
        </div>

        {analysis && analysis.strengths.length > 0 && (
          <div className="mb-3 p-3 bg-surface-container-low rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Strengths</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.strengths.slice(0, 3).map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                  {s}
                </span>
              ))}
            </div>
            {analysis.missingSkills.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2 mt-3">
                  <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Missing Skills</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.missingSkills.slice(0, 3).map((s, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">
            {posted ? `Posted: ${escHtml(String(posted))}` : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => toggleDebug(idx)}
              className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 bg-transparent text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Debug
            </button>
            {jobUrl ? (
              <>
                <a
                  href={escHtml(jobUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" /> View
                </a>
                <a
                  href={escHtml(jobUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Apply now
                </a>
              </>
            ) : (
              <span className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant opacity-40">No link found</span>
            )}
          </div>
        </div>

        {debugJob === idx && (
          <pre className="mt-3 p-3 bg-surface-container-low rounded-lg text-xs font-mono text-on-surface-variant overflow-x-auto max-h-40">
            {getDebugInfo(job)}
          </pre>
        )}
      </div>
    );
  };

  const TABS: { key: TabMode; label: string; icon: any }[] = [
    { key: 'manual', label: 'Manual', icon: Search },
    { key: 'ai', label: 'AI Match', icon: Zap },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { key: 'indeed', label: 'Indeed/Remotive', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-on-background">Job Search</h1>
          <p className="text-sm text-on-surface-variant mt-1">Find and apply to relevant jobs</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                  tab === t.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── MANUAL TAB ─────────────────────────────────────────── */}
        {tab === 'manual' && (
          <>
            <div className="bg-surface-container rounded-xl p-4 mb-4 border border-outline-variant/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
                >
                  <option value="">Select job title</option>
                  {JOB_TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
                >
                  <option value="">Select city</option>
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={manualSearch}
                  disabled={isSearching}
                  className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="Min salary (e.g. 5)"
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm"
                />
                <input
                  type="text"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  placeholder="Max salary (e.g. 20)"
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm"
                />
                <select
                  value={expFilter}
                  onChange={(e) => setExpFilter(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer"
                >
                  <option value="">Any experience</option>
                  <option value="0">Fresher (0 yrs)</option>
                  <option value="1">1+ year</option>
                  <option value="2">2+ years</option>
                  <option value="3">3+ years</option>
                  <option value="5">5+ years</option>
                  <option value="8">8+ years</option>
                </select>
              </div>
            </div>

            {status && (
              <div className="mb-4">
                <p className={`text-sm ${isError ? 'text-red-500' : 'text-on-surface-variant'}`}>{status}</p>
                {isError && status.includes('upgrade') && (
                  <button
                    onClick={openUpgrade}
                    className="mt-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Upgrade Apify Plan
                  </button>
                )}
              </div>
            )}

            {/* Manual search results */}
            <div className="space-y-3">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                  <p className="text-sm">Searching and analyzing jobs...</p>
                </div>
              )}
              {!isSearching && jobs.length === 0 && !status && (
                <div className="text-center py-12 text-on-surface-variant">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Search for jobs using manual search or AI matching</p>
                </div>
              )}
              {!isSearching && jobs.map((job, idx) => renderOldJobCard(job, idx))}
            </div>
          </>
        )}

        {/* ── AI MATCH TAB ────────────────────────────────────────── */}
        {tab === 'ai' && (
          <>
            {showAutoSearch && resumeData && (
              <div className="bg-gradient-to-r from-primary/10 to-tertiary/10 border border-primary/20 rounded-xl p-5 mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-on-background mb-1">AI-Powered Job Matching</h3>

                    {isSearching ? (
                      <div className="flex items-center gap-3 py-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <p className="text-sm text-on-surface-variant">
                          Analyzing your resume and finding the most relevant jobs...
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-on-surface-variant mb-3">
                          Found your resume with <strong>{resumeData.title || 'Software Developer'}</strong> and
                          {resumeData.skills?.length ? ` ${resumeData.skills.slice(0, 6).join(', ')}` : ' relevant skills'}.
                        </p>
                        {resumeData.location && (
                          <p className="text-sm text-on-surface-variant mb-3">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Location: {resumeData.location}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {resumeData.skills?.slice(0, 8).map((skill, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-4">
                      <button
                        onClick={autoSearch}
                        disabled={isSearching}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {isSearching ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Finding most relevant jobs for your resume...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" /> Find Relevant Jobs</>
                        )}
                      </button>
                      <button
                        onClick={() => setShowAutoSearch(false)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!resumeData && !isSearching && (
              <div className="text-center py-12 text-on-surface-variant">
                <p className="mb-2">No resume data found. Please fill in your resume first.</p>
                <a href="/resume" className="text-primary hover:underline text-sm font-medium">Go to Resume Builder</a>
              </div>
            )}

            {status && (
              <div className="mb-4">
                <p className={`text-sm ${isError ? 'text-red-500' : 'text-on-surface-variant'}`}>{status}</p>
                {isError && status.includes('upgrade') && (
                  <button
                    onClick={openUpgrade}
                    className="mt-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Upgrade Apify Plan
                  </button>
                )}
              </div>
            )}

            {/* AI search results */}
            <div className="space-y-3">
              {!isSearching && jobs.length > 0 && jobs.map((job, idx) => renderOldJobCard(job, idx))}
            </div>
          </>
        )}

        {/* ── LINKEDIN TAB ────────────────────────────────────────── */}
        {tab === 'linkedin' && (
          <>
            <form
              onSubmit={handleLiSubmit}
              className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 mb-6 shadow-sm"
            >
              <div className="flex flex-wrap items-end gap-3 md:flex-nowrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Title</label>
                  <select
                    value={liKeyword}
                    onChange={(e) => setLiKeyword(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
                  >
                    <option value="">Select job title</option>
                    {JOB_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Location</label>
                  <select
                    value={liLocation}
                    onChange={(e) => setLiLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer appearance-none"
                  >
                    <option value="">Select city</option>
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Experience Level</label>
                  <select
                    value={liExperience}
                    onChange={(e) => setLiExperience(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer"
                  >
                    <option value="any">Any Level</option>
                    <option value="internship">Internship</option>
                    <option value="entry">Entry Level</option>
                    <option value="associate">Associate</option>
                    <option value="mid-senior">Mid-Senior</option>
                    <option value="director">Director</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Type</label>
                  <select
                    value={liJobType}
                    onChange={(e) => setLiJobType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm cursor-pointer"
                  >
                    <option value="any">Any Type</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={liIsSearching || !liKeyword.trim()}
                  className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-primary text-on-primary font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {liIsSearching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Search Jobs</>
                  )}
                </button>
              </div>
            </form>

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
                  Found <span className="font-medium">{liCount}</span> jobs for{" "}
                  <span className="font-medium">&apos;{liKeyword}&apos;</span> in{" "}
                  <span className="font-medium">{liLocation}</span>
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

            {!liIsSearching && !liBlocked && !liErrorMsg && liJobs.length === 0 && (
              <div className="text-center py-16 text-on-surface-variant">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No jobs found. Try a broader keyword or different location.</p>
              </div>
            )}
          </>
        )}

        {/* ── INDEED/REMOTIVE TAB ─────────────────────────────────── */}
        {tab === 'indeed' && (
          <>
            <form
              onSubmit={handleIndeedSubmit}
              className="bg-surface-container border border-outline-variant/50 rounded-xl p-5 mb-6 shadow-sm"
            >
              <div className="flex flex-col gap-4">
                {renderIndeedForm()}
              </div>
            </form>

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

            {!isIndeedSearching && indeedSourceStatus && !indeedAllFailed && hasSearched && (
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

            {!isIndeedSearching && !indeedErrorMsg && !indeedBlocked && indeedCount === 0 && hasSearched && (
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
      </div>
    </div>
  );
}
