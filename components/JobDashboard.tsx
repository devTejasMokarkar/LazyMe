"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, Building2, MapPin, Mail, Check, X, Zap, 
  Search, Filter, Sparkles, ArrowRight, ChevronDown 
} from "lucide-react";
import { useToast } from "./ToastProvider";
import Loader from "./Loader";

export interface Job {
  id: string;
  company: string;
  role: string;
  description: string;
  email?: string;
  location?: string;
  applyType: "email" | "easy_apply" | "external";
  url?: string;
}

export interface MatchedJob extends Job {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface JobDashboardProps {
  resume: any;
  jobs: Job[];
  userEmail?: string;
  userName?: string;
  onBack?: () => void;
  onApplyComplete?: (results: any[]) => void;
}

export function JobDashboard({ 
  resume, 
  jobs, 
  userEmail, 
  userName,
  onBack,
  onApplyComplete 
}: JobDashboardProps) {
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    discoverJobs();
  }, [resume, jobs]);

  const discoverJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/discover-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobs }),
      });
      
      if (!res.ok) throw new Error("Failed to discover jobs");
      
      const data = await res.json();
      setMatchedJobs(data.jobs);
      showToast(`Found ${data.summary.total} matching jobs!`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to discover jobs", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const selectAll = () => {
    const filtered = getFilteredJobs();
    setSelectedJobs(new Set(filtered.map(j => j.id)));
  };

  const deselectAll = () => {
    setSelectedJobs(new Set());
  };

  const getFilteredJobs = () => {
    let filtered = matchedJobs;
    
    if (filter === "high") {
      filtered = filtered.filter(j => j.matchScore >= 70);
    } else if (filter === "medium") {
      filtered = filtered.filter(j => j.matchScore >= 50 && j.matchScore < 70);
    } else if (filter === "low") {
      filtered = filtered.filter(j => j.matchScore < 50);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j =>
        j.company.toLowerCase().includes(query) ||
        j.role.toLowerCase().includes(query) ||
        j.location?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const handleBatchApply = async () => {
    if (selectedJobs.size === 0) {
      showToast("Please select at least one job", "error");
      return;
    }

    setApplying(true);
    try {
      const selectedJobsList = matchedJobs.filter(j => selectedJobs.has(j.id));
      
      const res = await fetch("/api/auto-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobs: selectedJobsList,
          userEmail,
          userName,
          autoImprove: true,
          generateCoverLetter: true,
        }),
      });

      if (!res.ok) throw new Error("Auto-apply failed");
      
      const data = await res.json();
      showToast(`Processed ${data.results.length} jobs successfully!`, "success");
      
      if (onApplyComplete) {
        onApplyComplete(data.results);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to apply", "error");
    } finally {
      setApplying(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return "text-success bg-success/10";
    if (score >= 50) return "text-secondary bg-secondary/10";
    return "text-error bg-error/10";
  };

  const getApplyTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "easy_apply":
        return <Zap className="w-4 h-4" />;
      default:
        return <ArrowRight className="w-4 h-4" />;
    }
  };

  const filteredJobs = getFilteredJobs();

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background text-primary overflow-hidden font-sans animate-pulse">

        <header className="h-auto min-h-[56px] sm:h-16 border-b border-outline-variant bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-2 sm:py-0 shrink-0 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-5 sm:h-6 bg-surface-container-highest rounded-lg w-20 sm:w-28" />
            <div className="h-3 sm:h-4 w-[1px] bg-outline-variant mx-1 sm:mx-2" />
            <div className="h-3 sm:h-4 bg-surface-container-highest rounded-lg w-24 sm:w-36" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
            <div className="h-6 sm:h-8 bg-surface-container-highest rounded-lg w-14 sm:w-20" />
            <div className="h-6 sm:h-8 bg-surface-container-highest rounded-lg w-14 sm:w-20" />
            <div className="h-8 sm:h-10 bg-surface-container-highest rounded-lg sm:rounded-xl w-20 sm:w-32" />
          </div>
        </header>

        <div className="h-auto min-h-[40px] sm:h-14 border-b border-outline-variant bg-background flex flex-col sm:flex-row items-stretch sm:items-center px-4 sm:px-6 gap-2 sm:gap-4 py-2 sm:py-0 shrink-0">
          <div className="h-8 sm:h-9 bg-surface-container rounded-lg w-full sm:w-80" />
          <div className="h-8 sm:h-9 bg-surface-container rounded-lg w-full sm:w-40" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-surface-container border-2 border-outline-variant/50 rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4 max-w-6xl mx-auto">
              <div className="flex gap-3 sm:gap-4">
                <div className="w-4 sm:w-5 h-4 sm:h-5 bg-surface-container-highest rounded mt-1 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="h-5 sm:h-6 bg-surface-container-highest rounded-lg w-1/2 sm:w-1/3" />
                    <div className="h-4 sm:h-5 bg-surface-container-highest rounded-full w-16 sm:w-20" />
                  </div>
                  <div className="h-3 sm:h-4 bg-surface-container-highest rounded-lg w-1/3 sm:w-1/4" />
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 pl-7 sm:pl-9">
                <div className="h-5 sm:h-6 bg-surface-container-highest rounded-md w-12 sm:w-16" />
                <div className="h-5 sm:h-6 bg-surface-container-highest rounded-md w-12 sm:w-16" />
                <div className="h-5 sm:h-6 bg-surface-container-highest rounded-md w-12 sm:w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-primary overflow-hidden font-sans">
      {applying && <Loader />}
      
      <header className="h-auto min-h-[56px] sm:h-16 border-b border-outline-variant bg-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-2 sm:py-0 shrink-0 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {onBack && (
            <button onClick={onBack} className="p-1.5 sm:p-2 hover:bg-surface-container-high rounded-lg transition-colors">
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 rotate-180 text-on-surface-variant" />
            </button>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-primary shrink-0" />
            <span className="font-bold text-sm sm:text-base tracking-tight text-on-background truncate">Job Discovery</span>
          </div>
          <div className="h-3 sm:h-4 w-[1px] bg-outline-variant mx-1 sm:mx-2 shrink-0" />
          <div className="text-[11px] sm:text-sm text-on-surface-variant truncate">
            {matchedJobs.length} jobs • {selectedJobs.size} selected
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <p className="text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent hidden lg:block">
            Found a job? Just LazyMe it.
          </p>
          <button
            onClick={selectAll}
            className="text-[10px] sm:text-xs font-medium text-on-surface-variant hover:text-primary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-surface-container-high transition-colors shrink-0"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-[10px] sm:text-xs font-medium text-on-surface-variant hover:text-primary px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-surface-container-high transition-colors shrink-0"
          >
            Deselect All
          </button>
          <button
            onClick={handleBatchApply}
            disabled={selectedJobs.size === 0}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-1.5 sm:py-2 bg-primary hover:bg-primary/90 text-on-primary text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Zap className="w-3 sm:w-4 h-3 sm:h-4" />
            <span className="hidden sm:inline">Apply to {selectedJobs.size}</span>
            <span className="sm:hidden">Apply</span>
          </button>
        </div>
      </header>

      <div className="h-auto min-h-[44px] sm:h-14 border-b border-outline-variant bg-background flex flex-col sm:flex-row items-stretch sm:items-center px-4 sm:px-6 gap-2 sm:gap-4 py-2 sm:py-0 shrink-0">
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search companies, roles, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-primary placeholder:text-on-surface-variant/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-on-surface-variant/50 shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-surface-container border border-outline-variant rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-primary flex-1 sm:flex-none"
          >
            <option value="all">All Matches</option>
            <option value="high">High Match (70%+)</option>
            <option value="medium">Medium Match (50-70%)</option>
            <option value="low">Low Match (&lt;50%)</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
              <Briefcase className="w-12 sm:w-16 h-12 sm:h-16 text-on-surface-variant/30 mb-4" />
              <h3 className="text-base sm:text-lg font-bold text-primary mb-2">No jobs found</h3>
            <p className="text-on-surface-variant text-xs sm:text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 max-w-6xl mx-auto">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-surface-container border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all cursor-pointer hover:border-outline-variant ${
                  selectedJobs.has(job.id) ? "border-primary bg-primary/5" : "border-outline-variant/50"
                }`}
                onClick={() => toggleJobSelection(job.id)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="pt-1">
                    <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      selectedJobs.has(job.id) 
                        ? "border-primary bg-primary" 
                        : "border-outline-variant bg-transparent"
                    }`}>
                      {selectedJobs.has(job.id) && <Check className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-on-primary" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                           <h3 className="font-bold text-primary text-sm sm:text-lg truncate">{job.role}</h3>
                          <span className={`self-start px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold w-fit ${getMatchScoreColor(job.matchScore)}`}>
                            {job.matchScore}% match
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4 text-[11px] sm:text-sm text-on-surface-variant">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                            <span>{job.company}</span>
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                              <span>{job.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {getApplyTypeIcon(job.applyType)}
                            <span className="capitalize">{job.applyType.replace("_", " ")}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {job.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                        {job.matchedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-success/10 text-success text-[10px] sm:text-xs rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.matchedSkills.length > 3 && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-surface-container-highest text-on-surface-variant text-[10px] sm:text-xs rounded-md">
                            +{job.matchedSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
