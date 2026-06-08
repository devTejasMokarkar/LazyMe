"use client";

import { useState, useMemo } from "react";
import { Upload, ExternalLink, ChevronLeft, ChevronRight, Mail } from "lucide-react";

interface Recipient {
  email: string;
  name?: string;
  company?: string;
}

const STRICT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ITEMS_PER_PAGE = 10;

function parseCsv(text: string): Recipient[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const splitRow = (row: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const hasHeader =
    header.some((h) => h === "email") ||
    header.some((h) => h.includes("e-mail"));

  let emailIdx = 0;
  let nameIdx = -1;
  let companyIdx = -1;
  let startRow = 0;

  if (hasHeader) {
    emailIdx = header.findIndex((h) => h === "email" || h.includes("e-mail"));
    nameIdx = header.findIndex((h) => h === "name" || h === "hr_name" || h === "hr name" || h === "contact" || h === "recipient");
    companyIdx = header.findIndex((h) => h === "company" || h === "organization" || h === "employer");
    startRow = 1;
  } else {
    const firstCells = splitRow(lines[0]);
    const idx = firstCells.findIndex((c) => STRICT_EMAIL.test(c));
    if (idx >= 0) emailIdx = idx;
  }

  const seen: Record<string, true> = {};
  const out: Recipient[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    const email = (cells[emailIdx] || "").toLowerCase().trim();
    if (!STRICT_EMAIL.test(email)) continue;
    if (seen[email]) continue;
    seen[email] = true;
    out.push({
      email,
      name: nameIdx >= 0 ? cells[nameIdx]?.trim() : undefined,
      company: companyIdx >= 0 ? cells[companyIdx]?.trim() : undefined,
    });
  }
  return out;
}

export default function MultipleMail() {
  const [fromEmail, setFromEmail] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [fileName, setFileName] = useState("");
  const [page, setPage] = useState(0);
  const [subjectTpl, setSubjectTpl] = useState("Application for {company}");
  const [bodyTpl, setBodyTpl] = useState(
    "Dear {name},\n\nI hope this email finds you well. I am writing to express my interest in opportunities at {company}.\n\nBest regards,\n[Your Name]"
  );

  const totalPages = Math.max(1, Math.ceil(recipients.length / ITEMS_PER_PAGE));
  const pageStart = page * ITEMS_PER_PAGE;
  const pageItems = recipients.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setRecipients(parsed);
    setPage(0);
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const hasData = recipients.length > 0;

  return (
    <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold text-on-background">Multiple Mail</h3>
      </div>

      {/* Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            Subject <span className="text-on-surface-variant/60">— {"{name}"} {"{company}"}</span>
          </label>
          <input
            value={subjectTpl}
            onChange={(e) => setSubjectTpl(e.target.value)}
            className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">
            From (your email)
          </label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-on-surface-variant mb-1">Email Body</label>
        <textarea
          value={bodyTpl}
          onChange={(e) => setBodyTpl(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-outline-variant bg-background px-3 py-2 text-sm text-on-background font-mono"
        />
      </div>

      {/* CSV Upload */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-on-surface-variant mb-1">
          Upload HR List (CSV)
        </label>
        <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-outline-variant bg-background cursor-pointer hover:bg-surface-container-high transition-colors w-fit">
          <Upload className="w-4 h-4 text-on-surface-variant" />
          <span className="text-xs text-on-surface-variant">{fileName || "Choose CSV file"}</span>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        {recipients.length > 0 && (
          <p className="text-xs text-on-surface-variant mt-1">{recipients.length} HR emails found</p>
        )}
      </div>

      {/* Recipients Table */}
      {hasData && (
        <>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium w-10">#</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Email</th>
                  <th className="text-left py-2 px-2 text-on-surface-variant font-medium">Company / Name</th>
                  <th className="text-right py-2 px-2 text-on-surface-variant font-medium w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, idx) => {
                  const displayName = r.name || r.company || "";
                  const subject = encodeURIComponent(
                    subjectTpl
                      .replace(/\{name\}/gi, r.name || "Hiring Manager")
                      .replace(/\{company\}/gi, r.company || "your company")
                  );
                  const body = encodeURIComponent(
                    bodyTpl
                      .replace(/\{name\}/gi, r.name || "Hiring Manager")
                      .replace(/\{company\}/gi, r.company || "your company")
                  );
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${r.email}&su=${subject}&body=${body}`;

                  return (
                    <tr key={r.email} className="border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors">
                      <td className="py-2.5 px-2 text-on-surface-variant">{pageStart + idx + 1}</td>
                      <td className="py-2.5 px-2 text-on-background font-medium">{r.email}</td>
                      <td className="py-2.5 px-2 text-on-surface-variant">{displayName || "—"}</td>
                      <td className="py-2.5 px-2 text-right">
                        <a
                          href={gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open in Gmail
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-on-surface-variant">
              Showing {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, recipients.length)} of {recipients.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="text-center py-8">
          <Mail className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/30" />
          <p className="text-xs text-on-surface-variant">Upload a CSV with HR email addresses to get started</p>
          <p className="text-[10px] text-on-surface-variant/50 mt-1">Columns: email, name, company</p>
        </div>
      )}
    </div>
  );
}
