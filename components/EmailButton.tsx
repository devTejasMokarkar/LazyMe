"use client";

import { useState, useRef, useEffect } from "react";
import { Mail, Send, Copy, ExternalLink, X, Check } from "lucide-react";
import { useToast } from "./ToastProvider";

interface EmailButtonProps {
  resumeData: {
    name: string;
    email: string;
    title: string;
    summary: string;
  };
  coverLetter: string;
  jobTitle: string;
  companyEmail?: string;
}

export function EmailButton({ resumeData, coverLetter, jobTitle, companyEmail }: EmailButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptions]);

  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/~~(.*?)~~/g, '$1');
  };

  const cleanCoverLetter = stripMarkdown(coverLetter);

  const emailContent = `
Hi,

${cleanCoverLetter}

---

Professional Summary:
${resumeData.summary}

Contact Information:
${resumeData.name}
${resumeData.title}
${resumeData.email}

---
Found a job? Just LazyMe it.
  `.trim();

  const subject = `Application for ${jobTitle}`;
  
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(emailContent);

  const mailtoLink = `mailto:${companyEmail || ""}?subject=${encodedSubject}&body=${encodedBody}`;
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${companyEmail || ""}&su=${encodedSubject}&body=${encodedBody}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emailContent);
    showToast("Application content copied to clipboard!", "success");
    setShowOptions(false);
  };

  const handleMailApp = () => {
    window.location.href = mailtoLink;
    showToast("Opening your email app...", "success");
    setShowOptions(false);
  };

  const handleGmail = () => {
    window.open(gmailLink, "_blank");
    showToast("Opening Gmail...", "success");
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowOptions(!showOptions)} 
        className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold rounded-md transition-all active:scale-95 shadow-lg shadow-primary/20"
      >
        <Send className="w-4 h-4" />
        Apply Now
      </button>
      {showOptions && (
        <p className="absolute top-full left-0 mt-2 text-xs font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
          Found a job? Just LazyMe it.
        </p>
      )}

      {showOptions && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
          
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div 
              ref={modalRef}
              className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-on-surface">Choose How to Apply</h3>
                  <p className="text-on-surface-variant text-sm mt-1">Select your preferred method to send the application.</p>
                </div>
                <button 
                  onClick={() => setShowOptions(false)}
                  className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                <button 
                  onClick={handleMailApp}
                  className="w-full flex items-center gap-4 p-4 bg-surface-container-high hover:bg-surface-container-highest rounded-xl border border-outline-variant transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-on-surface">Default Email App</p>
                    <p className="text-xs text-on-surface-variant">Outlook, Apple Mail, etc.</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-on-surface-variant/50 ml-auto" />
                </button>

                <button 
                  onClick={handleGmail}
                  className="w-full flex items-center gap-4 p-4 bg-surface-container-high hover:bg-surface-container-highest rounded-xl border border-outline-variant transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-on-surface">Gmail (Web)</p>
                    <p className="text-xs text-on-surface-variant">Open in your browser</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-on-surface-variant/50 ml-auto" />
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-outline-variant" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface-container px-2 text-on-surface-variant font-bold">OR</span>
                  </div>
                </div>

                <button 
                  onClick={handleCopy}
                  className="w-full flex items-center gap-4 p-4 bg-surface-container-high hover:bg-surface-container-highest rounded-xl border border-outline-variant transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-on-surface">Copy to Clipboard</p>
                    <p className="text-xs text-on-surface-variant">Paste it anywhere manually</p>
                  </div>
                  <CheckCircleIcon className="w-4 h-4 text-on-surface-variant/50 ml-auto" />
                </button>
              </div>
              
              <div className="p-4 bg-surface-container-low text-center">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Powered by LazyMe AI</p>
                <p className="text-[10px] font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mt-1">
                  Found a job? Just LazyMe it.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
