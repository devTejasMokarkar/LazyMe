"use client";

import { useState } from "react";
import { FileUp, Wand2, Zap, ArrowRight, ChevronRight } from "lucide-react";
import { ResumeUpload } from "./ResumeUpload";
import { useToast } from "./ToastProvider";

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
  const [parsedData, setParsedData] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [generateCover, setGenerateCover] = useState(true);
  const { showToast } = useToast();

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
    setTimeout(() => {
      setStep(2);
      showToast("Resume uploaded! Let's add the job details.", "success");
    }, 800);
  };

  const handleFinish = () => {
    if (!jobTitle.trim()) {
      showToast("Please enter a job title", "error");
      return;
    }
    onComplete({
      mode,
      parsedData,
      jobDescription,
      companyName,
      jobTitle,
      companyEmail,
      generateCover,
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= i ? "bg-primary text-white" : "bg-slate-800 text-slate-500"
            }`}>
              {i + 1}
            </div>
            {i < 2 && (
              <div className={`flex-1 h-1 rounded-full transition-all ${
                step > i ? "bg-primary" : "bg-slate-800"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Choose Mode */}
      {step === 0 && (
        <div className="animate-slide-up">
          <h1 className="text-3xl font-bold mb-2 gradient-text">LazyMe AI</h1>
          <p className="text-slate-400 mb-8">Apply to jobs in under 2 minutes</p>

          <div className="space-y-3">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setStep(1); }}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${
                  mode === m.id
                    ? "border-primary bg-primary/5"
                    : "border-slate-700 hover:border-slate-500 bg-slate-800/30"
                }`}
              >
                <div className={`p-3 rounded-xl ${mode === m.id ? "bg-primary/20 text-primary" : "bg-slate-700 text-slate-400"}`}>
                  {m.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-100">{m.title}</h3>
                  <p className="text-sm text-slate-400">{m.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Upload or Quick Input */}
      {step === 1 && mode === "upload" && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">Upload Your Resume</h2>
          <ResumeUpload onParsed={handleParsed} />
          <p className="text-center text-slate-500 text-sm mt-4">
            We use AI to extract and structure your resume data automatically.
          </p>
        </div>
      )}

      {step === 1 && mode === "build" && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">Build Your Resume</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="input-field"
              value={parsedData?.name || ""}
              onChange={e => setParsedData({ ...parsedData, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="input-field"
              value={parsedData?.email || ""}
              onChange={e => setParsedData({ ...parsedData, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Job Title (e.g. Senior Frontend Engineer)"
              className="input-field"
              value={parsedData?.title || ""}
              onChange={e => setParsedData({ ...parsedData, title: e.target.value })}
            />
            <button onClick={() => setStep(2)} className="btn-primary w-full">
              Continue <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {step === 1 && mode === "quick" && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(0)} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">Job Ready Mode</h2>
          <div className="space-y-4">
            <textarea
              placeholder="Paste the full job description here..."
              className="input-field min-h-[200px] resize-none"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
            <button
              onClick={() => {
                if (!jobDescription.trim()) {
                  showToast("Please paste a job description", "error");
                  return;
                }
                setStep(2);
              }}
              className="btn-primary w-full"
            >
              Continue <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Job Details */}
      {step === 2 && (
        <div className="animate-slide-up">
          <button onClick={() => setStep(mode === "upload" ? 1 : 0)} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>
          <h2 className="text-2xl font-bold mb-6">Job Details</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Job Title *"
              className="input-field"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Company Name"
              className="input-field"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Recruiter Email (optional)"
              className="input-field"
              value={companyEmail}
              onChange={e => setCompanyEmail(e.target.value)}
            />
            <textarea
              placeholder="Job Description (optional but recommended for ATS optimization)"
              className="input-field min-h-[120px] resize-none"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generateCover}
                onChange={e => setGenerateCover(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-slate-300">Generate cover letter too</span>
            </label>
            <button onClick={handleFinish} className="btn-primary w-full text-lg py-4">
              Generate & Apply <Zap className="w-5 h-5 inline ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
