"use client";

import { useState } from "react";
import { Mail, ExternalLink } from "lucide-react";

export default function DirectMailToHR({ jobTitle = "" }: { jobTitle?: string }) {
  const [manualEmail, setManualEmail] = useState("");

  const to = manualEmail.trim();
  const role = jobTitle.trim() || "Application";
  const subject = encodeURIComponent(`Application for ${role}`);
  const body = encodeURIComponent(
    `Dear Hiring Manager,\n\nI am writing to apply for the ${role} position. Please find my resume attached.\n\nBest regards,\n[Your Name]`
  );
  const gmailUrl = to
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`
    : "#";

  return (
    <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold text-on-background">Direct Mail</h3>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          className="h-9 flex-1 rounded-md border border-outline-variant bg-background px-3 text-xs text-on-background outline-none"
          placeholder="hr@company.com"
          type="email"
        />
        {to && (
          <a
            href={gmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Gmail
          </a>
        )}
      </div>
    </div>
  );
}
