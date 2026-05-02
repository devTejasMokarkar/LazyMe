"use client";

import { useState } from "react";
import { ResumeData } from "@/utils/promptBuilder";
import { resumeToLatex } from "@/utils/latexFormatter";
import { Copy, Check, Terminal } from "lucide-react";

interface LaTeXPreviewProps {
  resumeData: ResumeData;
  className?: string;
}

export default function LaTeXPreview({ resumeData, className = "" }: LaTeXPreviewProps) {
  const [copied, setCopied] = useState(false);

  const latexContent = resumeToLatex(resumeData);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(latexContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden ${className}`}>
      {/* Code Header */}
      <div className="bg-[#1e293b] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Terminal className="w-3 h-3" />
            main.tex
          </div>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-md transition-all border border-primary/20"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy Source"}
        </button>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 font-mono text-sm leading-relaxed bg-[#020617] scrollbar-hide">
        <pre className="text-slate-300 min-w-max">
          {latexContent.split('\n').map((line, i) => (
            <div key={i} className="flex gap-4 group">
              <span className="w-8 text-right text-slate-700 select-none group-hover:text-slate-500 transition-colors">
                {i + 1}
              </span>
              <span className="flex-1">
                {line.startsWith('%') ? (
                  <span className="text-slate-600">{line}</span>
                ) : line.startsWith('\\') ? (
                  <span className="text-pink-500">{line}</span>
                ) : (
                  line
                )}
              </span>
            </div>
          ))}
        </pre>
      </div>

      {/* Code Footer */}
      <div className="bg-[#1e293b] border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span>UTF-8 • LaTeX2e</span>
        <span>LaTeX Output</span>
      </div>
    </div>
  );
}
