"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Zap, ShieldCheck, Loader2, Sparkles, Filter, Upload, Plus, X } from 'lucide-react';
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

      const mockJobs = [
        {
          id: 'stripe-1',
          company: 'Stripe',
          role: 'Senior Product Engineer',
          description: 'We are looking for a Senior Product Engineer to join our Checkout team.',
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
          description: 'Join Vercel to shape the future of the web.',
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
          description: 'Lead the UI architecture for India\'s largest payment gateway.',
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
        body: JSON.stringify({ resume: primaryResume.content, jobs: mockJobs })
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
    
    setTimeout(() => setApplyStep(2), 1200);
    setTimeout(() => setApplyStep(3), 2400);
    
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobData: job, status: 'Applied', note: 'Quick Applied via Dashboard' })
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
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
        {/* Discovery Chat Hero Skeleton */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-8 h-40 flex flex-col justify-end space-y-4">
          <div className="h-8 bg-surface-container-high rounded-lg w-1/3" />
          <div className="h-12 bg-surface-container-high rounded-xl w-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Sidebar Filters Skeleton */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-5 space-y-6">
              <div className="h-5 bg-surface-bright/30 rounded-lg w-1/2" />
              <div className="space-y-3">
                <div className="h-4 bg-surface-bright/30 rounded-lg w-1/3" />
                <div className="flex gap-2">
                  <div className="h-8 bg-surface-bright/30 rounded-lg w-16" />
                  <div className="h-8 bg-surface-bright/30 rounded-lg w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-surface-bright/30 rounded-lg w-1/2" />
                <div className="h-2 bg-surface-bright/30 rounded-full w-full" />
              </div>
            </div>
          </div>

          {/* Job Feed Skeleton */}
          <div className="lg:col-span-9 space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-surface-bright/30 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-surface-bright/30 rounded-lg w-1/3" />
                    <div className="h-4 bg-surface-bright/30 rounded-lg w-1/4" />
                  </div>
                  <div className="w-16 h-8 bg-surface-bright/30 rounded-lg" />
                </div>
                <div className="h-2 bg-surface-bright/30 rounded-full w-full" />
                <div className="flex justify-between items-center pt-4 border-t border-outline-variant/30">
                  <div className="h-6 bg-surface-bright/30 rounded-lg w-20" />
                  <div className="flex gap-3">
                    <div className="h-9 bg-surface-bright/30 rounded-xl w-24" />
                    <div className="h-9 bg-surface-bright/30 rounded-xl w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto">
      {showOnboarding && (
        <OnboardingModal onClose={() => { setShowOnboarding(false); fetchJobs(); }} />
      )}

      {/* Discovery Chat Hero */}
      <section className="-mx-6 -mt-6 lg:-mx-8 lg:-mt-8 mb-8">
        <DiscoveryChat />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6">
          <section className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5 text-on-surface-variant">
              <Filter className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Filters</h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-bold block mb-3 uppercase tracking-wider text-on-surface-variant/70">Work Style</label>
                <div className="flex flex-wrap gap-2">
                  {['Remote', 'Hybrid', 'On-site'].map((style) => (
                    <button 
                      key={style}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all active:scale-95",
                        style === 'Remote' 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-background border border-outline-variant text-on-surface-variant hover:border-primary/30"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold block mb-3 uppercase tracking-wider text-on-surface-variant/70">Salary Floor</label>
                <input 
                  type="range" 
                  className="w-full accent-primary h-1.5 bg-surface-container-high rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2 font-mono text-xs text-primary font-semibold">
                  <span>$120k</span>
                  <span>$280k+</span>
                </div>
              </div>
              
                <button className="w-full py-2.5 bg-surface-container-high text-on-background text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-surface-container-highest transition-all">
                Reset
              </button>
            </div>
          </section>

          <section className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <ShieldCheck className="w-20 h-20 text-tertiary" />
            </div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <ShieldCheck className="w-4 h-4 text-tertiary" />
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Autopilot</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-sm text-on-background">Scanning <span className="text-primary font-bold">Fortune 500</span> for matches.</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">Progress</span>
                  <span className="text-[10px] font-mono font-bold text-tertiary">84%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    className="h-full bg-tertiary rounded-full"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Job Feed */}
        <div className="lg:col-span-9 space-y-4 lg:space-y-6">
          {!hasResume ? (
            <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-10 lg:p-14 text-center flex flex-col items-center gap-5">
               <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                 <Upload className="w-6 h-6 text-primary" />
               </div>
               <h2 className="text-xl lg:text-2xl font-bold">Profile Required</h2>
               <p className="text-on-surface-variant text-sm max-w-sm">Upload your resume to unlock intelligent job matching.</p>
               <button 
                 onClick={() => setShowOnboarding(true)}
                 className="mt-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
               >
                 <Sparkles className="w-4 h-4" /> Start
               </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-10 text-center">
               <Zap className="w-10 h-10 text-primary mx-auto mb-4 opacity-20" />
               <p className="text-on-surface-variant font-medium">Scanning for matching roles...</p>
            </div>
          ) : (
            jobs.map((job) => (
              <motion.div 
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-6 hover:bg-surface-container-low/80 transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div 
                    className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center font-bold text-xl shadow-md"
                    style={{ backgroundColor: `${job.logoColor || '#333'}15`, color: job.logoColor || '#333' }}
                  >
                    {job.logo || job.company[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-lg font-bold hover:text-primary transition-colors">{job.role}</h4>
                        <div className="flex items-center gap-3 text-on-surface-variant text-sm mt-1">
                          <span>{job.company}</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> {job.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-tertiary font-mono text-xl font-bold">{job.matchScore}%</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3 h-3 text-primary" />
                          <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wider">AI Match</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-surface-container-high rounded-full mb-4 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${job.matchScore}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4">
                      {job.matchFactors.map(factor => (
                        <div key={factor.label} className="flex flex-col gap-1">
                          <span className="text-[9px] font-semibold text-on-surface-variant uppercase tracking-wider">{factor.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${factor.score}%` }}
                                className="h-full bg-tertiary rounded-full"
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-primary">{factor.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {job.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-md text-[9px] font-semibold uppercase tracking-wider">{tag}</span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-outline-variant/30 gap-4">
                      <span className="text-lg font-mono font-bold">{job.salary}</span>
                      <div className="flex gap-3 w-full sm:w-auto">
                        {job.quickApply && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleQuickApply(job); }}
                            disabled={applyingId !== null}
                            className={cn(
                              "flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                              applyingId === job.id 
                                ? "bg-tertiary/10 text-tertiary border border-tertiary/20" 
                                : "bg-surface-container-high text-primary border border-primary/20 hover:bg-primary/10"
                            )}
                          >
                            {applyingId === job.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {applyStep === 1 ? "Filling..." : applyStep === 2 ? "Optimizing..." : "Sending..."}
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" /> Quick Apply
                              </>
                            )}
                          </button>
                        )}
                        <button className="flex-1 sm:flex-none px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" /> Auto-Pilot
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {/* Premium Card */}
          <div className="relative group bg-surface-container-low/50 border border-outline-variant/50 rounded-2xl p-0.5 overflow-hidden">
             <div className="flex gap-8 p-8 filter blur-md grayscale opacity-30 select-none">
                <div className="w-16 h-16 bg-surface-container-highest rounded-2xl shrink-0" />
                <div className="flex-1 space-y-4">
                  <div className="h-6 w-1/3 bg-surface-container-highest rounded-xl" />
                  <div className="h-4 w-1/2 bg-surface-container-highest rounded-lg" />
                </div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="bg-surface-container-low border border-outline-variant/50 p-6 lg:p-8 rounded-2xl text-center max-w-sm shadow-2xl">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-primary/20">
                    <Zap className="w-7 h-7 text-primary" />
                  </div>
                  <h5 className="text-lg font-bold mb-3">Premium Discovery</h5>
                  <p className="text-on-surface-variant text-sm mb-6">
                    Unlock stealth opportunities and salary negotiation tools.
                  </p>
                  <button className="w-full bg-primary text-on-primary font-semibold text-xs uppercase tracking-[0.1em] py-3 rounded-xl shadow-lg hover:brightness-105 active:scale-[0.98] transition-all">
                    Upgrade
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}