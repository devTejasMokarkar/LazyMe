"use client";

import { useState, useEffect } from "react";
import { Mail, ExternalLink, X } from "lucide-react";

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX);
  if (!matches) return [];
  const seen: Record<string, true> = {};
  const result: string[] = [];
  for (const e of matches) {
    const key = e.toLowerCase().trim();
    if (!seen[key]) {
      seen[key] = true;
      result.push(key);
    }
  }
  return result;
}

function extractRole(jd: string): string {
  const lines = jd.split("\n").slice(0, 15);
  for (const line of lines) {
    const t = line.trim();
    if (
      t &&
      !t.startsWith("#") &&
      !t.startsWith("http") &&
      !t.startsWith("@") &&
      t.length < 120 &&
      !/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t)
    ) {
      return t.replace(/^Job Title[:\s-]*/i, "").trim();
    }
  }
  return "Application";
}

function extractCompany(jd: string): string {
  const match = jd.match(/(?:Company|Organization|Employer|At)\s*[:\-]?\s*(.+)/i);
  if (match) return match[1].trim().split("\n")[0].trim();
  const lines = jd.split("\n").slice(0, 20);
  for (const line of lines) {
    const t = line.trim();
    if (/^(about|at)\s/i.test(t)) {
      return t.replace(/^(about|at)\s/i, "").trim();
    }
  }
  return "";
}

export default function DirectMailToHR({ jobTitle = "" }: { jobTitle?: string }) {
  const [jdText, setJdText] = useState<string>("");
  const [manualEmail, setManualEmail] = useState("careers@gmail.com");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lazyme_pending_jd");
    if (stored) {
      setJdText(stored);
    }
  }, []);

  if (dismissed) return null;

  const emails = extractEmails(jdText);
  const detectedEmail = emails[0] || "";
  const to = detectedEmail || manualEmail.trim() || "careers@gmail.com";
  const role = jobTitle.trim() || (jdText ? extractRole(jdText) : "Java Developer");
  const company = extractCompany(jdText);
  const subject = encodeURIComponent(
    `Application for ${role}${company ? ` at ${company}` : ""}`
  );
  const body = encodeURIComponent(
    `Dear Hiring Manager,\n\nI am writing to apply for the ${role} position${company ? ` at ${company}` : ""}. Please find my resume attached.\n\nBest regards,\n[Your Name]`
  );
  const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;

  return (
    <div className="mb-5 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 relative">
      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          Mail HR
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            value={to}
            onChange={(e) => setManualEmail(e.target.value)}
            className="h-9 rounded-lg border border-blue-300/70 bg-white/70 px-3 text-xs text-blue-950 outline-none dark:bg-blue-950/30 dark:text-blue-100"
            placeholder="careers@gmail.com"
            type="email"
          />
          <a
            href={mailtoUrl}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Mail className="w-3.5 h-3.5" />
            Mail App
          </a>
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-400/60 px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Gmail
          </a>
        </div>
        <p className="mt-1.5 text-[11px] text-blue-700/80 dark:text-blue-300/80">
          Subject: Application for {role}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-md hover:bg-blue-200/50 dark:hover:bg-blue-800/50 text-blue-500 transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
