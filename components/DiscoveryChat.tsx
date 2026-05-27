"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Rocket, Zap, FileText, Plus, Send, 
  Palette, Code, X, Sparkles, 
  MessageSquareQuote, Loader2, Wand2, Copy, FilePlus2
} from 'lucide-react';
import { cn, validateParsedResume, calculateResumeCompleteness } from '@/lib/utils';

export default function DiscoveryChat() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showJDModal, setShowJDModal] = useState(false);
  const [jdText, setJdText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [showQNA, setShowQNA] = useState(false);
  const [interviewQNA, setInterviewQNA] = useState<{q: string; a: string}[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [uploadedResume, setUploadedResume] = useState<{ name: string; data: any } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    setIsMatching(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        // Validate the parsed data before accepting it
        const validationError = validateParsedResume(data);
        if (validationError) {
          setUploadError(validationError);
          return; // don't set uploadedResume — block Send
        }

        // Check completeness - must be at least 70%
        const completeness = calculateResumeCompleteness(data);
        if (completeness < 70) {
          setUploadError(
            `Failed to parse PDF completely. Only ${completeness}% of details were extracted. ` +
            `The file may be image-based or corrupted. Please try a different format (DOCX or text-based PDF).`
          );
          return;
        }

        // Store parsed resume in state — don't redirect, let the user click Send
        setUploadedResume({ name: file.name, data });
      } else {
        setUploadError(data.error || "Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setIsMatching(false);
    }
  };

  const handleMatchJob = async () => {
    if (!jdText) return;
    setIsMatching(true);
    setShowJDModal(false);

    try {
      // Get primary resume first
      const resRes = await fetch('/api/resumes');
      const resumes = await resRes.json();
      const primary = resumes.find((r: any) => r.isDefault) || resumes[0];

      if (!primary) {
        alert("Please upload a resume first!");
        setIsMatching(false);
        return;
      }

      const res = await fetch('/api/discover-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: primary.content,
          jobs: [{
            id: 'manual-match',
            company: 'Target Company',
            role: 'Interested Role',
            description: jdText,
            applyType: 'external'
          }]
        })
      });

      const data = await res.json();
      setMatchResult(data.jobs[0]);
    } catch (error) {
      console.error("Match failed:", error);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreateResume = async () => {
    if (!prompt.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/create-resume-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt.trim() })
      });
      const data = await res.json();
      if (res.ok && data.resume) {
        localStorage.setItem('lazyme_pending_resume', JSON.stringify(data.resume));
        window.dispatchEvent(new Event('pendingResumeReady'));
        window.dispatchEvent(new StorageEvent('storage', { key: 'lazyme_pending_resume', newValue: JSON.stringify(data.resume) }));
        setPrompt('');
        setIsCreateMode(false);
        router.push('/resume');
      } else {
        setCreateError(data.error || 'Failed to generate resume. Please try again.');
      }
    } catch (error) {
      console.error('Create resume failed:', error);
      setCreateError('Failed to create resume. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendAction = () => {
    if (isCreateMode) {
      handleCreateResume();
    } else if (uploadedResume) {
      localStorage.setItem('lazyme_pending_resume', JSON.stringify(uploadedResume.data));
      window.dispatchEvent(new Event('pendingResumeReady'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'lazyme_pending_resume', newValue: JSON.stringify(uploadedResume.data) }));
      router.push('/resume');
    } else if (prompt.toLowerCase().includes('yc') || prompt.toLowerCase().includes('startups')) {
      router.push('/board');
    } else if (prompt.trim()) {
      alert('LazyMe AI is processing your request...');
    }
  };

  const actions = [
    { 
      label: 'Analyze my resume', 
      icon: FileText, 
      color: 'text-primary',
      onClick: () => router.push('/resume')
    },
    { 
      label: 'Find YC startups', 
      icon: Rocket, 
      color: 'text-secondary',
      onClick: () => setPrompt("List remote-first YC startups in the AI space that raised recently")
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
      color: 'text-tertiary', 
      onClick: () => setShowQNA(true)
    },
    {
      label: 'Create Resume',
      icon: FilePlus2,
      color: 'text-secondary',
      onClick: () => { setIsCreateMode(true); setCreateError(null); }
    },
  ];

  return (
    <div className="flex-1 flex flex-col relative h-full bg-dot-grid">
      {/* Central Identity */}
      <section className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto pb-48">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl w-full flex flex-col items-center text-center"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary-container/20 flex items-center justify-center mb-10 border border-primary/50 shadow-[0_20px_50px_rgba(255,178,186,0.2)]">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,image/*"
            />
            <motion.div
              animate={isMatching ? { rotate: 360 } : { rotate: [0, 10, -10, 0] }}
              transition={isMatching ? { repeat: Infinity, duration: 1, ease: "linear" } : { repeat: Infinity, duration: 2 }}
            >
              <Wand2 className="w-10 h-10 text-primary fill-primary/20" />
            </motion.div>
          </div>
          
          <h2 className="text-6xl font-bold text-primary leading-tight mb-6 tracking-tighter">
            {isCreating ? "AI Creating Your Resume..." : isMatching ? "AI Analysing Match..." : isCreateMode ? "Create Your Resume" : "Welcome to LazyMe AI"}
          </h2>
          <p className="text-on-surface-variant text-xl font-medium max-w-lg mb-12 leading-relaxed">
            {isCreating ? "Our AI is generating a professional resume from your details. This may take a moment."
              : isMatching ? "Our models are comparing your profile against the provided job requirements."
              : isCreateMode ? "Describe yourself below — your name, skills, experience, education — and AI will build a complete resume for you."
              : "Upload your resume or paste a job link to get started. LazyMe AI is your technical companion for high-efficiency career growth."}
          </p>

          {createError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg w-full mb-6 p-4 bg-error/10 border border-error/30 rounded-2xl text-error text-sm font-medium flex items-center gap-3"
            >
              <X className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
              <button onClick={() => setCreateError(null)} className="ml-auto text-error/60 hover:text-error">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {!isMatching && !isCreating && !matchResult && (
            <div className="flex flex-wrap justify-center gap-3">
              {actions.map((action, i) => (
                <motion.button 
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  onClick={action.onClick}
                  className="px-5 py-3 sm:px-8 sm:py-3.5 bg-surface-container border border-outline-variant rounded-full text-primary hover:bg-surface-container-high transition-all flex items-center gap-2 sm:gap-3 group shadow-xl hover:scale-105 active:scale-95"
                >
                  <action.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${action.color}`} />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">{action.label}</span>
                </motion.button>
              ))}
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={() => setShowQNA(true)}
                className="px-5 py-3 sm:px-8 sm:py-3.5 bg-tertiary/10 border border-tertiary/30 rounded-full text-tertiary hover:bg-tertiary/20 transition-all flex items-center gap-2 sm:gap-3 group shadow-xl hover:scale-105 active:scale-95"
              >
                <MessageSquareQuote className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">Interview Q&A</span>
              </motion.button>
            </div>
          )}

          {matchResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl bg-surface-container border border-outline-variant rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-32 h-32 text-primary fill-primary" />
              </div>
              <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="text-5xl font-mono font-bold text-primary">{matchResult.matchScore}%</div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">AI MATCH SCORE</div>
                
                <div className="grid grid-cols-3 gap-4 w-full mt-4">
                  {matchResult.matchFactors.map((f: any) => (
                    <div key={f.label} className="bg-background/50 p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-2">
                       <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest">{f.label}</span>
                       <div className="flex items-center justify-between">
                         <div className="flex-1 bg-surface-container-highest h-1 rounded-full mr-3 overflow-hidden">
                           <div className="bg-primary h-full rounded-full" style={{ width: `${f.score}%` }} />
                         </div>
                         <span className="text-[10px] font-mono font-bold">{f.score}%</span>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {matchResult.tags.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-lg text-[9px] font-bold uppercase tracking-widest">{tag}</span>
                  ))}
                </div>

                <button 
                  onClick={() => setMatchResult(null)}
                  className="mt-8 text-[11px] font-bold text-primary uppercase tracking-[0.2em] hover:underline"
                >
                  Start New Analysis
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Floating Prompt Bar */}
      <div className="fixed bottom-12 left-4 right-4 lg:left-[calc(240px+48px)] lg:right-[48px] z-40">
        <div className="max-w-6xl mx-auto space-y-4">
          


          {/* JD Input Area */}
          <AnimatePresence>
            {showJDModal && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-high border-2 border-primary/30 rounded-2xl p-4 shadow-2xl mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                    <Code className="w-4 h-4" /> Paste Job Description
                  </span>
                  <button onClick={() => setShowJDModal(false)} className="text-on-surface-variant hover:text-error"><X className="w-4 h-4" /></button>
                </div>
                
                <div 
                  contentEditable
                  onInput={(e) => setJdText(e.currentTarget.innerHTML)}
                  className="w-full h-48 bg-background border border-outline-variant rounded-xl p-4 text-primary placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-xs overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: jdText }}
                />
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleMatchJob}
                    className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    {isMatching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Analyze Match
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-surface-container-high/90 backdrop-blur-2xl border border-outline-variant rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-4 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary hover:bg-surface-container-highest transition-all shadow-lg active:scale-90"
              >
                {isMatching ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6 border-outline text-on-background" />}
              </button>
              <button 
                onClick={() => setShowJDModal(!showJDModal)}
                className={cn(
                  "hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl items-center justify-center transition-all shadow-lg active:scale-90",
                  showJDModal ? "bg-primary text-on-primary" : "bg-surface-container-highest text-primary hover:bg-surface-container-highest"
                )}
              >
                <Code className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">

              <div className="flex-1 flex flex-col gap-1 min-w-0">
                {uploadedResume && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg w-fit max-w-full">
                    <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-primary truncate max-w-[120px] sm:max-w-[180px]">{uploadedResume.name}</span>
                    <button
                      onClick={() => setUploadedResume(null)}
                      className="text-primary/60 hover:text-primary transition-colors ml-1 shrink-0"
                    >
                      <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                )}
                {uploadError && (
                  <span className="text-[10px] sm:text-[11px] text-error font-medium px-1">{uploadError}</span>
                )}
                <input 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAction();
                    }
                  }}
                  className="bg-transparent border-none focus:ring-0 text-primary w-full font-medium text-sm sm:text-lg placeholder:text-on-surface-variant"
                  placeholder={isCreateMode ? "I'm John Doe, a full-stack developer with 3 years experience in React & Node.js..." : uploadedResume ? "Add a message or click Send to view your resume..." : "Tell LazyMe what to find next..."}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <button className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {isCreateMode && (
                <button
                  onClick={() => { setIsCreateMode(false); setCreateError(null); setPrompt(''); }}
                  className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest flex items-center gap-1.5 font-bold text-[10px] sm:text-xs transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              )}
              <button
                onClick={handleSendAction}
                disabled={isCreating}
                className={cn(
                  "h-10 sm:h-12 px-4 sm:px-8 rounded-xl flex items-center gap-2 sm:gap-3 font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-lg",
                  isCreateMode
                    ? "bg-secondary text-on-secondary shadow-secondary/20 hover:brightness-110"
                    : "bg-primary-container text-on-primary-container shadow-primary/20 hover:brightness-110"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">{isCreateMode ? 'Generate Resume' : 'Send'}</span>
                    {isCreateMode ? <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-on-primary-container" />}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Interview Q&A Modal */}
      <AnimatePresence>
        {showQNA && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQNA(false)}
              className="absolute inset-0 bg-on-background/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-outline-variant/30"
            >
              <div className="p-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <MessageSquareQuote className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Interview Mastery</h3>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">LazyMe AI Career Guide</p>
                  </div>
                </div>
                <button onClick={() => setShowQNA(false)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {interviewQNA.map((item, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <span className="text-2xl font-black text-[rgba(0,107,80,0.2)] font-mono">0{idx + 1}</span>
                       <h4 className="text-lg font-bold text-primary leading-tight pt-1">{item.q}</h4>
                    </div>
                    <div className="ml-12 p-6 bg-background rounded-[1.5rem] border border-outline-variant shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-tertiary" style={{ opacity: 0.3 }} />
                       <p className="text-on-surface-variant leading-relaxed text-sm">{item.a}</p>
                       <button 
                         onClick={() => { navigator.clipboard.writeText(item.a); }}
                         className="mt-6 flex items-center gap-2 text-[10px] font-bold text-tertiary uppercase tracking-widest hover:brightness-110 transition-all"
                       >
                         <Copy className="w-3 h-3" /> Copy Answer
                       </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 border-t border-outline-variant bg-surface-container-low text-center">
                <p className="text-[11px] text-on-surface-variant font-medium">Use these answers as a baseline and tailor them to your unique experiences.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
