"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Code, Send, Loader2, Bot, User, Sparkles,
  Download, FileCode, Printer, Copy, Check, RefreshCw, FileText,
  AlertCircle, ChevronDown, X, RotateCcw, RotateCw, ZoomIn, ZoomOut, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resumeToLatex, latexToHtml } from "@/features/ai/latex.service";
import { downloadPDF } from "@/features/ai/pdf.service";
import { useToast } from "@/components/layout/ToastProvider";
import type { ResumeData } from "@/components/resume/templates/index";

type Mode = "chat" | "editor";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  atsScore?: number;
  atsData?: any;
}

const DEFAULT_RESUME_DATA: ResumeData = {
  name: "Your Name",
  title: "Professional Title",
  email: "",
  phone: "",
  location: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
  sectionHeaders: {
    summary: "Professional Summary",
    skills: "Core Competencies",
    experience: "Professional Experience",
    education: "Education",
  },
};

// ── Simple LaTeX syntax highlighter ─────────────────────────────
// Renders LaTeX source as React elements with coloured tokens.
function highlightLatex(src: string): React.ReactNode[] {
  const tokens: { start: number; end: number; cls: string }[] = [];
  const push = (re: RegExp, cls: string) => {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = r.exec(src))) {
      tokens.push({ start: m.index, end: m.index + m[0].length, cls });
      if (m[0].length === 0) r.lastIndex++;
    }
  };

  // Comments
  push(/(^|[^\\])%[^\n]*/g, "text-slate-500 italic");
  // Bracket groups \command{...}
  push(/\\[a-zA-Z@]+\*?/g, "text-pink-500 dark:text-pink-400");
  // Curly braces
  push(/[{}]/g, "text-amber-500");
  // Numbers
  push(/\b\d+(\.\d+)?\b/g, "text-emerald-500");
  // Quoted strings
  push(/"[^"\n]*"/g, "text-sky-500");

  tokens.sort((a, b) => a.start - b.start);

  // Build the React tree
  const out: React.ReactNode[] = [];
  let cursor = 0;
  tokens.forEach((t, i) => {
    if (t.start < cursor) return; // overlap — skip
    if (t.start > cursor) {
      out.push(<span key={`t${i}-p`}>{src.slice(cursor, t.start)}</span>);
    }
    out.push(
      <span key={`t${i}-m`} className={t.cls}>
        {src.slice(t.start, t.end)}
      </span>
    );
    cursor = t.end;
  });
  if (cursor < src.length) out.push(<span key="tail">{src.slice(cursor)}</span>);
  return out;
}

export default function LaTeXAIEditor() {
  const [mode, setMode] = useState<Mode>("chat");
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [latexSource, setLatexSource] = useState<string>("");
  const [loadingResume, setLoadingResume] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm Sloth your LaTeX resume assistant. Describe the change you want and I'll update your resume and refresh the LaTeX source. Try: \"Add Python and Docker to my skills\" or \"Rewrite the summary for a senior role\".\n\nYou can also paste a Job Description to get an ATS score analysis — just click the clipboard icon below.",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { showToast } = useToast();

  // ── JD Analysis states ────────────────────────────────────────
  const [showJDModal, setShowJDModal] = useState(false);
  const [jdText, setJdText] = useState("");
  const [isAnalyzingJD, setIsAnalyzingJD] = useState(false);
  const [pendingOptimize, setPendingOptimize] = useState<{
    score: number;
    missingKeywords: string[];
    weakSections: string[];
    jdText: string;
  } | null>(null);

  // ── Zoom state ───────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(100);

  // ── Font size state ──────────────────────────────────────────
  const [nameFontSize, setNameFontSize] = useState(36);

  // ── Undo/Redo state ──────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<ResumeData[]>([]);
  const [redoStack, setRedoStack] = useState<ResumeData[]>([]);

  // ── 1. Load default resume from the DB on mount ────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/resumes?_t=" + Date.now());
        if (cancelled) return;
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          const c = primary.content || {};
          const normalized: ResumeData = {
            name: c.name || "Your Name",
            title: c.title || "Professional Title",
            email: c.email || "",
            phone: c.phone || "",
            location: c.location || "",
            summary: c.summary || "",
            skills: Array.isArray(c.skills) ? c.skills : [],
            experience: Array.isArray(c.experience) ? c.experience : [],
            education: Array.isArray(c.education) ? c.education : [],
            projects: Array.isArray(c.projects) ? c.projects : [],
            sectionHeaders: c.sectionHeaders || {
              summary: "Professional Summary",
              skills: "Core Competencies",
              experience: "Professional Experience",
              education: "Education",
            },
          };
          setResumeData(normalized);
        }
      } catch (err) {
        // Soft-fail: the welcome template is already in state.
        console.error("Failed to load resume:", err);
      } finally {
        if (!cancelled) setLoadingResume(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 2. Regenerate the LaTeX source whenever resume data changes ─
  useEffect(() => {
    if (loadingResume) return;
    const generated = resumeToLatex(resumeData, "modern");
    setLatexSource(generated);
  }, [resumeData, loadingResume]);

  // ── 3. Ctrl+P to print/export the live preview to PDF ──────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleDownloadPDF();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData]);

  // ── 4. Ctrl+S to save resume to DB ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveResume();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeData]);

  // ── 5. Ctrl+Z / Ctrl+Y for undo/redo ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, redoStack]);

  // ── Push to undo stack when resumeData changes (not on initial load) ──
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    setUndoStack((prev) => [...prev.slice(-50), resumeData]); // keep last 50 states
    setRedoStack([]); // clear redo on new change
  }, [resumeData]);

  // ── Handlers: Save, Undo, Redo, Zoom ─────────────────────────
  const handleSaveResume = async () => {
    try {
      const res = await fetch("/api/resumes", {
        method: "GET",
      });
      const data = await res.json();
      const primary = Array.isArray(data) ? data.find((r: any) => r.isDefault) || data[0] : null;

      if (primary?.id) {
        await fetch(`/api/resumes/${primary.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: resumeData }),
        });
        showToast("Resume saved!", "success");
      } else {
        // Create new resume
        await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: resumeData, isDefault: true }),
        });
        showToast("Resume created & saved!", "success");
      }
    } catch (err) {
      showToast("Failed to save. Please try again.", "error");
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, resumeData]);
    setUndoStack((u) => u.slice(0, -1));
    setResumeData(prev);
    showToast("Undone", "info");
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, resumeData]);
    setRedoStack((r) => r.slice(0, -1));
    setResumeData(next);
    showToast("Redone", "info");
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(200, z + 10));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(50, z - 10));
  const handleZoomReset = () => setZoomLevel(100);

  const handleFontIncrease = () => setNameFontSize((s) => Math.min(60, s + 2));
  const handleFontDecrease = () => setNameFontSize((s) => Math.max(20, s - 2));
  const handleFontReset = () => setNameFontSize(36);

  // ── AI chat → resume changes ──────────────────────────────────
  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/ollama/update-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enhancedPrompt: text, resumeData }),
      });
      const data = await res.json();

      if (res.ok && data.changes) {
        const changes = data.changes || {};
        setResumeData((prev) => {
          const next: ResumeData = { ...prev };

          // Simple field replacements
          if (typeof changes.name === "string" && changes.name.trim()) {
            next.name = changes.name;
          }
          if (typeof changes.title === "string" && changes.title.trim()) {
            next.title = changes.title;
          }
          if (typeof changes.email === "string" && changes.email.trim()) {
            next.email = changes.email;
          }
          if (typeof changes.phone === "string" && changes.phone.trim()) {
            next.phone = changes.phone;
          }
          if (typeof changes.location === "string" && changes.location.trim()) {
            next.location = changes.location;
          }
          if (typeof changes.summary === "string" && changes.summary.trim()) {
            next.summary = changes.summary;
          }

          // Skills with replace/append mode
          if (Array.isArray(changes.skills) && changes.skills.length) {
            if (changes.skillsMode === "replace") {
              next.skills = [...changes.skills];
            } else {
              // Append (default) - dedupe
              next.skills = Array.from(
                new Set([...(prev.skills || []), ...changes.skills])
              );
            }
          }

          // Section headers merge
          if (changes.sectionHeaders && typeof changes.sectionHeaders === "object") {
            next.sectionHeaders = {
              ...(prev.sectionHeaders || {}),
              ...changes.sectionHeaders,
            };
          }

          // Experience merge (match by company)
          if (Array.isArray(changes.experience) && changes.experience.length) {
            const merged = [...(prev.experience || [])];
            for (const entry of changes.experience) {
              const idx = merged.findIndex(
                (e) => e.company?.toLowerCase() === entry.company?.toLowerCase()
              );
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...entry };
              } else {
                merged.push({
                  company: entry.company || "",
                  role: entry.role || "",
                  duration: entry.duration || "",
                  bullets: Array.isArray(entry.bullets) ? entry.bullets : [],
                });
              }
            }
            next.experience = merged;
          }

          // Education merge
          if (Array.isArray(changes.education) && changes.education.length) {
            const merged = [...(prev.education || [])];
            for (const entry of changes.education) {
              const idx = merged.findIndex(
                (e) => e.school?.toLowerCase() === entry.school?.toLowerCase()
              );
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...entry };
              } else {
                merged.push({
                  school: entry.school || "",
                  degree: entry.degree || "",
                  year: entry.year || "",
                });
              }
            }
            next.education = merged;
          }

          return next;
        });

        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              "Done — I updated your resume. Switch to the LaTeX Editor or Preview tabs to see the new source.",
            timestamp: new Date(),
          },
        ]);
        showToast("Resume updated", "success");
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              (data && data.error) ||
              "I couldn't find a specific change to apply. Try naming the section or bullet you want changed.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── JD Analysis ──────────────────────────────────────────────
  const handleAnalyzeJD = async () => {
    const jd = jdText.trim();
    if (!jd) return;

    setShowJDModal(false);
    setJdText("");
    setIsChatLoading(true);

    // Add user message showing the JD
    setChatMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: `📋 Job Description pasted:\n\n"${jd.slice(0, 200)}${jd.length > 200 ? "..." : ""}"`,
        timestamp: new Date(),
      },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Analyzing your resume against this JD... This may take a moment.",
        timestamp: new Date(),
      },
    ]);

    try {
      const res = await fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeData, jobDescription: jd }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "ATS scoring failed");

      // Build score breakdown display
      const bd = data.breakdown || {};
      const fmt = (s: any) => (s?.score != null && s?.max ? Math.round((s.score / s.max) * 100) : "—");

      const scoreDisplay = `🎯 **ATS Score: ${data.overall_score}/100**

**Breakdown:**
| Category | Score |
|---|---|
| Keyword Match | ${fmt(bd.skills_keywords)}% |
| Experience Fit | ${fmt(bd.experience_keywords)}% |
| Summary Keywords | ${fmt(bd.summary_keywords)}% |
| Title Match | ${fmt(bd.title_match)}% |
| Format & Structure | ${fmt(bd.format_structure)}% |

**Missing Keywords:** ${data.missing_keywords?.join(", ") || "None"}
**Found Keywords:** ${data.found_keywords?.join(", ") || "None"}

${data.overall_score < 85 ? "💡 Want me to optimize your resume to improve this score? I can inject missing keywords and strengthen weak sections." : "✅ Your resume looks well-aligned with this JD!"}`;

      // Replace the "Analyzing..." message with actual results
      setChatMessages((prev) => {
        const withoutAnalyzing = prev.slice(0, -1); // remove "Analyzing..." msg
        return [
          ...withoutAnalyzing,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: scoreDisplay,
            timestamp: new Date(),
            atsScore: data.overall_score,
            atsData: data,
          },
        ];
      });

      // Store for optimization flow
      if (data.overall_score < 85) {
        setPendingOptimize({
          score: data.overall_score,
          missingKeywords: data.missing_keywords || [],
          weakSections: data.weak_sections || [],
          jdText: jd,
        });
      }

      showToast(`ATS Score: ${data.overall_score}/100`, data.overall_score >= 85 ? "success" : "info");
    } catch (err: any) {
      setChatMessages((prev) => {
        const withoutAnalyzing = prev.slice(0, -1);
        return [
          ...withoutAnalyzing,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: `Sorry, I couldn't analyze the JD: ${err.message}. Please try again.`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleOptimizeATS = async () => {
    if (!pendingOptimize) return;

    setIsChatLoading(true);
    setPendingOptimize(null);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: "Yes, optimize my resume!",
        timestamp: new Date(),
      },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Optimizing your resume... Injecting missing keywords and strengthening weak sections.",
        timestamp: new Date(),
      },
    ]);

    try {
      const res = await fetch("/api/optimize-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeData,
          jobDescription: pendingOptimize.jdText,
          currentScore: pendingOptimize.score,
          missingKeywords: pendingOptimize.missingKeywords,
          weakSections: pendingOptimize.weakSections,
          titleInJd: "",
          skipRescore: false,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Optimization failed");

      if (data.discarded) {
        setChatMessages((prev) => {
          const withoutOptimizing = prev.slice(0, -1);
          return [
            ...withoutOptimizing,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: "The optimization didn't improve the score, so I kept your original resume. Try editing specific sections manually.",
              timestamp: new Date(),
            },
          ];
        });
        return;
      }

      // Apply the improved resume
      if (data.improvedResume) {
        setResumeData((prev) => ({
          ...prev,
          ...data.improvedResume,
        }));
      }

      const improvement = data.newScore - data.oldScore;
      const keywordsList = data.keywordsAdded?.map((k: string) => `• ${k}`).join("\n") || "";

      setChatMessages((prev) => {
        const withoutOptimizing = prev.slice(0, -1);
        return [
          ...withoutOptimizing,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: `🎉 **Resume Optimized!**

**Score: ${data.oldScore}/100 → ${data.newScore}/100** ${improvement > 0 ? `(▲ +${improvement})` : ""}

**Keywords Added:**
${keywordsList}

**Sections Improved:**
${data.sectionsImproved?.join(", ") || "N/A"}

Your resume has been updated. The LaTeX source and preview have been refreshed automatically.`,
            timestamp: new Date(),
            atsScore: data.newScore,
          },
        ];
      });

      showToast(`ATS Score improved to ${data.newScore}/100!`, "success");
    } catch (err: any) {
      setChatMessages((prev) => {
        const withoutOptimizing = prev.slice(0, -1);
        return [
          ...withoutOptimizing,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: `Sorry, optimization failed: ${err.message}. Please try again.`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // ── Downloads ─────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const el = document.getElementById("latex-ai-preview");
    if (!el) {
      showToast("Preview is not ready yet — switch to Preview tab first.", "error");
      return;
    }
    const filename = `resume_${(resumeData.name || "download").replace(/\s+/g, "_").toLowerCase()}.pdf`;
    downloadPDF("latex-ai-preview", filename);
    showToast("Opening print dialog — choose 'Save as PDF'.", "info");
  };

  const handleDownloadLatex = () => {
    if (typeof window === "undefined") return;
    const blob = new Blob([latexSource], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume_${(resumeData.name || "download").replace(/\s+/g, "_").toLowerCase()}.tex`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("LaTeX source downloaded", "success");
  };

  const handleResetLatex = () => {
    const regenerated = resumeToLatex(resumeData, "modern");
    setLatexSource(regenerated);
    showToast("LaTeX source regenerated from resume data", "info");
  };

  // ── LaTeX preview HTML (memoised) ──────────────────────────────
  const previewHtml = useMemo(() => latexToHtml(latexSource), [latexSource]);

  // ── UI ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* ── Left mode switcher / chat panel ───────────────────── */}
      <aside className="w-full sm:w-[420px] lg:w-[480px] shrink-0 border-r border-outline-variant/30 flex flex-col bg-surface-container-lowest/30 h-full">
        {/* Mode tabs */}
        <div className="px-4 sm:px-5 py-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">LaTeX AI</h2>
              <p className="text-[10px] text-on-surface-variant font-medium">Edit, preview, and download</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container rounded-xl">
            <ModeButton active={mode === "chat"} onClick={() => setMode("chat")} icon={MessageSquare} label="AI Chat" />
            <ModeButton active={mode === "editor"} onClick={() => setMode("editor")} icon={Code} label="LaTeX" />
          </div>
        </div>

        {/* Mode body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {mode === "chat" && (
            <ChatPanel
              messages={chatMessages}
              input={chatInput}
              setInput={setChatInput}
              onSend={handleSendChat}
              isLoading={isChatLoading}
              onPasteJD={() => setShowJDModal(true)}
              onOptimize={handleOptimizeATS}
              hasPendingOptimize={!!pendingOptimize}
            />
          )}

          {mode === "editor" && (
            <EditorPanel
              source={latexSource}
              setSource={setLatexSource}
              onResumeDataUpdate={(data) => setResumeData(data)}
              resumeData={resumeData}
              onReset={handleResetLatex}
            />
          )}
        </div>
      </aside>

      {/* ── Right canvas — always renders the live preview so the
          PDF print pipeline (Ctrl+P) can find the element. ──────── */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scrollbar bg-surface-container-low/30">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          {/* Header — single clean row */}
          <div className="flex items-center justify-between py-4 border-b border-outline-variant/20 mb-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">LaTeX Preview</span>
              <span className="text-[10px] text-on-surface-variant/50 font-mono ml-1">Ctrl+P to export</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Undo/Redo */}
              <div className="flex items-center border border-outline-variant/40 rounded-lg overflow-hidden">
                <button onClick={handleUndo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" className="px-2 py-1.5 hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-outline-variant/40" />
                <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)" className="px-2 py-1.5 hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-[1px] h-4 bg-outline-variant/30" />

              {/* Name Font Size */}
              <div className="flex items-center border border-outline-variant/40 rounded-lg overflow-hidden">
                <button onClick={handleFontDecrease} title="Decrease name size" className="px-2 py-1.5 hover:bg-surface-container-high transition-all text-[10px] font-bold">
                  A<sup>-</sup>
                </button>
                <button onClick={handleFontReset} title="Reset name size" className="px-1.5 py-1.5 hover:bg-surface-container-high transition-all text-[10px] font-mono font-bold min-w-[28px] text-center">
                  {nameFontSize}
                </button>
                <button onClick={handleFontIncrease} title="Increase name size" className="px-2 py-1.5 hover:bg-surface-container-high transition-all text-[10px] font-bold">
                  A<sup>+</sup>
                </button>
              </div>

              <div className="w-[1px] h-4 bg-outline-variant/30" />

              {/* Zoom */}
              <div className="flex items-center border border-outline-variant/40 rounded-lg overflow-hidden">
                <button onClick={handleZoomOut} title="Zoom Out" className="px-2 py-1.5 hover:bg-surface-container-high transition-all">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleZoomReset} title="Reset Zoom" className="px-1.5 py-1.5 hover:bg-surface-container-high transition-all text-[10px] font-mono font-bold min-w-[36px] text-center">
                  {zoomLevel}%
                </button>
                <button onClick={handleZoomIn} title="Zoom In" className="px-2 py-1.5 hover:bg-surface-container-high transition-all">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-[1px] h-4 bg-outline-variant/30" />

              {/* Save */}
              <button onClick={handleSaveResume} title="Save (Ctrl+S)" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all">
                <Save className="w-3 h-3" />
                Save
              </button>

              {/* Download */}
              <button onClick={handleDownloadLatex} title="Download .tex" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-outline-variant/40 hover:bg-surface-container-high transition-all">
                <FileCode className="w-3 h-3" />
                .tex
              </button>
              <button onClick={handleDownloadPDF} title="Download PDF" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-on-primary hover:brightness-110 transition-all shadow-sm">
                <Printer className="w-3 h-3" />
                PDF
              </button>
            </div>
          </div>

          {loadingResume ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading your resume…</span>
            </div>
          ) : (
            <PaginatedPreview html={previewHtml} zoomLevel={zoomLevel} nameFontSize={nameFontSize} />
          )}
        </div>
      </main>

      {/* JD Paste Modal */}
      <JDModal
        open={showJDModal}
        onClose={() => { setShowJDModal(false); setJdText(""); }}
        onSubmit={handleAnalyzeJD}
        jdText={jdText}
        setJdText={setJdText}
        isLoading={isAnalyzingJD}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function ModeButton({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
        active
          ? "bg-primary text-on-primary shadow-md shadow-primary/20"
          : "text-on-surface-variant hover:bg-surface-container-high"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ChatPanel({
  messages, input, setInput, onSend, isLoading, onPasteJD, onOptimize, hasPendingOptimize,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onPasteJD: () => void;
  onOptimize: () => void;
  hasPendingOptimize: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-5 py-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex gap-2.5",
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                m.role === "user"
                  ? "bg-primary/20 border border-primary/30"
                  : "bg-surface-container-highest border border-outline-variant"
              )}
            >
              {m.role === "user" ? (
                <User className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-secondary" />
              )}
            </div>
            <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                ...(m.role === "user"
                  ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
                  : { background: "var(--color-surface-container)", border: "1px solid var(--color-outline-variant, rgba(0,0,0,0.1))" }),
                borderRadius: m.role === "user" ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
              }}
            >
              {/* ATS Score Badge */}
              {m.atsScore != null && (
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold mb-2",
                  m.atsScore >= 85 ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                  m.atsScore >= 70 ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
                  "bg-red-500/15 text-red-700 dark:text-red-400"
                )}>
                  <span className="text-sm">{m.atsScore >= 85 ? "✅" : m.atsScore >= 70 ? "⚠️" : "❌"}</span>
                  ATS: {m.atsScore}/100
                </div>
              )}
              {/* Render markdown-like content */}
              <MessageContent content={m.content} />
            </div>
          </div>
        ))}

        {/* Optimize button when pending */}
        {hasPendingOptimize && !isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onOptimize}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-all shadow-md shadow-green-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Yes, optimize my resume!
              </button>
              <span className="text-[10px] text-on-surface-variant/60">Click to auto-inject missing keywords and improve weak sections</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="bg-surface-container border border-outline-variant/50 rounded-2xl rounded-tl-md px-3.5 py-2.5 flex items-center gap-2 text-xs text-on-surface-variant">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {hasPendingOptimize ? "Optimizing resume…" : "Analyzing…"}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-outline-variant/30 px-4 sm:px-5 py-3 bg-background/95">
        <div className="flex items-end gap-2">
          {/* JD Paste Button */}
          <button
            onClick={onPasteJD}
            disabled={isLoading}
            title="Paste a Job Description to analyze ATS score"
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all border",
              !isLoading
                ? "bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20"
                : "bg-surface-container-higher text-on-surface-variant/30 cursor-not-allowed border-transparent"
            )}
          >
            <FileText className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder="Tell me what to change…"
            className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs text-primary placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary resize-none max-h-32 leading-relaxed"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
              input.trim() && !isLoading
                ? "bg-primary text-on-primary shadow-md shadow-primary/20 hover:brightness-110"
                : "bg-surface-container-higher text-on-surface-variant/30 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[9px] text-on-surface-variant/50 text-center mt-2">
          Enter to send • Shift+Enter for newline • <FileText className="w-2.5 h-2.5 inline" /> Paste JD for ATS score
        </p>
      </div>
    </>
  );
}

function EditorPanel({
  source, setSource, onResumeDataUpdate, resumeData, onReset,
}: {
  source: string;
  setSource: (v: string) => void;
  onResumeDataUpdate: (data: ResumeData) => void;
  resumeData: ResumeData;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {/* noop */ }
  };

  const lines = useMemo(() => source.split("\n"), [source]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 sm:px-5 py-2.5 border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          <FileCode className="w-3.5 h-3.5" />
          main.tex
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 rounded-md text-[10px] font-bold text-on-surface-variant transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-tertiary" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onReset}
            title="Regenerate from resume data"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 rounded-md text-[10px] font-bold text-on-surface-variant transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-surface-container-lowest relative">
        {/* Line numbers - decorative, pointer-events-none */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-surface-container-low/50 border-r border-outline-variant/20 pointer-events-none z-10">
          {lines.map((_, i) => (
            <div key={i} className="h-6 flex items-center justify-end pr-2 text-[11px] font-mono text-on-surface-variant/30 select-none">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Actual editable textarea */}
        <textarea
          ref={textareaRef}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          className="w-full h-full min-h-[500px] pl-12 pr-4 py-2 bg-transparent font-mono text-[12px] leading-6 text-on-surface outline-none resize-none whitespace-pre"
          style={{ tabSize: 2 }}
        />
      </div>

      <div className="border-t border-outline-variant/30 px-4 sm:px-5 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-on-surface-variant/60 font-mono">
          {lines.length} lines • UTF-8 • Editable
        </span>
        <button
          onClick={onReset}
          className="text-[10px] font-bold uppercase tracking-widest text-primary hover:brightness-110"
        >
          Reset to generated →
        </button>
      </div>
    </div>
  );
}

// ── Paginated A4 Preview ──────────────────────────────────────
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const PAGE_PADDING = 40; // 10 * 4 (p-10)

function PaginatedPreview({ html, zoomLevel = 100, nameFontSize = 36 }: { html: string; zoomLevel?: number; nameFontSize?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);

  const dynamicStyles = useMemo(
    () => latexPreviewStyles + `\n.resume-ai-content h1 { font-size: ${nameFontSize}px !important; }`,
    [nameFontSize]
  );

  // Measure and split content into pages
  useEffect(() => {
    if (!measureRef.current) return;

    // Render full content off-screen to measure
    const measureEl = measureRef.current;
    measureEl.innerHTML = html;
    measureEl.style.width = `${A4_WIDTH - PAGE_PADDING * 2}px`;

    // Wait for render then measure children
    requestAnimationFrame(() => {
      const children = Array.from(measureEl.children);
      if (children.length === 0) {
        setPages([html]);
        return;
      }

      const contentHeight = measureEl.scrollHeight;
      const availableHeight = A4_HEIGHT - PAGE_PADDING * 2;

      // If content fits on one page, no splitting needed
      if (contentHeight <= availableHeight) {
        setPages([html]);
        setActivePage(0);
        return;
      }

      // Split by section headers — keep sections together when possible
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const sections = Array.from(tempDiv.children);

      const pageContents: string[] = [];
      let currentHeight = 0;
      let currentHtml = "";

      for (const section of sections) {
        const sectionHtml = section.outerHTML;
        // Estimate section height (rough: 20px per line)
        const sectionLines = (section.textContent || "").split("\n").length;
        const sectionHeight = Math.max(sectionLines * 18, 40);

        if (currentHeight + sectionHeight > availableHeight && currentHtml) {
          pageContents.push(currentHtml);
          currentHtml = sectionHtml;
          currentHeight = sectionHeight;
        } else {
          currentHtml += sectionHtml;
          currentHeight += sectionHeight;
        }
      }

      if (currentHtml) {
        pageContents.push(currentHtml);
      }

      setPages(pageContents.length > 0 ? pageContents : [html]);
      setActivePage(0);
    });
  }, [html]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden measure div */}
      <div
        ref={measureRef}
        className="resume-ai-content"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          visibility: "hidden",
          fontFamily: "'Inter', 'Calibri', 'Arial', sans-serif",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      />

      {/* Page indicator */}
      {pages.length > 1 && (
        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <button
            onClick={() => setActivePage((p) => Math.max(0, p - 1))}
            disabled={activePage === 0}
            className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>
          <span className="font-mono font-bold">
            Page {activePage + 1} of {pages.length}
          </span>
          <button
            onClick={() => setActivePage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={activePage === pages.length - 1}
            className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Active page */}
      <div
        id="latex-ai-preview"
        className="bg-white text-black mx-auto shadow-2xl rounded-sm overflow-hidden transition-transform duration-200"
        style={{
          width: `${A4_WIDTH}px`,
          minHeight: `${A4_HEIGHT}px`,
          fontFamily: "'Inter', 'Calibri', 'Arial', sans-serif",
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: "top center",
        }}
      >
        <style>{dynamicStyles}</style>
        <div
          className="resume-ai-content"
          style={{ padding: `${PAGE_PADDING}px` }}
          dangerouslySetInnerHTML={{ __html: pages[activePage] || "" }}
        />
      </div>

      {/* Page thumbnails for multi-page */}
      {pages.length > 1 && (
        <div className="flex gap-2 mt-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setActivePage(i)}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-bold transition-all border",
                i === activePage
                  ? "bg-primary text-on-primary border-primary/30"
                  : "bg-surface-container text-on-surface-variant border-outline-variant/50 hover:bg-surface-container-high"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simple markdown renderer for chat messages ─────────────────
function MessageContent({ content }: { content: string }) {
  // Parse simple markdown: **bold**, | table |, bullet points
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        // Table separator line
        if (/^\|[-\s|]+\|$/.test(line.trim())) return null;

        // Table row
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
          const cells = line
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          return (
            <div key={i} className="flex gap-2 text-[11px]">
              {cells.map((cell, j) => (
                <span
                  key={j}
                  className={cn(
                    "flex-1",
                    j === 0 ? "font-semibold text-on-surface" : "text-on-surface-variant"
                  )}
                >
                  {renderBold(cell)}
                </span>
              ))}
            </div>
          );
        }

        // Bullet point
        if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
          return (
            <div key={i} className="flex gap-1.5 text-[11px] pl-1">
              <span className="text-on-surface-variant shrink-0">•</span>
              <span>{renderBold(line.trim().slice(1).trim())}</span>
            </div>
          );
        }

        // Empty line
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Normal line
        return (
          <div key={i} className="text-[11px]">
            {renderBold(line)}
          </div>
        );
      })}
    </div>
  );
}

function renderBold(text: string): React.ReactNode {
  // Split by **...** pattern
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── JD Paste Modal ─────────────────────────────────────────────
function JDModal({
  open,
  onClose,
  onSubmit,
  jdText,
  setJdText,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  jdText: string;
  setJdText: (v: string) => void;
  isLoading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-lg border border-outline-variant/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Paste Job Description</h3>
              <p className="text-[10px] text-on-surface-variant">Analyze your resume against this JD</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here...&#10;&#10;Include: job title, required skills, responsibilities, experience requirements, etc."
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
            autoFocus
          />
          <p className="text-[10px] text-on-surface-variant/50 mt-2">
            {jdText.length} characters • {jdText.split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        <div className="px-5 py-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!jdText.trim() || isLoading}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              jdText.trim() && !isLoading
                ? "bg-primary text-on-primary shadow-md shadow-primary/20 hover:brightness-110"
                : "bg-surface-container-higher text-on-surface-variant/30 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing…
              </span>
            ) : (
              "Analyze ATS Score"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, variant = "secondary",
}: { icon: any; label: string; onClick: () => void; variant?: "primary" | "secondary" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border",
        variant === "primary"
          ? "bg-primary text-on-primary border-primary/30 shadow-md shadow-primary/20 hover:brightness-110"
          : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/50"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-surface-container border border-outline-variant/50 rounded shadow-sm">
      {children}
    </kbd>
  );
}

const latexPreviewStyles = `
/* ── Base typography ─────────────────────────────── */
.resume-ai-content { font-family: 'Inter', 'Calibri', 'Arial', sans-serif; font-size: 13px; line-height: 1.5; color: #000; }

/* ── Name (h1) ──────────────────────────────────── */
.resume-ai-content h1 { font-size: 36px !important; font-weight: 700 !important; margin: 0 0 4px !important; color: #000 !important; }

/* ── Section headers ─────────────────────────────── */
.resume-ai-content .section-header {
  font-size: 15px !important; font-weight: 700 !important; text-transform: uppercase;
  letter-spacing: 0.05em; border-bottom: 1.5px solid #000; padding-bottom: 3px;
  margin: 16px 0 6px !important; color: #000 !important; page-break-after: avoid;
}

/* ── Paragraphs ──────────────────────────────────── */
.resume-ai-content p { font-size: 13px !important; line-height: 1.5 !important; color: #000 !important; margin: 0 0 6px !important; }

/* ── Lists (experience bullets) ──────────────────── */
.resume-ai-content .resume-list {
  list-style: disc; padding-left: 20px; margin: 2px 0 6px 0;
}
.resume-ai-content .resume-list li {
  font-size: 12.5px !important; line-height: 1.45 !important; color: #000 !important;
  margin: 1.5px 0; padding-left: 2px;
}

/* ── Skills inline bullets ───────────────────────── */
.resume-ai-content .skill-bullet { color: #000; margin: 0 2px; }
.resume-ai-content .skill-bullet + strong,
.resume-ai-content .skill-bullet + em { margin-left: 2px; }

/* ── Entry gap spacers ──────────────────────────── */
.resume-ai-content .entry-gap { height: 6pt; }

/* ── Text formatting ─────────────────────────────── */
.resume-ai-content strong { font-weight: 700 !important; }
.resume-ai-content em { font-style: italic !important; }

/* ── Alignment ───────────────────────────────────── */
.resume-ai-content .text-center { text-align: center; }
.resume-ai-content .text-right { text-align: right; }

/* ── Hfill (role on left, date on right) ─────────── */
.resume-ai-content .hfill-line { display: flex; justify-content: space-between; align-items: baseline; }
.resume-ai-content .hfill-left { font-weight: 700; }
.resume-ai-content .hfill-right { text-align: right; white-space: nowrap; }
.resume-ai-content .clearfix { clear: both; }

/* ── Page break rules for print ──────────────────── */
.resume-ai-content .page-break-avoid { page-break-inside: avoid; }
.resume-ai-content .resume-list { page-break-inside: avoid; }
.resume-ai-content .section-header { page-break-after: avoid; }

/* ── Print pagination ────────────────────────────── */
@media print {
  .resume-ai-content { page-break Auto; }
  .resume-ai-content .section-header { page-break-after: avoid; }
  .resume-ai-content .resume-list { page-break-inside: avoid; }
  .resume-ai-content .page-break-avoid { page-break-inside: avoid; }
}
`;
