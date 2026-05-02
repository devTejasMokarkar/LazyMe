"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ResumeData } from "@/utils/promptBuilder";
import { LivePreview } from "./LivePreview";
import { EmailButton } from "./EmailButton";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "./ToastProvider";
import Loader from "./Loader";
import DownloadDropdown from "./DownloadDropdown";
import { ATSScoreCard } from "./ATSScoreCard";
import { resumeToLatex } from "@/utils/latexFormatter";
import {
  RefreshCw, FileText, Briefcase, GraduationCap, Wrench, User, Sparkles, Mail,
  Menu, Eye
} from "lucide-react";

interface ResumeBuilderProps {
  initialData?: Partial<ResumeData>;
  jobDescription?: string;
  companyName?: string;
  jobTitle: string;
  companyEmail?: string;
  generateCover: boolean;
}

const emptyResume: ResumeData = {
  name: "",
  email: "",
  phone: "",
  title: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
};

function cleanExtractedCompanyName(value: string) {
  return value
    .replace(/^[^\w]+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:\s]+$/, "")
    .trim();
}

function extractCompanyNameFromJobDescription(description?: string) {
  if (!description) return "";

  const patterns = [
    /(?:^|\n)\s*(?:company|company name|organization|employer|hiring company|client)\s*[:\-]\s*([^\n|•]+)/i,
    /(?:^|\n)\s*(?:about the company|about us)\s*[:\-]\s*([^\n|•.]+)/i,
    /\b(?:join|at)\s+([A-Z][A-Za-z0-9&.'’(), -]{2,70}?)(?:\s+(?:as|for|to|is|,|\.|\n))/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    const candidate = cleanExtractedCompanyName(match?.[1] || "");

    if (
      candidate &&
      candidate.length <= 80 &&
      !/^(job title|location|experience|role|position|salary|requirements?)$/i.test(candidate)
    ) {
      return candidate;
    }
  }

  return "";
}

function extractEmailFromJobDescription(description?: string) {
  if (!description) return "";

  const emails = description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return emails?.[0] || "";
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const educationYears = Array.from({ length: 80 }, (_, index) => String(new Date().getFullYear() + 10 - index));

function parseMonthValue(value: string) {
  if (!value) return "";

  const monthPattern = new RegExp(`(${monthNames.join("|")})\\s+(\\d{4})`, "i");
  const monthMatch = value.match(monthPattern);

  if (monthMatch) {
    const monthIndex = monthNames.findIndex(
      month => month.toLowerCase() === monthMatch[1].toLowerCase()
    );
    return `${monthMatch[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
  }

  const inputMonthMatch = value.match(/\b(\d{4})-(\d{2})\b/);
  if (inputMonthMatch) return `${inputMonthMatch[1]}-${inputMonthMatch[2]}`;

  const yearMatch = value.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? `${yearMatch[0]}-01` : "";
}

function formatMonthValue(value: string) {
  if (!value) return "";

  const [year, month] = value.split("-");
  const monthName = monthNames[Number(month) - 1];

  return monthName && year ? `${monthName} ${year}` : "";
}

function parseDurationRange(duration: string) {
  const current = /present|current/i.test(duration);
  const [start = "", end = ""] = duration.split(/\s+(?:-|–|to)\s+/i);

  return {
    start: parseMonthValue(start),
    end: current ? "" : parseMonthValue(end),
    current,
  };
}

function formatDurationRange(start: string, end: string, current: boolean) {
  const formattedStart = formatMonthValue(start);
  const formattedEnd = current ? "Present" : formatMonthValue(end);

  if (formattedStart && formattedEnd) return `${formattedStart} - ${formattedEnd}`;
  if (formattedStart) return formattedStart;
  if (formattedEnd) return formattedEnd;

  return "";
}

function parseYearRange(value: string) {
  const years = value.match(/\b(?:19|20)\d{2}\b/g) || [];

  return {
    start: years[0] || "",
    end: years[1] || "",
  };
}

function formatYearRange(start: string, end: string) {
  if (start && end) return `${start}-${end}`;
  return start || end || "";
}

export function ResumeBuilder({
  initialData,
  jobDescription,
  companyName,
  jobTitle,
  companyEmail,
  generateCover,
}: ResumeBuilderProps) {
  const [resume, setResume] = useState<ResumeData>({ ...emptyResume, ...initialData });
  const [coverLetter, setCoverLetter] = useState("");
  const [ats, setAts] = useState<any>(null);
  const [currentJobDesc, setCurrentJobDesc] = useState(jobDescription || "");
  const [currentCompanyName, setCurrentCompanyName] = useState(
    companyName || extractCompanyNameFromJobDescription(jobDescription)
  );
  const [currentCompanyEmail, setCurrentCompanyEmail] = useState(
    companyEmail || extractEmailFromJobDescription(jobDescription)
  );
  const [companyNameEdited, setCompanyNameEdited] = useState(Boolean(companyName));
  const [companyEmailEdited, setCompanyEmailEdited] = useState(Boolean(companyEmail));
  const currentGenerateCover = generateCover;
  const [improving, setImproving] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "cover" | "ats">("edit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const autoGenerateStarted = useRef(false);
  const generationInFlight = useRef(false);
  const { showToast } = useToast();

  const generateResume = async () => {
    if (generationInFlight.current) return;

    generationInFlight.current = true;
    setLoading(true);
    try {
      const includeATS = true;
      
      const res = await fetch("/api/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          data: resume, 
          jobDescription: currentJobDesc, 
          companyName: currentCompanyName,
          includeCoverLetter: currentGenerateCover,
          includeATS
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      
      setResume(data.resume);
      if (data.coverLetter) setCoverLetter(data.coverLetter);
      if (data.ats) setAts(data.ats);
      
      showToast("Everything ready! 🚀", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to generate resume", "error");
    } finally {
      generationInFlight.current = false;
      setLoading(false);
    }
  };

  const improveResume = async () => {
    if (!currentJobDesc) return;
    setImproving(true);
    try {
      const res = await fetch("/api/improve-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription: currentJobDesc }),
      });
      if (!res.ok) throw new Error("Improvement failed");
      const data = await res.json();
      
      setPreviousScore(ats?.score || null);
      setResume(data.improvedResume);
      setAts(data.newATS);
      setChanges(data.changes || []);
      
      showToast("Resume improved successfully! ⚡", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to improve resume", "error");
    } finally {
      setImproving(false);
    }
  };

  useEffect(() => {
    const hasInitialData = initialData && Object.keys(initialData).length > 0;
    const hasJobDescription = Boolean(jobDescription?.trim());

    if ((hasInitialData || hasJobDescription) && !autoGenerateStarted.current) {
      autoGenerateStarted.current = true;
      generateResume();
    }
  }, []);

  const updateField = useCallback((field: keyof ResumeData, value: any) => {
    setResume(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateJobDescription = (value: string) => {
    setCurrentJobDesc(value);

    if (!companyNameEdited) {
      setCurrentCompanyName(extractCompanyNameFromJobDescription(value));
    }

    if (!companyEmailEdited) {
      setCurrentCompanyEmail(extractEmailFromJobDescription(value));
    }
  };

  const addExperience = () => {
    setResume(prev => ({
      ...prev,
      experience: [...prev.experience, { company: "", role: "", duration: "", bullets: [""] }],
    }));
  };

  const updateExperience = (idx: number, field: string, value: any) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }));
  };

  const updateExperienceDuration = (idx: number, start: string, end: string, current: boolean) => {
    updateExperience(idx, "duration", formatDurationRange(start, end, current));
  };

  const removeExperience = (idx: number) => {
    setResume(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
  };

  const addEducation = () => {
    setResume(prev => ({
      ...prev,
      education: [...prev.education, { school: "", degree: "", year: "" }],
    }));
  };

  const updateEducation = (idx: number, field: string, value: string) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }));
  };

  const updateEducationYearRange = (idx: number, start: string, end: string) => {
    updateEducation(idx, "year", formatYearRange(start, end));
  };

  const removeEducation = (idx: number) => {
    setResume(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      {loading && <Loader />}
      
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-[#1e293b] flex items-center justify-between px-4 z-40 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-700 rounded-md transition-colors">
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight text-white">LazyMe AI</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700 mx-2" />
          <div className="text-sm font-medium text-slate-300">{resume.name || "Untitled Resume"}</div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={generateResume} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recompile
          </button>
          <DownloadDropdown resumeData={resume} latex={resumeToLatex(resume)} resumePreviewId="resume-preview" />
          <EmailButton resumeData={resume} coverLetter={coverLetter} jobTitle={jobTitle} companyEmail={currentCompanyEmail} />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className={`flex-1 grid transition-all duration-300 ${sidebarOpen ? "grid-cols-[240px_1fr_1fr]" : "grid-cols-[0px_1fr_1fr]"} overflow-hidden bg-[#0f172a]`}>
        {/* Sidebar */}
        <aside className="bg-[#1e293b] border-r border-slate-800 flex flex-col overflow-y-auto scrollbar-hide">
          <div className="p-4 border-b border-slate-800 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">File Outline</span>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {[
              { id: "edit", label: "Professional Summary", icon: <User className="w-3.5 h-3.5" /> },
              { id: "edit", label: "Core Competencies", icon: <Wrench className="w-3.5 h-3.5" /> },
              { id: "edit", label: "Professional Experience", icon: <Briefcase className="w-3.5 h-3.5" /> },
              { id: "edit", label: "Education", icon: <GraduationCap className="w-3.5 h-3.5" /> },
              { id: "cover", label: "Cover Letter", icon: <Mail className="w-3.5 h-3.5" /> },
              { id: "ats", label: "ATS Score", icon: <RefreshCw className="w-3.5 h-3.5" /> },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[11px] font-medium rounded-lg transition-all ${
                  activeTab === item.id ? "text-primary bg-primary/10" : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Editor Panel */}
        <div className="flex flex-col border-r border-slate-800 overflow-hidden bg-[#0f172a]">
          <div className="h-10 bg-[#1e293b] flex items-center px-4 border-b border-slate-800 gap-6 shrink-0">
            {["edit", "cover", "ats"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 h-full border-b-2 transition-all ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === "edit" ? <FileText className="w-3 h-3" /> : tab === "cover" ? <Mail className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                {tab === "edit" ? "Editor" : tab === "cover" ? "Cover Letter" : "ATS Score"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            {activeTab === "edit" && (
              <div className="max-w-2xl mx-auto space-y-12 pb-24">
                <div className="space-y-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Target Job
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Company Name</label>
                      <input
                        type="text"
                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        value={currentCompanyName}
                        onChange={e => {
                          setCompanyNameEdited(true);
                          setCurrentCompanyName(e.target.value);
                        }}
                        placeholder="e.g. Google"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To Email</label>
                      <input
                        type="email"
                        className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        value={currentCompanyEmail}
                        onChange={e => {
                          setCompanyEmailEdited(true);
                          setCurrentCompanyEmail(e.target.value);
                        }}
                        placeholder="hiring@company.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label>
                      <input type="text" className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" value={resume.name} onChange={e => updateField("name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Role</label>
                      <input type="text" className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" value={resume.title} onChange={e => updateField("title", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Summary
                  </h3>
                  <textarea className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[140px] resize-none leading-relaxed" value={resume.summary} onChange={e => updateField("summary", e.target.value)} />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-3">
                      <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Experience
                    </h3>
                    <button onClick={addExperience} className="text-xs font-bold text-primary uppercase tracking-wider">+ Add Entry</button>
                  </div>
                  <div className="space-y-6">
                    {resume.experience.map((exp, idx) => {
                      const duration = parseDurationRange(exp.duration);

                      return (
                        <div key={idx} className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-6 space-y-4 relative group">
                          <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Company" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={exp.company} onChange={e => updateExperience(idx, "company", e.target.value)} />
                            <input type="text" placeholder="Role" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={exp.role} onChange={e => updateExperience(idx, "role", e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">From</label>
                              <input
                                type="month"
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={duration.start}
                                onChange={e => updateExperienceDuration(idx, e.target.value, duration.end, duration.current)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To</label>
                              <input
                                type="month"
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                value={duration.end}
                                disabled={duration.current}
                                onChange={e => updateExperienceDuration(idx, duration.start, e.target.value, duration.current)}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={duration.current}
                                onChange={e => updateExperienceDuration(idx, duration.start, "", e.target.checked)}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
                              />
                              <span className="text-slate-300 text-sm">Currently working here</span>
                            </label>
                            <button onClick={() => removeExperience(idx)} className="text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase">Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-3">
                      <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Education
                    </h3>
                    <button onClick={addEducation} className="text-xs font-bold text-primary uppercase tracking-wider">+ Add Entry</button>
                  </div>
                  <div className="space-y-6">
                    {resume.education.map((edu, idx) => {
                      const yearRange = parseYearRange(edu.year);

                      return (
                        <div key={idx} className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-6 space-y-4 relative group">
                          <input type="text" placeholder="School / Institute" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={edu.school} onChange={e => updateEducation(idx, "school", e.target.value)} />
                          <input type="text" placeholder="Degree" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={edu.degree} onChange={e => updateEducation(idx, "degree", e.target.value)} />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">From</label>
                              <select
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={yearRange.start}
                                onChange={e => updateEducationYearRange(idx, e.target.value, yearRange.end)}
                              >
                                <option value="">Select year</option>
                                {educationYears.map(year => (
                                  <option key={`edu-start-${year}`} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">To</label>
                              <select
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                                value={yearRange.end}
                                onChange={e => updateEducationYearRange(idx, yearRange.start, e.target.value)}
                              >
                                <option value="">Select year</option>
                                {educationYears.map(year => (
                                  <option key={`edu-end-${year}`} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => removeEducation(idx)} className="text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase">Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {activeTab === "cover" && (
              <div className="max-w-2xl mx-auto space-y-6 pb-24">
                <h3 className="text-white font-bold text-lg flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" /> Cover Letter
                </h3>
                <textarea 
                  className="w-full bg-[#1e293b] border border-slate-700 rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[400px] resize-none leading-relaxed" 
                  value={coverLetter} 
                  onChange={e => setCoverLetter(e.target.value)} 
                  placeholder="Your generated cover letter will appear here..."
                />
              </div>
            )}
            {activeTab === "ats" && (
              <div className="max-w-2xl mx-auto space-y-6 pb-24">
                {ats ? (
                  <ATSScoreCard 
                    data={ats} 
                    onImprove={improveResume} 
                    improving={improving} 
                    changes={changes} 
                    previousScore={previousScore} 
                  />
                ) : (
                  <div className="text-center bg-[#1e293b]/50 border border-slate-800 rounded-xl p-12">
                    <RefreshCw className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">No ATS Score Yet</h4>
                    <p className="text-slate-400 text-sm">Paste a job description in the Editor tab and click Recompile to generate your ATS score.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:flex flex-col bg-[#0f172a] overflow-hidden">
          <div className="h-10 bg-[#1e293b] flex items-center px-4 border-b border-slate-800 justify-between shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" /> PDF Preview
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold">A4 Paper</span>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] scrollbar-hide flex flex-col items-center relative">
            {/* Perfectly Centered A4 Container */}
            <div className="relative shrink-0 transition-all duration-500 origin-top transform scale-[0.6] xl:scale-[0.8] 2xl:scale-100 mb-[-449px] xl:mb-[-225px] 2xl:mb-0">
              <div id="resume-preview" className="shadow-[0_40px_100px_rgba(0,0,0,0.7)] bg-white">
                <LivePreview data={resume} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
