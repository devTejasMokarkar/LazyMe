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

export default function DirectMailToHR() {
  const [jdText, setJdText] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lazyme_pending_jd");
    if (stored) {
      setJdText(stored);
    }
  }, []);

  if (dismissed || !jdText) return null;

  const emails = extractEmails(jdText);
  if (emails.length === 0) return null;

  const to = emails[0];
  const role = extractRole(jdText);
  const company = extractCompany(jdText);
  const subject = encodeURIComponent(
    `Application for ${role}${company ? ` at ${company}` : ""}`
  );
  const body = encodeURIComponent(
    `Dear Hiring Manager,\n\nI am writing to apply for the ${role} position${company ? ` at ${company}` : ""}. Please find my resume attached.\n\nBest regards,\n[Your Name]`
  );
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;

  return (
    <div className="mb-5 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl px-4 py-3 relative">
      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
          HR Email Found
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5 break-all">
          {to}
        </p>
        <a
          href={gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Direct Mail to HR
        </a>
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
