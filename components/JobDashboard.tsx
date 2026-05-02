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
    
    // Filter by match score
    if (filter === "high") {
      filtered = filtered.filter(j => j.matchScore >= 70);
    } else if (filter === "medium") {
      filtered = filtered.filter(j => j.matchScore >= 50 && j.matchScore < 70);
    } else if (filter === "low") {
      filtered = filtered.filter(j => j.matchScore < 50);
    }
    
    // Filter by search query
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
    if (score >= 70) return "text-emerald-400 bg-emerald-400/10";
    if (score >= 50) return "text-yellow-400 bg-yellow-400/10";
    return "text-red-400 bg-red-400/10";
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
    return <Loader />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {applying && <Loader />}
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-[#1e293b] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180 text-slate-400" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-white">Job Discovery</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700 mx-2" />
          <div className="text-sm text-slate-400">
            {matchedJobs.length} jobs found • {selectedJobs.size} selected
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent hidden lg:block">
            Found a job? Just LazyMe it.
          </p>
          <button
            onClick={selectAll}
            className="text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-xs font-medium text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Deselect All
          </button>
          <button
            onClick={handleBatchApply}
            disabled={selectedJobs.size === 0}
            className="flex flex-col items-center gap-1 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Apply to {selectedJobs.size} Job{selectedJobs.size !== 1 ? "s" : ""}
            </div>
            <span className="text-[10px] font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Found a job? Just LazyMe it.
            </span>
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="h-14 border-b border-slate-800 bg-[#0f172a] flex items-center px-6 gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search companies, roles, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e293b] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            <option value="all">All Matches</option>
            <option value="high">High Match (70%+)</option>
            <option value="medium">Medium Match (50-70%)</option>
            <option value="low">Low Match (&lt;50%)</option>
          </select>
        </div>
      </div>

      {/* Job List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Briefcase className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No jobs found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-6xl mx-auto">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className={`bg-[#1e293b] border-2 rounded-xl p-6 transition-all cursor-pointer hover:border-slate-600 ${
                  selectedJobs.has(job.id) ? "border-primary bg-primary/5" : "border-slate-800"
                }`}
                onClick={() => toggleJobSelection(job.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      selectedJobs.has(job.id) 
                        ? "border-primary bg-primary" 
                        : "border-slate-600 bg-transparent"
                    }`}>
                      {selectedJobs.has(job.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-white text-lg truncate">{job.role}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getMatchScoreColor(job.matchScore)}`}>
                            {job.matchScore}% match
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{job.company}</span>
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
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

                    {/* Skills */}
                    {job.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {job.matchedSkills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.matchedSkills.length > 5 && (
                          <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-md">
                            +{job.matchedSkills.length - 5} more
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
