"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, ShieldCheck, Loader2, Sparkles, Filter, RefreshCw, Upload, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import OnboardingModal from '@/components/OnboardingModal';
import DiscoveryChat from '@/components/DiscoveryChat';

interface MatchedJob {
  id: string;
  company: string;
  role: string;
  description: string;
  location?: string;
  salary?: string;
  matchScore: number;
  matchFactors: { label: string; score: number }[];
  tags: string[];
  logo?: string;
  logoColor?: string;
  quickApply?: boolean;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyStep, setApplyStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // First, get the primary resume to use for matching
      const resumeRes = await fetch('/api/resumes');
      const resumes = await resumeRes.json();
      const primaryResume = resumes.find((r: any) => r.isDefault) || resumes[0];

      if (!primaryResume) {
        setHasResume(false);
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      setHasResume(true);

      // Use mock data for jobs but match them against real resume
      const mockJobs = [
        {
          id: 'stripe-1',
          company: 'Stripe',
          role: 'Senior Product Engineer',
          description: 'We are looking for a Senior Product Engineer to join our Checkout team. Experience with React, Next.js, and Distributed Systems is essential. You will build high-impact UI for millions of users.',
          location: 'San Francisco / Remote',
          salary: '$185k - $240k',
          applyType: 'easy_apply',
          logo: 'S',
          logoColor: '#635BFF',
          quickApply: true,
        },
        {
          id: 'vercel-1',
          company: 'Vercel',
          role: 'DX Engineer (AI Platforms)',
          description: 'Join Vercel to shape the future of the web. We need an engineer passionate about AI, TypeScript, and developer experience. You will work on v0 and Next.js integrations.',
          location: 'Remote (Worldwide)',
          salary: '$160k - $210k',
          applyType: 'external',
          logo: 'V',
          logoColor: '#FFFFFF',
        },
        {
          id: 'razorpay-1',
          company: 'Razorpay',
          role: 'Staff UI Engineer',
          description: 'Lead the UI architecture for India\'s largest payment gateway. Expert knowledge of React, Design Systems, and performance optimization required.',
          location: 'Bangalore / Remote',
          salary: '₹60L - ₹85L',
          applyType: 'easy_apply',
          logo: 'R',
          logoColor: '#528FF0',
          quickApply: true,
        }
      ];

      const matchRes = await fetch('/api/discover-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: primaryResume.content,
          jobs: mockJobs
        })
      });

      const data = await matchRes.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleQuickApply = async (job: MatchedJob) => {
    setApplyingId(job.id);
    setApplyStep(1);
    
    // Simulate AI pre-filling steps
    setTimeout(() => setApplyStep(2), 1200);
    setTimeout(() => setApplyStep(3), 2400);
    
    try {
      // Actually save the application in the database
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobData: job,
          status: 'Applied',
          note: 'Quick Applied via Dashboard'
        })
      });

      if (!res.ok) throw new Error("Failed to submit");

      setTimeout(() => {
        setApplyingId(null);
        setApplyStep(0);
      }, 4000);
    } catch (error) {
      console.error("Apply failed:", error);
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-6">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold tracking-tight">Syncing Engineering Graph</h3>
          <p className="text-on-surface-variant text-sm font-medium mt-1">LazyMe AI is matching your skills with live job boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 pb-32 max-w-7xl mx-auto">
      {showOnboarding && (
        <OnboardingModal onClose={() => { setShowOnboarding(false); fetchJobs(); }} />
      )}

      {/* Discovery Chat Hero */}
      <section className="-mx-8 -mt-8 mb-12">
        <DiscoveryChat />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-8">
          <section className="bg-surface border border-outline-variant rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8 text-on-surface-variant">
              <Filter className="w-4 h-4" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest">Global Filters</h3>
            </div>
            <div className="space-y-10">
              <div>
                <label className="text-[10px] font-bold block mb-4 uppercase tracking-[0.2em] text-on-surface-variant/70">Work Style</label>
                <div className="flex flex-wrap gap-2">
                  {['Remote', 'Hybrid', 'On-site'].map((style) => (
                    <button 
                      key={style}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95",
                        style === 'Remote' 
                          ? "bg-primary-container text-on-primary-container border-primary/20 shadow-lg" 
                          : "bg-background border border-outline-variant text-on-surface-variant hover:border-primary/50"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold block mb-4 uppercase tracking-[0.2em] text-on-surface-variant/70">Salary Floor</label>
                <input 
                  type="range" 
                  className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-4 font-mono text-xs text-primary font-bold">
                  <span>$120k</span>
                  <span>$280k+</span>
                </div>
              </div>
              
              <div className="pt-8 border-t border-outline-variant/30">
                <button className="w-full py-4 bg-surface-container-highest text-on-surface text-[11px] font-bold uppercase tracking-widest rounded-2xl hover:bg-surface-bright transition-all shadow-md active:scale-[0.98]">
                  Reset View
                </button>
              </div>
            </div>
          </section>

          <section className="bg-surface border border-outline-variant rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck className="w-24 h-24 text-tertiary" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <ShieldCheck className="w-5 h-5 text-tertiary" />
              <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Autopilot Status</h3>
            </div>
            <div className="space-y-6 relative z-10">
              <p className="text-sm font-medium text-on-surface leading-relaxed">AI is currently scanning <span className="text-primary font-bold">Fortune 500</span> tech stacks for matches.</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Scanning Progress</span>
                  <span className="text-[10px] font-mono font-bold text-tertiary">84%</span>
                </div>
                <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    className="h-full bg-tertiary rounded-full shadow-[0_0_12px_rgba(104,219,174,0.4)]"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Job Feed */}
        <div className="lg:col-span-9 space-y-8">
          {!hasResume ? (
            <div className="bg-surface border border-outline-variant rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-6 shadow-2xl">
               <div className="w-20 h-20 bg-primary-container/20 rounded-3xl flex items-center justify-center border border-primary/20 shadow-xl mb-4">
                 <Upload className="w-10 h-10 text-primary" />
               </div>
               <h2 className="text-3xl font-bold tracking-tight">Profile Required</h2>
               <p className="text-on-surface-variant font-medium text-lg max-w-md">To unlock intelligent matching, we need to ingest your professional history.</p>
               <button 
                 onClick={() => setShowOnboarding(true)}
                 className="mt-4 bg-primary text-on-primary px-10 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
               >
                 <Sparkles className="w-4 h-4 fill-on-primary" /> Start AI Onboarding
               </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-surface border border-outline-variant rounded-[2.5rem] p-20 text-center shadow-2xl">
               <Zap className="w-16 h-16 text-primary mx-auto mb-6 opacity-20" />
               <p className="text-on-surface-variant font-medium text-xl italic">Scanning for roles that match your unique stack...</p>
            </div>
          ) : (
            jobs.map((job) => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface border border-outline-variant rounded-[2.5rem] p-10 hover:bg-surface-container-low transition-all group cursor-pointer shadow-xl hover:shadow-2xl relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row gap-10 relative z-10">
                  <div 
                    className="w-20 h-20 shrink-0 rounded-3xl flex items-center justify-center border-2 font-bold text-3xl shadow-xl transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${job.logoColor || '#333'}10`, borderColor: `${job.logoColor || '#333'}30`, color: job.logoColor || '#333' }}
                  >
                    {job.logo || job.company[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
                      <div>
                        <h4 className="text-3xl font-bold group-hover:text-primary transition-colors tracking-tighter mb-1">{job.role}</h4>
                        <div className="flex items-center gap-4 text-on-surface-variant font-medium text-lg">
                          <span>{job.company}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-outline-variant/50" />
                          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {job.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-tertiary font-mono text-3xl font-bold tracking-tight">{job.matchScore}% Match</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" />
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">AI Verified</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-surface-container-high rounded-full mt-8 mb-6 overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${job.matchScore}%` }}
                        className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(255,178,186,0.4)]"
                      />
                    </div>

                    {/* Match Factors Breakdown */}
                    <div className="flex flex-wrap gap-x-12 gap-y-6 mb-10">
                      {job.matchFactors.map(factor => (
                        <div key={factor.label} className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{factor.label}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${factor.score}%` }}
                                className="h-full bg-tertiary rounded-full"
                              />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-on-surface">{factor.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2.5 mb-10">
                      {job.tags.map(tag => (
                        <span key={tag} className="px-4 py-1.5 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all hover:bg-secondary-container/20">{tag}</span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-outline-variant/30 gap-6">
                      <span className="text-3xl font-mono text-on-surface font-bold tracking-tight">{job.salary}</span>
                      <div className="flex gap-4 w-full sm:w-auto">
                        {job.quickApply && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickApply(job); }}
                            disabled={applyingId !== null}
                            className={cn(
                              "flex-1 sm:flex-none px-8 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95",
                              applyingId === job.id 
                                ? "bg-tertiary/20 text-tertiary border border-tertiary/30" 
                                : "bg-surface-container-highest text-primary border border-primary/20 hover:bg-primary/10"
                            )}
                          >
                            {applyingId === job.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {applyStep === 1 ? "Pre-filling..." : applyStep === 2 ? "Optimizing..." : "Submitting..."}
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 fill-primary" /> Quick Apply
                              </>
                            )}
                          </button>
                        )}
                        <button className="flex-1 sm:flex-none px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
                          <Sparkles className="w-4 h-4 fill-on-primary" /> Auto-Pilot
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {/* Locked Premium Card */}
          <div className="relative group bg-surface/50 border border-outline-variant rounded-[2.5rem] p-1 px-1 overflow-hidden shadow-2xl">
             <div className="flex gap-10 p-12 filter blur-md grayscale opacity-30 select-none">
                <div className="w-24 h-24 bg-surface-container-highest rounded-3xl shrink-0" />
                <div className="flex-1 space-y-6">
                  <div className="h-10 w-1/3 bg-surface-container-highest rounded-2xl" />
                  <div className="h-6 w-1/2 bg-surface-container-highest rounded-xl" />
                </div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center z-10 p-10">
                <div className="bg-surface border border-outline-variant p-10 rounded-[2.5rem] text-center max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.6)] border-t-primary/30">
                  <div className="w-20 h-20 bg-primary-container/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-primary/20">
                    <Zap className="w-10 h-10 text-primary fill-primary/40" />
                  </div>
                  <h5 className="text-3xl font-bold mb-4 tracking-tight">Premium Discovery</h5>
                  <p className="text-on-surface-variant font-medium text-lg mb-10 leading-relaxed">
                    Unlock hidden <span className="text-on-surface font-bold">"stealth mode"</span> opportunities and AI-enhanced salary negotiation tools used by industry pros.
                  </p>
                  <button className="w-full bg-primary text-on-primary font-bold text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all">
                    Upgrade to Operational Intensity
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
