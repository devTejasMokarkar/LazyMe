import React from 'react';
import { motion } from 'motion/react';
import { Wand2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const skills = [
    { name: 'React & Next.js', strength: 85 },
    { name: 'TypeScript', strength: 92 },
    { name: 'UI/UX Design', strength: 78 },
    { name: 'System Design', strength: 64 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-surface-container-low border hairline-border rounded-3xl overflow-hidden flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="p-8 border-b hairline-border flex flex-col items-center text-center gap-4">
          <div className="flex gap-2 mb-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,178,186,0.6)]" />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Step 3: AI Analysis</h1>
          <p className="text-on-surface-variant font-medium">We've parsed your profile. Review your technical core.</p>
        </div>

        {/* Content */}
        <div className="p-10 space-y-10">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Extracted Skills & Proficiency</span>
              <span className="text-[11px] font-bold text-tertiary uppercase tracking-[0.2em]">98% Match Score</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {skills.map((skill) => (
                <div key={skill.name} className="bg-surface-container border hairline-border p-5 rounded-2xl flex flex-col gap-3 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-on-surface">{skill.name}</span>
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
          <section className="bg-primary-container/10 rounded-2xl p-6 border hairline-border-primary border-primary/20 flex gap-6 items-start shadow-[0_10px_30px_rgba(255,178,186,0.05)]">
            <div className="p-3 bg-primary-container/20 rounded-xl text-primary shrink-0 shadow-lg">
              <Wand2 className="w-6 h-6 fill-primary/20" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-widest">AI Recommendation</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                Based on your targets and experience, we recommend focusing on <span className="text-on-surface font-bold">Fintech</span> and <span className="text-on-surface font-bold">HealthTech</span> sectors where your TypeScript expertise is in high demand.
              </p>
            </div>
          </section>

          {/* Status Chips */}
          <div className="flex flex-wrap gap-3">
            {['Resume Parsed', 'Targets Set', 'Analysis Ready'].map((status, i) => (
              <span key={status} className="px-4 py-2 bg-background/50 border hairline-border rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", i < 2 ? "bg-tertiary shadow-[0_0_8px_rgba(104,219,174,0.4)]" : "bg-primary shadow-[0_0_8px_rgba(255,178,186,0.4)]")} /> 
                {status}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t hairline-border flex justify-between items-center bg-surface-container-low/50 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest border hairline-border text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            Back
          </button>
          <button 
            onClick={onClose}
            className="group px-10 py-4 bg-primary-container text-on-primary-container font-bold text-sm uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-3 shadow-2xl shadow-primary/20"
          >
            Continue to dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
