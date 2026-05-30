"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  FileText,
  Target,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Download,
  BookOpen,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Resume {
  id: string;
  name: string;
}

interface Question {
  question: string;
  idealAnswer: string;
  tips: string;
  difficulty: string;
}

interface Category {
  category: string;
  questions: Question[];
}

interface InterviewData {
  metadata: {
    role: string;
    difficulty: string;
    totalQuestions: number;
  };
  categories: Category[];
  quickRevisionSheet: {
    keyConceptsToReview: string[];
    commonPatterns: string[];
    doAndDont: {
      do: string[];
      dont: string[];
    };
  };
}

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "text-green-500" },
  { id: "medium", label: "Medium", color: "text-amber-500" },
  { id: "hard", label: "Hard", color: "text-error" },
];

export default function InterviewPrep() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InterviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Technical Skills"]));
  const [loadingResumes, setLoadingResumes] = useState(true);

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setResumes(list);
      if (list.length > 0) setSelectedResumeId(list[0].id);
    } catch {
      // silently fail, user can paste resume data
    } finally {
      setLoadingResumes(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId || undefined,
          targetRole: targetRole || undefined,
          jobDescription: jobDescription || undefined,
          difficulty,
          count: 10,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || result.error || "Generation failed");
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleQuestion(q: string) {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }

  function toggleCategory(c: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function handleDownload() {
    if (!data) return;
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-prep-${data.metadata.role.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadingResumes) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/10 flex items-center justify-center border border-purple-500/20 shadow-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Interview Prep</h1>
            <p className="text-sm text-on-surface-variant font-medium">Generate personalized Q&A based on your resume</p>
          </div>
        </div>

        {/* Input Form */}
        <div className="p-6 rounded-2xl border border-outline-variant/20 bg-surface-container-low space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resume Selector */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Resume
              </label>
              {resumes.length > 0 ? (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-on-surface-variant/60 py-2">No saved resumes. Paste one below or create one first.</p>
              )}
            </div>

            {/* Target Role */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Target Role (optional)
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="text-xs font-semibold text-on-surface-variant mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Job Description (optional)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description for tailored questions..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Difficulty & Generate */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant">Difficulty:</span>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    difficulty === d.id
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Q&A</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-error">Generation Failed</p>
                <p className="text-xs text-error/80 mt-1">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Metadata Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <Target className="w-4 h-4" /> {data.metadata.role}
                  </span>
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <GraduationCap className="w-4 h-4" /> {data.metadata.difficulty}
                  </span>
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <FileText className="w-4 h-4" /> {data.metadata.totalQuestions} questions
                  </span>
                </div>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>

              {/* Categories */}
              {data.categories.map((cat) => {
                const isExpanded = expandedCategories.has(cat.category);
                return (
                  <div key={cat.category} className="rounded-2xl border border-outline-variant/20 bg-surface overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat.category)}
                      className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
                    >
                      <h3 className="font-bold text-on-surface">{cat.category}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-on-surface-variant">{cat.questions.length} questions</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-outline-variant/10"
                        >
                          <div className="divide-y divide-outline-variant/10">
                            {cat.questions.map((q, i) => {
                              const isQExpanded = expandedQuestions.has(q.question);
                              return (
                                <div key={i}>
                                  <button
                                    onClick={() => toggleQuestion(q.question)}
                                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-container-low transition-colors"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-on-surface">{q.question}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={cn(
                                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                          q.difficulty === "easy" ? "bg-green-500/10 text-green-500" :
                                          q.difficulty === "hard" ? "bg-error/10 text-error" :
                                          "bg-amber-500/10 text-amber-500"
                                        )}>
                                          {q.difficulty}
                                        </span>
                                      </div>
                                    </div>
                                    {isQExpanded ? <ChevronUp className="w-4 h-4 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 shrink-0 mt-1" />}
                                  </button>

                                  <AnimatePresence>
                                    {isQExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-outline-variant/10"
                                      >
                                        <div className="p-4 pl-13 space-y-3 bg-surface-container-low/30">
                                          <div>
                                            <p className="text-xs font-semibold text-green-500 flex items-center gap-1.5 mb-1">
                                              <CheckCircle className="w-3 h-3" /> Ideal Answer
                                            </p>
                                            <p className="text-sm text-on-surface-variant">{q.idealAnswer}</p>
                                          </div>
                                          {q.tips && (
                                            <div>
                                              <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
                                                <Lightbulb className="w-3 h-3" /> Tip
                                              </p>
                                              <p className="text-sm text-on-surface-variant">{q.tips}</p>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Quick Revision Sheet */}
              {data.quickRevisionSheet && (
                <div className="rounded-2xl border border-outline-variant/20 bg-gradient-to-br from-primary/5 to-transparent p-6 space-y-6">
                  <h3 className="font-bold text-on-surface flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" /> Quick Revision Sheet
                  </h3>

                  {/* Key Concepts */}
                  {data.quickRevisionSheet.keyConceptsToReview?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" /> Key Concepts to Review
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.quickRevisionSheet.keyConceptsToReview.map((c, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-lg bg-surface-container-highest border border-outline-variant/20 text-xs text-on-surface-variant">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Patterns */}
                  {data.quickRevisionSheet.commonPatterns?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant mb-2 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> Common Patterns
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.quickRevisionSheet.commonPatterns.map((c, i) => (
                          <span key={i} className="px-3 py-1.5 rounded-lg bg-surface-container-highest border border-outline-variant/20 text-xs text-on-surface-variant">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Do & Don't */}
                  {data.quickRevisionSheet.doAndDont && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-green-500 mb-2 flex items-center gap-1.5">
                          <ThumbsUp className="w-3.5 h-3.5" /> Do
                        </p>
                        <ul className="space-y-1.5">
                          {data.quickRevisionSheet.doAndDont.do.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                              <span className="text-green-500 mt-0.5">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-error mb-2 flex items-center gap-1.5">
                          <ThumbsDown className="w-3.5 h-3.5" /> Don&apos;t
                        </p>
                        <ul className="space-y-1.5">
                          {data.quickRevisionSheet.doAndDont.dont.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                              <span className="text-error mt-0.5">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
