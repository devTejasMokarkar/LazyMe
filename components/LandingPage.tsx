"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Upload, Target, Zap, CheckCircle2, 
  Rocket, FileText, Wand2, Send, MessageSquareQuote, 
  Plus, Palette, Code, X, Sparkles, Copy, Check, Loader2, MapPin, Lock
} from 'lucide-react';
import { signInAction } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import TopNav from './TopNav';

export default function LandingPage() {
  const [prompt, setPrompt] = useState('');
  const [showJDModal, setShowJDModal] = useState(false);
  const [showQNA, setShowQNA] = useState(false);
  const [jdText, setJdText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [copyStatus, setCopyStatus] = useState<number | null>(null);
  const [showPromptHelper, setShowPromptHelper] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string, type: string } | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<any>(null);
  const [appendPreview, setAppendPreview] = useState<any>(null);
  const [appendNotice, setAppendNotice] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const loginFormRef = useRef<HTMLFormElement>(null);

  const isResumeUploaded = !!uploadedFile || !!selectedFileRef.current;

  const actions = [
    { 
      label: 'Analyze my resume', 
      icon: FileText, 
      color: 'text-primary',
      onClick: () => fileInputRef.current?.click(),
      disabled: false
    },
    { 
      label: 'Match this job', 
      icon: isResumeUploaded ? Zap : Lock, 
      color: isResumeUploaded ? 'text-tertiary' : 'text-on-surface-variant/30',
      onClick: () => { if (isResumeUploaded) setShowJDModal(true); },
      disabled: !isResumeUploaded,
      tooltip: !isResumeUploaded ? 'Upload a resume first to unlock Job Matching' : undefined
    },
    { 
      label: 'Interview Q&A', 
      icon: MessageSquareQuote, 
      color: 'text-orange-400',
      onClick: () => setShowQNA(true),
      disabled: false
    },
  ];

  useEffect(() => {
    if (!showJDModal) {
      setJdError(null);
    }
  }, [showJDModal]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedFileRef.current = file;
      setParsedResumeData(null);
      setAppendPreview(null);
      setAppendNotice(null);
      setUploadedFile({
        name: file.name,
        type: file.type
      });
    }
  };

  const parseSelectedResume = async () => {
    if (parsedResumeData) return parsedResumeData;
    if (!selectedFileRef.current) return null;

    const formData = new FormData();
    formData.append('file', selectedFileRef.current);
    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to parse resume.");
    }
    setParsedResumeData(data);
    return data;
  };

  const appendExperienceToResume = (resume: any, entry: any) => ({
    ...resume,
    experience: [
      ...(Array.isArray(resume?.experience) ? resume.experience : []),
      {
        company: entry.company || 'Current Company',
        role: entry.role || 'New Project',
        duration: entry.duration || 'Current',
        bullets: Array.isArray(entry.bullets) && entry.bullets.length ? entry.bullets : [prompt.trim()]
      }
    ]
  });

  const formatEnhancedPrompt = (entry: any) => {
    const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
    return [
      `${entry?.company || 'Current Company'} | ${entry?.role || 'Project'} | ${entry?.duration || 'Current'}`,
      ...bullets.map((bullet: string) => `- ${bullet}`)
    ].join('\n');
  };

  const handleEnhancePrompt = async () => {
    const trimmedPrompt = prompt.trim();
    setAppendNotice(null);
    setAppendPreview(null);

    if (!trimmedPrompt) {
      setAppendNotice("Write what you want to add to your resume first.");
      return;
    }

    setIsEnhancing(true);
    try {
      let resume = null;
      let parseNotice: string | null = null;

      if (selectedFileRef.current) {
        try {
          resume = await parseSelectedResume();
        } catch (error) {
          parseNotice = "Resume parsing is unavailable right now. Previewing the append from your typed details.";
        }
      }

      const res = await fetch('/api/enhance-resume-append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt, resume })
      });
      const data = await res.json();

      if (!res.ok) {
        setAppendNotice(data.error || "Could not prepare the resume update.");
        return;
      }

      setAppendPreview(data.enhanced);
      if (data.enhanced) {
        setPrompt(formatEnhancedPrompt(data.enhanced));
        setShowPromptHelper(false);
      }
      setAppendNotice(parseNotice || data.message);
    } catch (error: any) {
      setAppendNotice("Could not use AI enhancement right now. Nothing was appended to your resume.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSendClick = async () => {
    setIsLoading(true);
    // If a file is uploaded, parse it first, store in localStorage, then login
    if (selectedFileRef.current) {
      setIsParsing(true);
      try {
        let data = await parseSelectedResume();
        if (appendPreview) {
          data = appendExperienceToResume(data, appendPreview);
        }
        localStorage.removeItem('lazyme_pending_resume');
        localStorage.setItem('lazyme_pending_resume', JSON.stringify(data));
        // Notify other components/pages about the new pending resume
        window.dispatchEvent(new Event('pendingResumeReady'));
        // Also trigger a storage event manually for same-page listeners
        window.dispatchEvent(new StorageEvent('storage', { key: 'lazyme_pending_resume', newValue: JSON.stringify(data) }));
      } catch (error) {
        console.error('Pre-parse failed:', error);
        setIsLoading(false);
        setAppendNotice(error instanceof Error ? error.message : "Failed to parse resume.");
        return;
      } finally {
        setIsParsing(false);
      }
    } else if (appendPreview) {
      setIsLoading(false);
      setAppendNotice("Upload your resume first, then Send will append this entry.");
      return;
    }
    // Now trigger the login form
    loginFormRef.current?.requestSubmit();
  };

  const stats = [
    { value: '2,847', label: 'Active Users' },
    { value: '18,492', label: 'Jobs Applied' },
    { value: '4.2 min', label: 'Avg Apply Time' },
  ];

  const suggestions = [
    { text: "Rewrite my experience bullet points using the Google X-Y-Z formula", category: "Optimization" },
    { text: "Find remote-first YC startups in the AI space", category: "Discovery" },
    { text: "Generate a cover letter for a Senior Frontend role at Stripe", category: "Matching" },
    { text: "What are the most common system design questions for L5 roles?", category: "Preparation" }
  ];



  const interviewQNA = [
    {
      q: "Salary Negotiation: How to handle the 'What are your expectations?' question?",
      a: "Deflect early on by saying: 'I'm more interested in finding the right fit right now, and I'm sure we can reach a fair agreement based on the value I bring and the market rate.' If pressed, provide a researched range: 'Based on my research for this role and location, I'm looking for a range between $X and $Y.'"
    },
    {
      q: "Why did you leave (or are you leaving) your last company?",
      a: "Keep it positive and growth-oriented: 'I've had a great experience at [Company], but I feel I've reached a point where I'm looking for new challenges that align more closely with my long-term career goals, specifically in [Area of Interest]. I'm excited about the opportunity here because...'"
    }
  ];

  const [jdError, setJdError] = useState<string | null>(null);

  const handleMatchPreview = async () => {
    setJdError(null);

    if (!selectedFileRef.current) {
      setJdError("Please upload a resume first using the '+' button or 'Analyze my resume' action.");
      return;
    }

    const trimmedJd = jdText.trim();
    if (!trimmedJd || trimmedJd.length < 20) {
      setJdError("Please enter a valid job description (at least 20 characters) to analyze.");
      return;
    }

    setIsMatching(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFileRef.current);
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setJdError(data.error || "Failed to parse the uploaded resume.");
        setIsMatching(false);
        return;
      }

      // Save parsed data to localStorage so it is available post-login
      localStorage.setItem('lazyme_pending_resume', JSON.stringify(data));

      // Heuristic 1: Extract Job Title
      let matchedRole = data.title || "Software Engineer";
      const commonRoles = [
        "Frontend Engineer", "Frontend Developer", "Backend Engineer", "Backend Developer",
        "Fullstack Engineer", "Fullstack Developer", "Software Engineer", "Software Developer",
        "AI Engineer", "Machine Learning Engineer", "Data Scientist", "Product Manager",
        "Project Manager", "DevOps Engineer", "UI/UX Designer", "Product Designer",
        "Mobile Developer", "iOS Developer", "Android Developer", "QA Engineer"
      ];
      for (const role of commonRoles) {
        const regex = new RegExp(`\\b${role}\\b`, 'i');
        if (regex.test(trimmedJd)) {
          matchedRole = role;
          break;
        }
      }

      // Heuristic 2: Extract Company Name
      let matchedCompany = "Selected Company";
      const companyRegex = /(?:at|for|hiring\s+by)\s+([A-Z][a-zA-Z0-9\s.]{2,20})(?:\b)/;
      const match = trimmedJd.match(companyRegex);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const genericWords = ["Our", "We", "The", "A", "An", "You", "Your", "This", "Join", "Apply"];
        if (!genericWords.includes(candidate)) {
          matchedCompany = candidate;
        }
      }

      // Heuristic 3: Compute Score based on Skills match
      const skills = Array.isArray(data.skills) ? data.skills : [];
      let matchCount = 0;
      skills.forEach((skill: string) => {
        if (skill && skill.length > 1) {
          const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
          if (regex.test(trimmedJd)) {
            matchCount++;
          }
        }
      });

      const matchScore = Math.min(96, Math.max(65, 70 + matchCount * 3));

      setMatchResult({
        company: matchedCompany,
        role: matchedRole,
        matchScore,
        reason: `Matched ${matchCount} skills from your resume with the job requirements.`
      });
      setShowJDModal(false);
    } catch (err) {
      console.error("Match preview failed:", err);
      setJdError("Network error. Please try again.");
    } finally {
      setIsMatching(false);
    }
  };

  const steps = [
    { title: 'Upload Resume', icon: Upload, desc: 'Our AI parses your experience into a technical knowledge graph ready for injection.', step: '01' },
    { title: 'Match & Optimize', icon: Target, desc: 'We scan thousands of live job boards, matching your profile and tailoring every keyword.', step: '02' },
    { title: 'Autopilot Apply', icon: Zap, desc: 'The engine submits your application through verified portals with zero human friction.', step: '03' },
  ];

  const feedItems = [
    { company: 'Stripe', role: 'Software Engineer (L4)', location: 'Remote, USA', match: 92, color: '#635BFF', initials: 'S' },
    { company: 'Linear', role: 'Product Designer', location: 'San Francisco, CA', match: 87, color: '#FFFFFF', initials: 'L' },
  ];

  return (
    <div className="w-full bg-background text-on-background min-h-screen selection:bg-primary/30 flex flex-col justify-between">
      <TopNav />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.docx"
        onChange={handleFileSelect} 
      />
      
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-6 bg-dot-grid overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Beta Access Open</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full flex flex-col items-center text-center relative z-10"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <motion.div animate={{ rotate: isMatching ? 360 : 0 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Wand2 className="w-8 h-8 text-primary fill-primary/20" />
            </motion.div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-on-surface leading-tight mb-4 tracking-tighter max-w-3xl">
            {isMatching ? "Analyzing Profile..." : matchResult ? "High Match Detected!" : "Welcome to LazyMe AI"}
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg font-medium max-w-2xl mb-8 leading-relaxed">
            {matchResult 
              ? `We found a ${matchResult.matchScore}% match for ${matchResult.role} at ${matchResult.company}. Sign in to see the full analysis.`
              : "Upload your resume or paste a job link to get started. LazyMe AI is your technical companion for career growth."}
          </p>

          {!matchResult && (
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {actions.map((action, i) => (
                <motion.button 
                  key={action.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  title={action.tooltip}
                  className={cn(
                    "px-5 py-2.5 glass rounded-full text-on-surface transition-all flex items-center gap-2 group shadow-lg",
                    action.disabled 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:bg-white/5 hover:scale-102 active:scale-98"
                  )}
                >
                  <action.icon className={cn("w-4 h-4 transition-transform", !action.disabled && "group-hover:scale-110", action.color)} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{action.label}</span>
                </motion.button>
              ))}
            </div>
          )}

          {matchResult && (
            <form action={signInAction}>
              <button type="submit" className="btn-primary px-8 py-4 rounded-xl font-bold text-base shadow-xl">
                Login to See Full Report <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </motion.div>

        {/* Floating Prompt Bar Container */}
        <div className="w-full max-w-3xl px-4 mt-4 relative z-20">
          <AnimatePresence>
            {uploadedFile && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="mb-3 flex justify-center"
              >
                <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-high border border-outline-variant rounded-xl shadow-lg backdrop-blur-md">
                  <div className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center text-[9px] font-bold text-red-400">PDF</div>
                  <div className="text-left max-w-[180px]">
                    <p className="text-xs font-bold truncate text-on-surface">{uploadedFile.name}</p>
                    <p className="text-[9px] text-on-surface-variant uppercase font-semibold">Ready to parse</p>
                  </div>
                  <button 
                    onClick={() => {
                      selectedFileRef.current = null;
                      setUploadedFile(null);
                      setParsedResumeData(null);
                      setAppendPreview(null);
                      setAppendNotice(null);
                    }}
                    className="ml-2 p-1 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {appendNotice && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-3 flex justify-center"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{appendNotice}</span>
                  <button
                    onClick={() => setAppendNotice(null)}
                    className="p-0.5 text-primary/70 hover:text-primary"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {showJDModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-xl glass rounded-2xl p-6 shadow-2xl text-left"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-on-surface">Paste Job Description</h3>
                    <button onClick={() => setShowJDModal(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-1 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                   <textarea 
                    value={jdText}
                    onChange={(e) => {
                      setJdText(e.target.value);
                      if (jdError) setJdError(null);
                    }}
                    placeholder="Paste Job Description here..."
                    className="w-full h-48 bg-background border border-outline-variant rounded-xl p-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary mb-4 resize-none"
                  />
                  {jdError && (
                    <div className="mb-4 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-lg">
                      {jdError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowJDModal(false)} className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-all">Cancel</button>
                    <button onClick={handleMatchPreview} disabled={isMatching} className="btn-primary px-6 py-2 text-xs font-bold shadow-lg disabled:opacity-50">
                      {isMatching ? "Analyzing..." : "Analyze Match"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Hidden login form */}
          <form ref={loginFormRef} action={signInAction} className="hidden">
            <input type="hidden" name="redirectTo" value="/resume" />
          </form>

          {/* Prompt Bar */}
          <div className="glass rounded-xl p-2 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-10 h-10 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
                title="Upload Resume"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={() => setShowJDModal(true)} 
                className="w-10 h-10 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
                title="Paste Job Description"
              >
                <Code className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowPromptHelper(true)}
                className="w-10 h-10 rounded-lg hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-95"
                title="AI Suggestions"
              >
                <Palette className="w-5 h-5" />
              </button>
            </div>
            
            <textarea 
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setAppendPreview(null);
                setAppendNotice(null);
              }}
              rows={appendPreview ? 4 : 1}
              className="bg-transparent border-none focus:ring-0 text-on-surface w-full font-medium text-base placeholder:text-on-surface-variant/60 outline-none resize-none leading-relaxed max-h-36 overflow-y-auto py-2"
              placeholder="Tell LazyMe what to find next..."
            />

            <button
              type="button"
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || !prompt.trim()}
              className="h-10 px-4 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Preview the optimized resume entry before appending"
            >
              {isEnhancing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enhancing...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Enhance prompt</>
              )}
            </button>

            <button 
              type="button" 
              onClick={handleSendClick}
              disabled={isParsing}
              className="h-10 px-5 btn-primary rounded-lg flex items-center gap-2 font-bold text-xs shadow-lg disabled:opacity-50 shrink-0"
            >
              {isParsing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Parsing...</>
              ) : (
                <><span>Send</span><Send className="w-3 h-3 fill-white" /></>
              )}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mt-16 relative z-10">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 + i * 0.05 }} 
              className="bg-white/2 flex flex-col items-center justify-center p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
            >
              <span className="text-xl md:text-2xl font-mono text-primary font-bold mb-1">{stat.value}</span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Modals for Q&A */}
      <AnimatePresence>
        {showPromptHelper && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-outline-variant/30"
            >
              <div className="p-8 border-b border-outline-variant flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">AI Suggestions</h3>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">LazyMe Prompt Library</p>
                  </div>
                </div>
                <button onClick={() => setShowPromptHelper(false)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(s.text);
                      setAppendPreview(null);
                      setAppendNotice(null);
                      setShowPromptHelper(false);
                    }}
                    className="text-left p-5 bg-background border border-outline-variant hover:border-primary/50 rounded-2xl transition-all group"
                  >
                    <span className="text-[9px] font-bold text-primary uppercase block mb-2 tracking-widest">{s.category}</span>
                    <p className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface leading-relaxed">"{s.text}"</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showQNA && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-surface-container rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-outline-variant/30">
              <div className="p-8 border-b border-outline-variant flex justify-between items-center">
                <h3 className="text-2xl font-bold">Interview Mastery</h3>
                <button onClick={() => setShowQNA(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {interviewQNA.map((item, idx) => (
                  <div key={idx} className="space-y-4">
                    <h4 className="text-lg font-bold text-primary italic">Q: {item.q}</h4>
                    <p className="text-on-surface-variant leading-relaxed p-6 bg-background rounded-2xl border border-outline-variant">{item.a}</p>
                  </div>
                ))}
              </div>
              <form action={signInAction} className="p-8 border-t border-outline-variant">
                <button type="submit" className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold shadow-xl">Login to Unlock 50+ More Questions</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Re-use existing sections from original LandingPage */}
      <section className="py-32 px-6 bg-surface-container-lowest/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">Precision Engineering</h2>
            <p className="text-on-surface-variant text-xl font-medium">The engine that automates your career trajectory.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div key={step.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }} className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-3xl bg-surface-container-high border border-outline-variant flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-2xl">
                  <step.icon className="w-10 h-10 text-secondary" />
                </div>
                <div className="font-mono text-primary text-xl font-bold mb-3">{step.step}</div>
                <h3 className="text-2xl font-bold mb-4 tracking-tight">{step.title}</h3>
                <p className="text-on-surface-variant leading-relaxed font-medium text-lg">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 border-t border-outline-variant">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex items-center gap-4">
             <div className="w-4 h-4 rounded-full bg-primary" />
             <span className="font-bold text-2xl tracking-tighter">LazyMe AI</span>
          </div>
          <div className="text-[10px] font-mono text-outline uppercase tracking-[0.3em] opacity-40">
            v2.4.0-stable // 2024
          </div>
        </div>
      </footer>

      {/* Global Loader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-sm font-semibold text-on-surface tracking-wider">
                {isParsing ? "Parsing Resume & Preparing Session..." : "Initializing Session..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
