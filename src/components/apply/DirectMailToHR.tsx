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
    <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Mail className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Mail HR</p>
          <p className="truncate text-[11px] text-on-surface-variant">Application for {role}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={to}
            onChange={(e) => setManualEmail(e.target.value)}
            className="h-9 rounded-md border border-outline-variant bg-background px-3 text-xs text-on-background outline-none"
            placeholder="careers@gmail.com"
            type="email"
          />
          <a
            href={mailtoUrl}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <Mail className="w-3.5 h-3.5" />
            Mail App
          </a>
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-outline-variant px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Gmail
          </a>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
