"use client";

import { useState } from "react";
import { FileUp, Wand2, Zap, ArrowRight, ChevronRight, Send } from "lucide-react";
import { ResumeUpload } from '@/components/resume/ResumeUpload';
import { useToast } from '@/components/layout/ToastProvider';

interface OnboardingFlowProps {
  onComplete: (data: {
    mode: "upload" | "build" | "quick";
    parsedData?: any;
    jobDescription?: string;
    companyName?: string;
    jobTitle?: string;
    companyEmail?: string;
    generateCover: boolean;
  }) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"upload" | "build" | "quick">("upload");
  const [jobInputMode, setJobInputMode] = useState<"jd" | "details">("jd");
  const [parsedData, setParsedData] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [generateCover, setGenerateCover] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsingComplete, setParsingComplete] = useState(false);
  const { showToast } = useToast();
  const steps = [0, 1];

  const modes = [
    {
      id: "upload" as const,
      icon: <FileUp className="w-6 h-6" />,
      title: "Upload Resume",
      desc: "Upload your existing PDF resume and we auto-fill everything",
      default: true,
    },
    {
      id: "build" as const,
      icon: <Wand2 className="w-6 h-6" />,
      title: "Build from Scratch",
      desc: "Enter your details and let AI craft your resume",
      default: false,
    },
    {
      id: "quick" as const,
      icon: <Zap className="w-6 h-6" />,
      title: "Job Ready Mode",
      desc: "Paste a job description, we do the rest",
      default: false,
    },
  ];

  const handleParsed = (data: any) => {
    setParsedData(data);
    setUploadSuccess(true);
    setParsingComplete(true);
    showToast("Resume parsed successfully!", "success");
  };

  const handleSendToBuilder = () => {
    // Preserve existing job details while sending parsed resume data to builder
    onComplete({
      mode,
      parsedData,
      jobDescription, // Preserve existing value
      companyName,    // Preserve existing value
      jobTitle,       // Preserve existing value
      companyEmail,   // Preserve existing value
      generateCover: false,
    });
  };

  const handleFinish = () => {
    if (jobInputMode === "jd" && !jobDescription.trim()) {
      showToast("Please paste the job description", "error");
      return;
    }
    if (jobInputMode === "details" && !jobTitle.trim()) {
      showToast("Please enter a job title", "error");
      return;
    }
    onComplete({
      mode,
      parsedData,
      jobDescription,
      companyName: jobInputMode === "jd" ? "" : companyName,
      jobTitle: jobInputMode === "jd" ? jobTitle || "Target Role" : jobTitle,
      companyEmail: jobInputMode === "jd" ? "" : companyEmail,
      generateCover,
    });
  };

  const renderJobInputToggle = () => (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-outline-variant bg-surface-container-high/50 p-1">
      {[
        { id: "jd" as const, label: "Paste JD" },
        { id: "details" as const, label: "Add details" },
      ].map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => setJobInputMode(option.id)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            jobInputMode === option.id
              ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const renderJobInputs = () => (
    <>
      {renderJobInputToggle()}
      {jobInputMode === "jd" ? (
        <textarea
          placeholder="Paste the full job description. AI will infer the role, company context, skills, and cover letter angle."
          className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[220px] resize-none"
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
        />
      ) : (
        <>
          <input
            type="text"
            placeholder="Job Title *"
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Company Name"
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Recruiter Email (optional)"
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={companyEmail}
            onChange={e => setCompanyEmail(e.target.value)}
          />
          <textarea
            placeholder="Job Description (optional)"
            className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px] resize-none"
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
          />
        </>
      )}
    </>
  );

  return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
      {/* Progress */}
      <div className="mx-auto mb-10 flex w-full max-w-xl items-center justify-center">
        {steps.map(i => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= i ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-4 h-1 w-28 rounded-full transition-all sm:w-48 md:w-64 ${
                step > i ? "bg-primary" : "bg-outline-variant"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Choose Mode */}
      {step === 0 && (
        <div className="animate-slide-up">
          <h1 className="text-3xl font-bold mb-2 gradient-text">LazyMe AI</h1>
          <p className="text-on-surface-variant mb-2">Apply to jobs in under 2 minutes</p>
          <p className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-8">
            Found a job? Just LazyMe it.
          </p>

          <div className="space-y-3">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setJobInputMode("jd");
                  setStep(1);
                }}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                  mode === m.id
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant hover:border-primary/50 bg-surface-container-high/30"
                }`}
              >
                <div className={`p-3 rounded-xl ${mode === m.id ? "bg-primary/20 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">{m.title}</h3>
                  <p className="text-sm text-on-surface-variant">{m.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && mode === "upload" && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(0)} className="text-slate-400 dark:text-slate-500 hover:text-slate-200 dark:hover:text-slate-300 text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">Upload Resume & Job Details</h2>
          <div className="space-y-4">
            <ResumeUpload onParsed={handleParsed} />
            {parsingComplete ? (
              <>
                <div className="text-center text-success mb-4">
                  <p className="font-medium">Resume parsed successfully!</p>
                  <button 
                    onClick={handleSendToBuilder}
                    className="btn-primary w-full text-lg py-4"
                  >
                    Send to Builder <Send className="w-5 h-5 inline ml-2" />
                  </button>
                </div>
                <p className="text-center text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mt-3">
                  Found a job? Just LazyMe it.
                </p>
              </>
            ) : (
              <>
                {renderJobInputs()}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateCover}
                    onChange={e => setGenerateCover(e.target.checked)}
                    className="w-5 h-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
                  />
                  <span className="text-on-surface-variant">Generate cover letter too</span>
                </label>
                <button onClick={handleFinish} className="btn-primary w-full text-lg py-4">
                  Generate & Apply <Zap className="w-5 h-5 inline ml-2" />
                </button>
                <p className="text-center text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mt-3">
                  Found a job? Just LazyMe it.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {step === 1 && mode !== "upload" && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(0)} className="text-on-surface-variant hover:text-primary text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">
            {mode === "build" ? "Resume & Job Details" : "Job Details"}
          </h2>
          <div className="space-y-4">
            {mode === "build" && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={parsedData?.name || ""}
                  onChange={e => setParsedData({ ...parsedData, name: e.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={parsedData?.email || ""}
                  onChange={e => setParsedData({ ...parsedData, email: e.target.value })}
                />
              </>
            )}
            {renderJobInputs()}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateCover}
                onChange={e => setGenerateCover(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
              />
              <span className="text-on-surface-variant">Generate cover letter too</span>
            </label>
            <button onClick={handleFinish} className="btn-primary w-full text-lg py-4">
              Generate & Apply <Zap className="w-5 h-5 inline ml-2" />
            </button>
            <p className="text-center text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mt-3">
              Found a job? Just LazyMe it.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}