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
      // Clipboard copy failed
    }
  };

  return (
    <div className={`flex flex-col h-full bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden ${className}`}>
      <div className="bg-surface-container-high border-b border-outline-variant px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="h-4 w-[1px] bg-outline-variant" />
          <div className="flex items-center gap-2 text-on-surface-variant text-xs font-mono">
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

      <div className="flex-1 overflow-auto p-4 lg:p-8 font-mono text-sm leading-relaxed bg-surface-container-lowest scrollbar-hide">
        <pre className="text-on-surface-variant min-w-max">
          {latexContent.split('\n').map((line, i) => (
            <div key={i} className="flex gap-4 group">
              <span className="w-8 text-right text-on-surface-variant/30 select-none group-hover:text-on-surface-variant/50 transition-colors">
                {i + 1}
              </span>
              <span className="flex-1">
                {line.startsWith('%') ? (
                  <span className="text-on-surface-variant/50">{line}</span>
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

      <div className="bg-surface-container-high border-t border-outline-variant px-4 py-2 flex items-center justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
        <span>UTF-8 • LaTeX2e</span>
        <span>LaTeX Output</span>
      </div>
    </div>
  );
}
