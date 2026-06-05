"use client";

import Link from "next/link";
import { ArrowLeft, Code2, Copy, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-lowest">
      <div className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/20 bg-surface-container-high/30">
        <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">{lang}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant hover:text-primary transition-colors">
          {copied ? <><CheckCircle2 className="w-3 h-3 text-success" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-primary"><code>{code}</code></pre>
    </div>
  );
}

export default function ApiDocsPage() {
  const endpoints = [
    {
      method: "POST",
      path: "/api/parse-resume",
      desc: "Upload and parse a resume file (PDF, DOCX, TXT, or image). Returns structured resume data.",
      body: `curl -X POST https://lazyme.ai/api/parse-resume \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@resume.pdf"`,
      response: `{
  "name": "John Doe",
  "title": "Senior Software Engineer",
  "email": "john@example.com",
  "skills": ["React", "TypeScript", "Node.js"],
  "experience": [...],
  "education": [...]
}`,
    },
    {
      method: "POST",
      path: "/api/ats-analyze",
      desc: "Analyze a resume against a job description for ATS compatibility. Returns a match score and suggestions.",
      body: `curl -X POST https://lazyme.ai/api/ats-analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resume": { ... },
    "jobDescription": "We are looking for..."
  }'`,
      response: `{
  "score": 87,
  "matchedSkills": ["React", "TypeScript"],
  "missingKeywords": ["GraphQL", "AWS"],
  "suggestions": [...]
}`,
    },
    {
      method: "POST",
      path: "/api/enhance-prompt",
      desc: "Enhance a raw text prompt into a structured, professional resume entry using AI.",
      body: `curl -X POST https://lazyme.ai/api/enhance-prompt \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "prompt": "Worked at Google on search..." }'`,
      response: `{
  "enhanced": {
    "company": "Google",
    "role": "Software Engineer",
    "bullets": [
      "Optimized search latency by 15% using Go and Bigtable"
    ]
  }
}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="fixed top-0 left-0 right-0 h-16 z-40 flex items-center px-6 glass-dark border-b">
        <Link href="/" className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back to Home</span>
        </Link>
      </header>

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Code2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">API Documentation</h1>
                <p className="text-sm text-on-surface-variant font-medium mt-1">Integrate LazyMe AI into your workflow</p>
              </div>
            </div>
            <div className="h-[2px] w-20 bg-gradient-to-r from-primary to-secondary rounded-full" />
          </motion.div>

          {/* Overview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6 md:p-8 border border-outline-variant/30 mb-10">
            <h2 className="text-lg font-bold mb-3">Getting Started</h2>
            <p className="text-on-surface-variant font-medium text-sm leading-relaxed mb-4">
              The LazyMe AI API allows you to programmatically parse resumes, analyze ATS compatibility,
              and leverage our AI models. All endpoints require authentication via a Bearer token.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant w-20">Base URL</span>
                <code className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg">https://lazyme.ai/api</code>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant w-20">Auth</span>
                <code className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg">Bearer YOUR_API_KEY</code>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant w-20">Format</span>
                <code className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-lg">JSON</code>
              </div>
            </div>
          </motion.div>

          {/* Rate Limits */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass rounded-2xl p-6 md:p-8 border border-outline-variant/30 mb-10">
            <h2 className="text-lg font-bold mb-3">Rate Limits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-background rounded-xl p-4 border border-outline-variant/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Free Tier</p>
                <p className="text-xl font-mono font-bold text-primary">100<span className="text-xs text-on-surface-variant ml-1">req/day</span></p>
              </div>
              <div className="bg-background rounded-xl p-4 border border-outline-variant/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Pro Tier</p>
                <p className="text-xl font-mono font-bold text-primary">5,000<span className="text-xs text-on-surface-variant ml-1">req/day</span></p>
              </div>
              <div className="bg-background rounded-xl p-4 border border-outline-variant/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Enterprise</p>
                <p className="text-xl font-mono font-bold text-primary">Unlimited</p>
              </div>
            </div>
          </motion.div>

          {/* Endpoints */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-8">
            <h2 className="text-2xl font-bold tracking-tight">Endpoints</h2>
            {endpoints.map((ep, i) => (
              <motion.div key={ep.path} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="glass rounded-2xl p-6 md:p-8 border border-outline-variant/30 space-y-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary text-on-primary">{ep.method}</span>
                  <code className="text-sm font-mono font-semibold text-primary">{ep.path}</code>
                </div>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed">{ep.desc}</p>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Request</p>
                  <CodeBlock code={ep.body} lang="bash" />
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Response</p>
                  <CodeBlock code={ep.response} lang="json" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="py-10 px-6 border-t border-outline-variant">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-medium text-on-surface-variant/60">© 2024 LazyMe AI. Automating the future of work.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
