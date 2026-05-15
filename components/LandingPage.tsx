"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Upload, Target, Zap, CheckCircle2, 
  Rocket, FileText, Wand2, Send, MessageSquareQuote, 
  Plus, Palette, Code, X, Sparkles, Copy, Check, Loader2, MapPin
} from 'lucide-react';
import { signInAction } from '@/app/actions';
import { cn } from '@/lib/utils';

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
  const [isParsing, setIsParsing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const loginFormRef = useRef<HTMLFormElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectedFileRef.current = file;
      setUploadedFile({
        name: file.name,
        type: file.type
      });
    }
  };

  const handleSendClick = async () => {
    // If a file is uploaded, parse it first, store in localStorage, then login
    if (selectedFileRef.current) {
      setIsParsing(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFileRef.current);
        const res = await fetch('/api/parse-resume', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('lazyme_pending_resume', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Pre-parse failed:', error);
      } finally {
        setIsParsing(false);
      }
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

  const actions = [
    { 
      label: 'Analyze my resume', 
      icon: FileText, 
      color: 'text-primary',
      onClick: () => fileInputRef.current?.click()
    },
    { 
      label: 'Find YC startups', 
      icon: Rocket, 
      color: 'text-secondary',
      onClick: () => { setPrompt("List remote-first YC startups..."); setShowPromptHelper(true); }
    },
    { 
      label: 'Match this job', 
      icon: Zap, 
      color: 'text-tertiary',
      onClick: () => setShowJDModal(true)
    },
    { 
      label: 'Interview Q&A', 
      icon: MessageSquareQuote, 
      color: 'text-orange-400',
      onClick: () => setShowQNA(true)
    },
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

  const handleMatchPreview = () => {
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      setShowJDModal(false);
      setMatchResult({
        company: 'Demo Corp',
        role: 'AI Engineer',
        matchScore: 92,
        reason: 'Your experience with React and LLMs is a perfect fit.'
      });
    }, 2000);
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
    <div className="w-full bg-background text-on-background min-h-screen selection:bg-primary/30">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.docx"
        onChange={handleFileSelect} 
      />
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-20 pb-16 px-6 min-h-[90vh] bg-dot-grid overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container/20 border border-primary-container/40 hairline-border rounded-full mb-12"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Beta Access Open</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl w-full flex flex-col items-center text-center relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary-container/20 flex items-center justify-center mb-10 border border-primary/50 shadow-[0_20px_50px_rgba(255,178,186,0.2)]">
            <motion.div animate={{ rotate: isMatching ? 360 : 0 }} transition={{ repeat: Infinity, duration: 1 }}>
              <Wand2 className="w-10 h-10 text-primary fill-primary/20" />
            </motion.div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-on-surface leading-tight mb-6 tracking-tighter">
            {isMatching ? "Analyzing Profile..." : matchResult ? "High Match Detected!" : "Welcome to LazyMe AI"}
          </h1>
          <p className="text-on-surface-variant text-lg md:text-xl font-medium max-w-2xl mb-12 leading-relaxed">
            {matchResult 
              ? `We found a ${matchResult.matchScore}% match for ${matchResult.role} at ${matchResult.company}. Sign in to see the full analysis.`
              : "Upload your resume or paste a job link to get started. LazyMe AI is your technical companion for career growth."}
          </p>

          {!matchResult && (
            <div className="flex flex-wrap justify-center gap-4 mb-20">
              {actions.map((action, i) => (
                <motion.button 
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={action.onClick}
                  className="px-8 py-3.5 bg-surface-container border border-outline-variant rounded-full text-on-surface hover:bg-surface-container-high transition-all flex items-center gap-3 group shadow-xl hover:scale-105 active:scale-95"
                >
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{action.label}</span>
                </motion.button>
              ))}
            </div>
          )}

          {matchResult && (
            <form action={signInAction}>
              <button type="submit" className="px-12 py-5 bg-primary text-on-primary rounded-2xl font-bold text-xl shadow-2xl shadow-primary/40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-4">
                Login to See Full Report <ArrowRight className="w-6 h-6" />
              </button>
            </form>
          )}
        </motion.div>

        {/* Floating Prompt Bar */}
        <div className="w-full max-w-4xl px-4 mt-12 relative z-20">
          <AnimatePresence>
            {uploadedFile && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="mb-4 flex items-start"
              >
                <div className="relative group">
                  <div className="w-32 h-40 bg-white border border-outline-variant rounded-xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="flex-1 p-3 bg-surface-container-low/30 overflow-hidden">
                      <div className="space-y-1 opacity-20">
                        <div className="h-1 w-full bg-on-surface rounded" />
                        <div className="h-1 w-[80%] bg-on-surface rounded" />
                        <div className="h-1 w-[90%] bg-on-surface rounded" />
                        <div className="h-1 w-full bg-on-surface rounded" />
                      </div>
                    </div>
                    <div className="h-10 bg-surface-container-highest flex items-center px-3 gap-2 border-t border-outline-variant">
                      <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-[8px] font-bold text-white">PDF</div>
                      <span className="text-[10px] font-bold truncate max-w-[60px]">{uploadedFile.name}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setUploadedFile(null)}
                    className="absolute -top-2 -left-2 w-6 h-6 bg-surface-container-highest border border-outline-variant rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {showPromptHelper && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-surface-container-high border border-outline-variant rounded-3xl p-8 mb-6 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[11px] font-bold text-primary uppercase tracking-widest">AI Suggestions</h3>
                  <button onClick={() => setShowPromptHelper(false)}><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setPrompt(s.text); setShowPromptHelper(false); }} className="text-left p-4 bg-background border border-outline-variant rounded-xl hover:border-primary transition-all group">
                      <span className="text-[8px] font-bold text-primary uppercase block mb-1">{s.category}</span>
                      <p className="text-sm font-medium italic">"{s.text}"</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            
            {showJDModal && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-high border-2 border-primary/30 rounded-2xl p-6 shadow-2xl mb-4"
              >
                <textarea 
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste Job Description here..."
                  className="w-full h-40 bg-background border border-outline-variant rounded-xl p-4 text-on-surface outline-none focus:ring-1 focus:ring-primary mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowJDModal(false)} className="px-6 py-2 text-sm font-bold">Cancel</button>
                  <button onClick={handleMatchPreview} className="px-8 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg">
                    {isMatching ? "Analyzing..." : "Analyze Match"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden login form */}
          <form ref={loginFormRef} action={signInAction} className="hidden">
            <input type="hidden" name="redirectTo" value="/resume" />
          </form>

          <div className="bg-surface-container-high/90 backdrop-blur-2xl border border-outline-variant rounded-2xl p-3 flex items-center gap-4 shadow-[0_30px_100px_rgba(0,0,0,0.6)] group">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-surface-bright transition-all shadow-lg active:scale-90">
                <Plus className="w-6 h-6" />
              </button>
              <button type="button" onClick={() => setShowJDModal(!showJDModal)} className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface hover:bg-surface-bright transition-all shadow-lg active:scale-90">
                <Code className="w-6 h-6" />
              </button>
            </div>
            
            <input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onClick={() => setShowPromptHelper(true)}
              className="bg-transparent border-none focus:ring-0 text-on-surface w-full font-medium text-lg placeholder:text-on-surface-variant"
              placeholder="Tell LazyMe what to find next..."
            />

            <div className="flex items-center gap-3">
              <button type="button" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                <Palette className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={handleSendClick}
                disabled={isParsing}
                className="h-12 px-8 bg-primary-container text-on-primary-container rounded-xl flex items-center gap-3 font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isParsing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
                ) : (
                  <><span>Send</span><Send className="w-4 h-4 fill-on-primary-container" /></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-32 relative z-10">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.1 }} className="bg-surface-container-low border border-outline-variant rounded-3xl p-8 flex flex-col items-center hover:bg-surface-container transition-colors shadow-xl">
              <span className="text-4xl font-mono text-primary font-bold mb-2">{stat.value}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Modals for Q&A */}
      <AnimatePresence>
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
    </div>
  );
}
