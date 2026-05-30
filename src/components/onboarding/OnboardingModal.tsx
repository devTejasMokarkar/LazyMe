"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ArrowRight, Upload, Sparkles, Loader2, FileType, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle rate limit specifically
        if (res.status === 429 && data.quota?.retryAfterSeconds) {
          let seconds = data.quota.retryAfterSeconds;
          setError(`${data.error}`);
          
          const interval = setInterval(() => {
            seconds -= 1;
            if (seconds <= 0) {
              clearInterval(interval);
              setError(null);
            } else {
              setError(`${data.error} (Retrying in ${seconds}s...)`);
            }
          }, 1000);
          return;
        }
        throw new Error(data.error || 'Parsing failed');
      }
      
      setParsedData(data);
      setStep(2); // Move to analysis view
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const getTopSkills = () => {
    if (!parsedData?.skills) return [];
    return parsedData.skills.slice(0, 4).map((s: string) => ({
      name: s,
      strength: Math.floor(Math.random() * (95 - 75) + 75) // Mock strength for UI
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-surface-container-low border border-outline-variant rounded-3xl overflow-hidden flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="p-8 border-b border-outline-variant flex flex-col items-center text-center gap-4">
          <div className="flex gap-2 mb-2">
            {[1, 2].map(i => (
              <div key={i} className={cn(
                "w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(255,178,186,0.6)]",
                step >= i ? "bg-primary" : "bg-outline-variant opacity-30"
              )} />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">
            {step === 1 ? "Welcome to LazyMe AI" : "AI Profile Analysis"}
          </h1>
          <p className="text-on-surface-variant font-medium">
            {step === 1 ? "Let's build your professional graph to automate your job search." : "We've structured your experience. Review your technical core."}
          </p>
        </div>

        {/* Content */}
        <div className="p-10">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="relative group w-full">
                  <input 
                    type="file" 
                    onChange={handleFileUpload}
                    className="hidden" 
                    id="onboarding-upload"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,image/*"
                  />
                  <label 
                    htmlFor="onboarding-upload"
                    className={cn(
                      "flex flex-col items-center justify-center bg-surface-container border-2 border-dashed border-outline-variant rounded-3xl p-12 cursor-pointer transition-all hover:bg-surface-container-high group-hover:border-primary/50",
                      isParsing && "pointer-events-none opacity-50"
                    )}
                  >
                    {isParsing ? (
                      <div className="flex flex-col items-center gap-6">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <span className="font-bold text-primary uppercase tracking-widest text-xs">Parsing Resume...</span>
                      </div>
                    ) : (
                        <>
                          <Upload className="w-12 h-12 text-on-surface-variant mb-4 group-hover:text-primary transition-colors" />
                          <span className="font-bold text-primary uppercase tracking-widest text-xs mb-2">Upload Resume</span>
                          <span className="text-on-surface-variant text-sm">PDF, DOCX, TXT, or image (PNG, JPG) — Max 5MB</span>
                        </>
                      )}
                  </label>
                </div>
                {error && <p className="text-error text-sm font-bold">{error}</p>}
                
                <div className="flex gap-4">
                  <span className="flex items-center gap-2 text-[10px] font-bold text-outline-variant uppercase tracking-widest bg-background/50 px-3 py-1.5 rounded-lg border border-outline-variant"><FileType className="w-3 h-3" /> ATS Friendly</span>
                  <span className="flex items-center gap-2 text-[10px] font-bold text-outline-variant uppercase tracking-widest bg-background/50 px-3 py-1.5 rounded-lg border border-outline-variant"><Sparkles className="w-3 h-3" /> GPT-4o Enhanced</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-10"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Extracted Skills & Proficiency</span>
                    <span className="text-[11px] font-bold text-tertiary uppercase tracking-[0.2em]">Ready for Auto-Pilot</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getTopSkills().map((skill: any) => (
                      <div key={skill.name} className="bg-surface-container border border-outline-variant p-5 rounded-2xl flex flex-col gap-3 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-primary">{skill.name}</span>
                          <span className="font-mono text-primary font-bold">{skill.strength}%</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.strength}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="bg-primary h-full rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendation */}
                <section className="bg-primary-container/10 rounded-2xl p-6 border border-primary/20 flex gap-6 items-start shadow-[0_10px_30px_rgba(255,178,186,0.05)]">
                  <div className="p-3 bg-primary-container/20 rounded-xl text-primary shrink-0 shadow-lg">
                    <Wand2 className="w-6 h-6 fill-primary/20" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">AI Recommendation</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                      Based on your <span className="text-primary font-bold">{parsedData?.title || 'profile'}</span> experience, we've optimized your dashboard to highlight high-match engineering roles at tier-1 startups.
                    </p>
                  </div>
                </section>

                <div className="flex flex-wrap gap-3">
                  {['Resume Parsed', 'Identity Synced', 'Graph Created'].map((status, i) => (
                    <span key={status} className="px-4 py-2 bg-background/50 border border-outline-variant rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" /> 
                      {status}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/50 backdrop-blur-md">
          <button 
            onClick={() => step === 2 ? setStep(1) : onClose()}
            className="px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            {step === 2 ? "Back" : "Skip"}
          </button>
          <button 
            onClick={onClose}
            disabled={step === 1 && !parsedData}
            className={cn(
              "group px-10 py-4 font-bold text-sm uppercase tracking-widest rounded-xl active:scale-95 transition-all flex items-center gap-3 shadow-2xl",
              step === 1 && !parsedData ? "bg-outline-variant/20 text-on-surface-variant/40 cursor-not-allowed" : "bg-primary-container text-on-primary-container hover:brightness-110 shadow-primary/20"
            )}
          >
            {step === 1 ? "Parsing Required" : "Go to Dashboard"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
