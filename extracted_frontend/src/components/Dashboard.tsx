import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, ShieldCheck, MapPin, DollarSign, Calendar, Bookmark, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function Dashboard() {
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [applyStep, setApplyStep] = useState(0);

  const handleQuickApply = (id: number) => {
    setApplyingId(id);
    setApplyStep(1);
    
    // Simulate AI pre-filling steps
    setTimeout(() => setApplyStep(2), 1200);
    setTimeout(() => setApplyStep(3), 2400);
    setTimeout(() => {
      setApplyingId(null);
      setApplyStep(0);
    }, 4000);
  };

  const jobs = [
    {
      id: 1,
      quickApply: true,
      title: 'Senior Product Engineer',
      company: 'Stripe',
      location: 'San Francisco / Remote',
      salary: '$185k - $240k',
      tags: ['React', 'Next.js', 'Distributed Systems'],
      match: 98,
      matchFactors: [
        { label: 'Skills', score: 100 },
        { label: 'Experience', score: 95 },
        { label: 'Platform Fit', score: 98 }
      ],
      status: 'Applied 2h ago',
      logo: 'S',
      logoColor: '#635BFF'
    },
    {
      id: 2,
      title: 'DX Engineer (AI Platforms)',
      company: 'Vercel',
      location: 'Remote (Worldwide)',
      salary: '$160k - $210k',
      tags: ['AI/ML', 'TypeScript'],
      match: 85,
      matchFactors: [
        { label: 'Skills', score: 90 },
        { label: 'Experience', score: 75 },
        { label: 'Cultural Fit', score: 92 }
      ],
      status: 'Recommended',
      logo: 'V',
      logoColor: '#FFFFFF'
    }
  ];

  return (
    <div className="flex-1 p-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Job Discovery</h1>
          <p className="text-on-surface-variant font-medium">43 matches found based on your engineering profile.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-surface-container-high hairline-border rounded-full text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
          Live Tracking
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-8">
          <section className="bg-surface-container-low hairline-border rounded-2xl p-6 shadow-xl">
            <h3 className="text-[11px] font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Global Filters</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-bold block mb-4 uppercase tracking-widest text-on-surface-variant">Work Style</label>
                <div className="flex flex-wrap gap-2">
                  {['Remote', 'Hybrid', 'On-site'].map((style) => (
                    <button 
                      key={style}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                        style === 'Remote' 
                          ? "bg-primary-container text-on-primary-container border-primary/20" 
                          : "bg-surface hairline-border text-on-surface-variant hover:border-primary"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-4 uppercase tracking-widest text-on-surface-variant">Salary Floor (USD)</label>
                <input 
                  type="range" 
                  className="w-full accent-primary h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-3 font-mono text-sm text-primary font-bold">
                  <span>$120k</span>
                  <span>$280k+</span>
                </div>
              </div>
              
              <div className="pt-6 border-t hairline-border">
                <button className="w-full py-3 bg-surface-container-highest text-on-surface text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-surface-bright transition-colors shadow-lg">
                  Reset All
                </button>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-low hairline-border rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-5 h-5 text-tertiary" />
              <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Autopilot Status</h3>
            </div>
            <div className="p-4 bg-surface-container-highest/50 rounded-xl space-y-4">
              <p className="text-sm font-medium text-on-surface leading-snug">AI is currently scanning YC W24 startups for Lead Frontend roles.</p>
              <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  className="h-full bg-tertiary rounded-full"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Job Feed */}
        <div className="lg:col-span-9 space-y-6">
          {jobs.map((job) => (
            <motion.div 
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface hairline-border rounded-2xl p-8 hover:bg-surface-container-low transition-all group cursor-pointer shadow-lg hover:shadow-2xl"
            >
              <div className="flex flex-col md:flex-row gap-8">
                <div 
                  className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border font-bold text-2xl"
                  style={{ backgroundColor: `${job.logoColor}10`, borderColor: `${job.logoColor}30`, color: job.logoColor }}
                >
                  {job.logo}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-2xl font-bold group-hover:text-primary transition-colors tracking-tight">{job.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-on-surface-variant font-medium">
                        <span>{job.company}</span>
                        <div className="w-1 h-1 rounded-full bg-outline-variant" />
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-tertiary font-mono text-xl font-bold">{job.match}% Match</span>
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{job.status}</span>
                    </div>
                  </div>

                  <div className="h-[2px] w-full bg-surface-container-high rounded-full mt-6 mb-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${job.match}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>

                  {/* Match Factors Breakdown */}
                  <div className="flex flex-wrap gap-x-8 gap-y-4 mb-8">
                    {job.matchFactors.map(factor => (
                      <div key={factor.label} className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">{factor.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${factor.score}%` }}
                              className="h-full bg-tertiary rounded-full"
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-on-surface-variant">{factor.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {job.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-secondary-container/20 text-secondary border border-secondary/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t hairline-border">
                    <span className="text-xl font-mono text-on-surface font-bold">{job.salary}</span>
                    <div className="flex gap-4">
                      {job.quickApply && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleQuickApply(job.id); }}
                          disabled={applyingId !== null}
                          className={cn(
                            "px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2",
                            applyingId === job.id 
                              ? "bg-tertiary/20 text-tertiary border border-tertiary/30" 
                              : "bg-surface-container-highest text-primary border border-primary/20 hover:bg-primary/10"
                          )}
                        >
                          {applyingId === job.id ? (
                            <>
                              <div className="w-3 h-3 rounded-full border-2 border-tertiary/20 border-t-tertiary animate-spin" />
                              {applyStep === 1 ? "AI Pre-filling..." : applyStep === 2 ? "Optimizing JD..." : "Submitting..."}
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 fill-primary" /> Quick Apply
                            </>
                          )}
                        </button>
                      )}
                      <button className="px-6 py-2.5 bg-surface-container-highest text-on-surface-variant border hairline-border rounded-xl font-bold text-[11px] uppercase tracking-widest hover:text-on-surface transition-all">Save</button>
                      <button className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 fill-on-primary" /> Auto-Pilot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Locked Premium Card */}
          <div className="relative group bg-surface/50 hairline-border rounded-2xl p-1 px-1 overflow-hidden">
             <div className="flex gap-8 p-8 filter blur-md grayscale opacity-30 select-none">
                <div className="w-16 h-16 bg-surface-container-highest rounded-2xl shrink-0" />
                <div className="flex-1 space-y-4">
                  <div className="h-8 w-1/3 bg-surface-container-highest rounded-xl" />
                  <div className="h-4 w-1/4 bg-surface-container-highest rounded-lg" />
                </div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
                <div className="bg-surface-container border hairline-border p-8 rounded-3xl text-center max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="w-14 h-14 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-6 h-6 text-primary fill-primary" />
                  </div>
                  <h5 className="text-2xl font-bold mb-3 tracking-tight">Premium Discovery</h5>
                  <p className="text-on-surface-variant font-medium text-sm mb-8 leading-relaxed">
                    Unlock hidden "stealth mode" opportunities and AI-enhanced salary negotiation tools used by industry pros.
                  </p>
                  <button className="w-full bg-primary text-on-primary font-bold text-[11px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">
                    Upgrade to Pro
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
