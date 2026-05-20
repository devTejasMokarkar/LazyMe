"use client";

import { useState, useEffect } from 'react';
import { Search, Briefcase, MapPin, Currency, ExternalLink, Eye, Loader2, Sparkles, X, Zap } from 'lucide-react';

interface Job {
  title: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  skills: string[];
  postedOn: string;
  url: string;
  [key: string]: any;
}

interface ResumeData {
  title?: string;
  skills?: string[];
  location?: string;
  experience?: Array<{ role?: string; company?: string }>;
}

export default function ApplyPage() {
  const [searchMode, setSearchMode] = useState<'manual' | 'ai'>('ai');
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

  useEffect(() => {
    fetchResumeData();
  }, []);

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
          expFilter: expFilter || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === 'UPGRADE_REQUIRED') {
          setStatus('Please upgrade your Apify plan to continue searching. Click the button below to upgrade.');
          setIsError(true);
          return;
        }
        throw new Error(result.error || 'Search failed');
      }

      setJobs(result.jobs);
      setStatus(`Found ${result.jobs.length} relevant jobs for your profile!`);
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
          setStatus('Please upgrade your Apify plan to continue searching. Click the button below to upgrade.');
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

  const openUpgrade = () => {
    window.open('https://console.apify.com/billing/subscription', '_blank');
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="p-6 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-on-background">Job Search</h1>
            <p className="text-on-surface-variant text-sm mt-1">Find and apply to relevant jobs</p>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSearchMode('manual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'manual' 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Search className="w-4 h-4" />
              Manual
            </button>
            <button
              onClick={() => setSearchMode('ai')}
              disabled={!resumeData?.title && !resumeData?.skills?.length}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                searchMode === 'ai' 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Zap className="w-4 h-4" />
              AI Match
            </button>
          </div>

          {/* AI Search Card */}
          {searchMode === 'ai' && showAutoSearch && resumeData && (
            <div className="bg-gradient-to-r from-primary/10 to-tertiary/10 border border-primary/20 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-on-background mb-1">AI-Powered Job Matching</h3>
                  <p className="text-sm text-on-surface-variant mb-3">
                    Found your resume with <strong>{resumeData.title || 'Software Developer'}</strong> and 
                    {resumeData.skills?.length ? ` ${resumeData.skills.slice(0, 5).join(', ')}` : ' relevant skills'}.
                  </p>
                  
                  {resumeData.location && (
                    <p className="text-sm text-on-surface-variant mb-3">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location: {resumeData.location}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {resumeData.skills?.slice(0, 6).map((skill, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={autoSearch}
                    disabled={isSearching}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finding most relevant jobs for your resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Find Relevant Jobs
                      </>
                    )}
                  </button>
                </div>
                <button onClick={() => setShowAutoSearch(false)} className="p-1 hover:bg-surface-container rounded">
                  <X className="w-4 h-4 text-on-surface-variant" />
                </button>
              </div>
            </div>
          )}

          {/* Manual Search Filters */}
          {searchMode === 'manual' && (
            <div className="bg-surface-container rounded-xl p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title or keyword"
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (e.g. Mumbai, Bangalore)"
                  className="h-10 px-3 rounded-lg border border-outline-variant bg-background text-on-background text-sm"
                />
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
          )}

          {/* Status */}
          {status && (
            <div className="mb-4">
              <p className={`text-sm ${isError ? 'text-red-500' : 'text-on-surface-variant'}`}>
                {status}
              </p>
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
        </div>
      </div>

      {/* Jobs Grid with Scroll */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {jobs.length === 0 && !status && (
              <div className="text-center py-12 text-on-surface-variant">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Search for jobs using manual search or AI matching</p>
              </div>
            )}

            {jobs.map((job, idx) => {
              const title = job.title || job.jobTitle || job.designation || 'Untitled';
              const company = job.company || job.companyName || job.employer || '';
              const loc = Array.isArray(job.location) ? job.location.join(', ') : (job.location || job.jobLocation || job.city || '');
              const exp = job.experience || job.minExp || job.experienceRange || '';
              const sal = job.salary || job.salaryRange || job.ctc || '';
              const posted = job.postedOn || job.postedDate || job.postedAt || '';
              const skills = Array.isArray(job.skills) ? job.skills.slice(0, 4) : (Array.isArray(job.keySkills) ? job.keySkills.slice(0, 4) : []);
              const jobUrl = extractUrl(job);

              return (
                <div key={idx} className="bg-surface-container border border-outline-variant/50 rounded-xl p-4 hover:border-outline-variant transition-colors">
                  <h3 className="text-base font-medium text-on-background mb-1">{escHtml(title)}</h3>
                  <p className="text-sm text-on-surface-variant mb-3">
                    {escHtml(company)}{loc ? ` · ${escHtml(loc)}` : ''}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {exp && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Briefcase className="w-3 h-3 inline mr-1" />
                        {escHtml(String(exp))}
                      </span>
                    )}
                    {sal && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                        <Currency className="w-3 h-3 inline mr-1" />
                        {escHtml(String(sal))}
                      </span>
                    )}
                    {skills.map((s: string, i: number) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                        {escHtml(s)}
                      </span>
                    ))}
                  </div>

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
                            <Eye className="w-3 h-3" />
                            View
                          </a>
                          <a
                            href={escHtml(jobUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium hover:bg-blue-100 flex items-center gap-1 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Apply now
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}