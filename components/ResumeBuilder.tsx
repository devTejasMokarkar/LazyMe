"use client";

import { useState, useCallback, useEffect } from "react";
import { ResumeData } from "@/utils/promptBuilder";
import { LivePreview } from "./LivePreview";
import { EmailButton } from "./EmailButton";
import { ThemeToggle } from "./ThemeToggle";
import { useToast } from "./ToastProvider";
import Loader from "./Loader";
import DownloadDropdown from "./DownloadDropdown";
import LaTeXPreview from "./LaTeXPreview";
import { resumeToLatex } from "@/utils/latexFormatter";
import {
  RefreshCw, FileText, Briefcase, GraduationCap, Wrench, User, Sparkles, Mail,
  Menu, Eye, Code
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "latex" | "cover">("edit");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { showToast } = useToast();

  const generateResume = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: resume, jobDescription }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setResume(data.resume);

      if (generateCover && jobDescription) {
        const coverRes = await fetch("/api/generate-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData: resume, jobDescription, companyName }),
        });
        if (coverRes.ok) setCoverLetter((await coverRes.json()).coverLetter);
      }
      showToast("Everything ready! 🚀", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to generate resume", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) generateResume();
  }, []);

  const updateField = useCallback((field: keyof ResumeData, value: any) => {
    setResume(prev => ({ ...prev, [field]: value }));
  }, []);

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
          <EmailButton resumeData={resume} coverLetter={coverLetter} jobTitle={jobTitle} companyEmail={companyEmail} />
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
            {["edit", "latex", "cover"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 h-full border-b-2 transition-all ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === "edit" ? <FileText className="w-3 h-3" /> : tab === "latex" ? <Code className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                {tab === "edit" ? "Editor" : tab === "latex" ? "Source" : "Cover Letter"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            {activeTab === "edit" && (
              <div className="max-w-2xl mx-auto space-y-12 pb-24">
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
                    {resume.experience.map((exp, idx) => (
                      <div key={idx} className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-6 space-y-4 relative group">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="Company" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={exp.company} onChange={e => updateExperience(idx, "company", e.target.value)} />
                          <input type="text" placeholder="Duration" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={exp.duration} onChange={e => updateExperience(idx, "duration", e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                          <input type="text" placeholder="Role" className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={exp.role} onChange={e => updateExperience(idx, "role", e.target.value)} />
                          <button onClick={() => removeExperience(idx)} className="text-red-500 hover:bg-red-500/10 px-3 rounded-lg transition-colors text-xs font-bold uppercase">Remove</button>
                        </div>
                      </div>
                    ))}
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
                    {resume.education.map((edu, idx) => (
                      <div key={idx} className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-6 space-y-4 relative group">
                        <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="School" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={edu.school} onChange={e => updateEducation(idx, "school", e.target.value)} />
                          <input type="text" placeholder="Year" className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={edu.year} onChange={e => updateEducation(idx, "year", e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                          <input type="text" placeholder="Degree" className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" value={edu.degree} onChange={e => updateEducation(idx, "degree", e.target.value)} />
                          <button onClick={() => removeEducation(idx)} className="text-red-500 hover:bg-red-500/10 px-3 rounded-lg transition-colors text-xs font-bold uppercase">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === "latex" && <div className="h-full"><LaTeXPreview resumeData={resume} /></div>}
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
