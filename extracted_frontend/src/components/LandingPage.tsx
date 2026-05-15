import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Upload, Target, Zap, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const stats = [
    { value: '2,847', label: 'Active Users' },
    { value: '18,492', label: 'Jobs Applied' },
    { value: '4.2 min', label: 'Avg Apply Time' },
  ];

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
    <div className="w-full">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center pt-32 pb-16 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-primary-container/20 border-primary-container/40 hairline-border rounded-full mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Beta Access Open</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-7xl font-bold max-w-4xl mb-8 tracking-tighter"
        >
          Apply to jobs in 2 minutes.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-on-surface-variant text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-medium"
        >
          LazyMe discovers jobs that match your resume, optimizes it for each role, and applies for you. Stop writing. Start interviewing.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row gap-4 mb-32"
        >
          <button className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg hover:brightness-110 active:scale-95 transition-all shadow-2xl">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Continue with Google
          </button>
          <button className="hairline-border border-outline-variant text-on-surface hover:bg-surface-container-high px-8 py-4 rounded-xl font-bold text-lg active:scale-95 transition-all">
            See how it works <ArrowRight className="inline ml-2" />
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="bg-surface-container-low hairline-border border-outline-variant rounded-2xl p-8 flex flex-col items-center hover:bg-surface-container transition-colors"
            >
              <span className="text-3xl font-mono text-primary font-bold mb-2">{stat.value}</span>
              <span className="text-[11px] uppercase tracking-widest text-on-surface-variant font-bold">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6 bg-surface-container-lowest">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Precision Engineering</h2>
            <p className="text-on-surface-variant text-lg font-medium">The engine that automates your career trajectory.</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-[0.5px] bg-outline-variant z-0"></div>
            {steps.map((step, i) => (
              <motion.div 
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-full bg-surface-container-high hairline-border border-outline-variant flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl">
                  <step.icon className="w-8 h-8 text-secondary" />
                </div>
                <div className="font-mono text-primary text-xl font-bold mb-2">{step.step}</div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-on-surface-variant leading-relaxed font-medium">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Feed */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2 tracking-tight">Live Feed</h2>
              <p className="text-on-surface-variant text-lg font-medium">Applications active in the engine right now.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-tertiary-container/20 rounded-full border border-tertiary-container/30">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">System Stable</span>
            </div>
          </div>

          <div className="space-y-4">
            {feedItems.map((item) => (
              <motion.div 
                key={item.company}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-surface-container-low hairline-border border-outline-variant rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-6">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center border font-bold text-xl"
                    style={{ backgroundColor: `${item.color}10`, borderColor: `${item.color}30`, color: item.color }}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{item.role}</h4>
                    <p className="text-on-surface-variant font-medium">{item.company} · {item.location}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[200px]">
                  <div className="flex justify-between w-full">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Match</span>
                    <span className="font-mono text-primary font-bold">{item.match}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.match}%` }}
                      className="bg-primary h-full rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Premium Blurred Card */}
            <div className="relative overflow-hidden bg-surface-container-low/50 hairline-border border-outline-variant rounded-2xl p-6 opacity-60">
              <div className="flex flex-col md:flex-row justify-between blur-sm select-none">
                 <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-xl bg-white/10" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-white/20 rounded" />
                    <div className="h-3 w-32 bg-white/10 rounded" />
                  </div>
                </div>
                <div className="h-4 w-48 bg-white/10 rounded self-center" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                <button className="bg-surface-container-high hairline-border border-outline-variant px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[11px] text-on-surface hover:bg-surface-container-highest transition-colors">
                  Unlock Premium Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 bg-surface-container-lowest">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Engine Tuning</h2>
            <p className="text-on-surface-variant text-lg font-medium">Select your operational intensity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="bg-surface-container hairline-border border-outline-variant rounded-2xl p-8 flex flex-col hover:scale-[1.02] transition-transform">
              <span className="text-[11px] font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Free Tier</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-mono font-bold">$0</span>
                <span className="text-on-surface-variant font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {['10 applications per month', 'Standard AI optimization', 'Weekly email digest'].map(feature => (
                  <li key={feature} className="flex gap-3 items-center text-on-surface-variant font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 hairline-border border-outline-variant rounded-xl font-bold hover:bg-surface-container-high transition-colors">
                Start Free
              </button>
            </div>

            {/* Pro */}
            <div className="bg-surface-container border-2 border-primary rounded-2xl p-8 flex flex-col relative shadow-[0_0_50px_-12px_rgba(255,178,186,0.3)] hover:scale-[1.02] transition-transform">
              <div className="absolute -top-4 right-8 bg-primary text-on-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">Most Efficient</div>
              <span className="text-[11px] font-bold text-primary mb-6 uppercase tracking-widest">Pro Engine</span>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-mono font-bold">$29</span>
                <span className="text-on-surface-variant font-medium">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {[
                  'Unlimited applications',
                  'Advanced Resume Multi-threading',
                  'Instant Real-time Alerts',
                  'Priority Support (Discord)'
                ].map(feature => (
                  <li key={feature} className="flex gap-3 items-center text-on-surface-variant font-medium text-sm">
                    <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" /> {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all">
                Go Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t hairline-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-[#E31E24]"></div>
             <span className="font-bold text-xl tracking-tight">LazyMe AI</span>
          </div>
          
          <div className="flex gap-10">
            {['Twitter', 'Privacy', 'Terms', 'Contact'].map(link => (
              <a key={link} href="#" className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">{link}</a>
            ))}
          </div>

          <div className="text-[10px] font-mono text-outline uppercase tracking-widest opacity-50">
            v2.4.0-stable // 2024
          </div>
        </div>
      </footer>
    </div>
  );
}
