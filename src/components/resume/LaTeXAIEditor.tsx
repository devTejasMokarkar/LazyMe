"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Code, Send, Loader2, Bot, User, Sparkles,
  Download, FileCode, Printer, Copy, Check, RefreshCw, FileText,
  AlertCircle, ChevronDown, X
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
        "Hi! I'm your LaTeX resume assistant. Describe the change you want and I'll update your resume and refresh the LaTeX source. Try: \"Add Python and Docker to my skills\" or \"Rewrite the summary for a senior role\".",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { showToast } = useToast();

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
      <aside className="w-full sm:w-[360px] lg:w-[400px] shrink-0 border-r border-outline-variant/30 flex flex-col bg-surface-container-lowest/30 h-full">
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                LaTeX Resume Preview
              </h1>
              <p className="text-xs text-on-surface-variant mt-1">
                Press <Kbd>Ctrl</Kbd> + <Kbd>P</Kbd> to download as PDF, or use the buttons below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                icon={FileCode}
                label="Download .tex"
                onClick={handleDownloadLatex}
                variant="secondary"
              />
              <ActionButton
                icon={Printer}
                label="Download PDF"
                onClick={handleDownloadPDF}
                variant="primary"
              />
            </div>
          </div>

          {loadingResume ? (
            <div className="flex items-center justify-center py-20 text-on-surface-variant gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading your resume…</span>
            </div>
          ) : (
            <PaginatedPreview html={previewHtml} />
          )}
        </div>
      </main>
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
  messages, input, setInput, onSend, isLoading,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
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
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-on-primary rounded-tr-md"
                  : "bg-surface-container border border-outline-variant/50 rounded-tl-md"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-secondary" />
            </div>
            <div className="bg-surface-container border border-outline-variant/50 rounded-2xl rounded-tl-md px-3.5 py-2.5 flex items-center gap-2 text-xs text-on-surface-variant">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating resume…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-outline-variant/30 px-4 sm:px-5 py-3 bg-background/95">
        <div className="flex items-end gap-2">
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
          Enter to send • Shift+Enter for newline
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
    } catch {/* noop */}
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

function PaginatedPreview({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(0);

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
        className="bg-white text-black mx-auto shadow-2xl rounded-sm overflow-hidden"
        style={{
          width: `${A4_WIDTH}px`,
          minHeight: `${A4_HEIGHT}px`,
          fontFamily: "'Inter', 'Calibri', 'Arial', sans-serif",
        }}
      >
        <style>{latexPreviewStyles}</style>
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
.resume-ai-content h1 { font-size: 28px !important; font-weight: 700 !important; margin: 0 0 4px !important; color: #000 !important; }

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
.resume-ai-content .hfill { float: right; }

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
