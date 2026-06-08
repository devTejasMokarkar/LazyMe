"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  X,
  Upload,
  ClipboardList,
  FileText,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Trash2,
  Users,
} from "lucide-react";

interface Recipient {
  email: string;
  name?: string;
  company?: string;
}

interface ProgressItem {
  email: string;
  status: "pending" | "sent" | "failed" | "preview";
  error?: string;
  subject?: string;
}

interface ResumeOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface BulkMailToHRProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle?: string;
}

const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const STRICT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 200;

function extractEmailsFromText(text: string): Recipient[] {
  const matches = text.match(EMAIL_REGEX) || [];
  const seen: Record<string, true> = {};
  const out: Recipient[] = [];
  for (const m of matches) {
    const key = m.toLowerCase().trim();
    if (!seen[key]) {
      seen[key] = true;
      out.push({ email: key });
    }
  }
  return out;
}

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

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}

export default function BulkMailToHR({ isOpen, onClose, jobTitle = "" }: BulkMailToHRProps) {
  const [mode, setMode] = useState<"paste" | "csv">("paste");
  const [pasted, setPasted] = useState("");
  const [csvRecipients, setCsvRecipients] = useState<Recipient[]>([]);
  const [csvFileName, setCsvFileName] = useState("");

  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [subjectTpl, setSubjectTpl] = useState(
    jobTitle ? `Application for ${jobTitle} - {company}` : `Application for {company}`
  );
  const [bodyTpl, setBodyTpl] = useState(
    `Dear {name},\n\nI hope this email finds you well. I am writing to express my interest in opportunities at {company}.\n\nPlease find my resume attached for your review. I would welcome the chance to discuss how my background fits your team.\n\nBest regards,\n[Your Name]`
  );

  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [throttleMs, setThrottleMs] = useState(1000);

  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    successful: number;
    failed: number;
    mode: "send" | "preview";
  } | null>(null);
  const [globalError, setGlobalError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/resumes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        const opts: ResumeOption[] = data.map((r: any) => ({
          id: r.id,
          name: r.name || "Resume",
          isDefault: !!r.isDefault,
        }));
        setResumes(opts);
        const def = opts.find((o) => o.isDefault) || opts[0];
        if (def) setResumeId(def.id);
      })
      .catch(() => {});

    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.profile;
        if (!p) return;
        if (p.fullName && !fromName) setFromName(p.fullName);
        if (p.email && !fromEmail) setFromEmail(p.email);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [isOpen]);

  const pasteRecipients = useMemo(() => extractEmailsFromText(pasted), [pasted]);
  const activeRecipients = mode === "paste" ? pasteRecipients : csvRecipients;
  const recipientCount = activeRecipients.length;

  const handleCsvFile = async (file: File) => {
    setCsvFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvRecipients(parsed.slice(0, MAX_RECIPIENTS));
  };

  const handleAttachmentFile = (file: File | null) => {
    if (!file) {
      setAttachmentFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setGlobalError("Attachment must be under 5 MB");
      return;
    }
    setGlobalError("");
    setAttachmentFile(file);
  };

  const handleSend = async () => {
    setGlobalError("");
    setSummary(null);
    setProgress([]);

    if (recipientCount === 0) {
      setGlobalError("Add at least one recipient first.");
      return;
    }
    if (recipientCount > MAX_RECIPIENTS) {
      setGlobalError(`Max ${MAX_RECIPIENTS} recipients per batch.`);
      return;
    }
    if (!STRICT_EMAIL.test(fromEmail)) {
      setGlobalError("Enter a valid sender email.");
      return;
    }
    if (!fromName.trim()) {
      setGlobalError("Enter your name (sender name).");
      return;
    }
    if (!subjectTpl.trim() || !bodyTpl.trim()) {
      setGlobalError("Subject and body cannot be empty.");
      return;
    }

    let attachmentPayload: { filename: string; content: string; contentType?: string } | undefined;
    if (attachmentFile) {
      try {
        const b64 = await fileToBase64(attachmentFile);
        attachmentPayload = {
          filename: attachmentFile.name,
          content: b64,
          contentType: attachmentFile.type || "application/octet-stream",
        };
      } catch {
        setGlobalError("Failed to read attachment file.");
        return;
      }
    }

    setIsSending(true);
    setProgress(
      activeRecipients.map((r) => ({ email: r.email, status: "pending" }))
    );

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          recipients: activeRecipients,
          fromEmail: fromEmail.trim(),
          fromName: fromName.trim(),
          subjectTemplate: subjectTpl,
          bodyTemplate: bodyTpl,
          resumeId: resumeId || undefined,
          throttleMs,
          attachment: attachmentPayload,
          smtpPass: gmailPass.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        let msg = "Failed to start bulk send.";
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error || msg;
        } catch {
          if (errText) msg = errText;
        }
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx = buffer.indexOf("\n");
        while (nlIdx >= 0) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          nlIdx = buffer.indexOf("\n");
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "progress") {
              setProgress((prev) => {
                const next = [...prev];
                if (typeof evt.index === "number" && next[evt.index]) {
                  next[evt.index] = {
                    email: evt.email,
                    status: evt.status,
                    error: evt.error,
                    subject: evt.subject,
                  };
                }
                return next;
              });
            } else if (evt.type === "done") {
              setSummary({
                total: evt.total,
                successful: evt.successful,
                failed: evt.failed,
                mode: evt.mode,
              });
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setGlobalError(e?.message || "Bulk send failed.");
      }
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsSending(false);
  };

  const sentCount = progress.filter((p) => p.status === "sent").length;
  const failedCount = progress.filter((p) => p.status === "failed").length;
  const previewCount = progress.filter((p) => p.status === "preview").length;
  const pct = progress.length
    ? Math.round(((sentCount + failedCount + previewCount) / progress.length) * 100)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          onClick={isSending ? undefined : onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Bulk Mail HR</h2>
                  <p className="text-xs text-on-surface-variant">
                    Send personalized emails to up to {MAX_RECIPIENTS} recruiters at once
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSending}
                className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setMode("paste")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mode === "paste"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> Paste Emails
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("csv")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      mode === "csv"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload CSV
                  </button>
                  <span className="ml-auto text-xs text-on-surface-variant">
                    {recipientCount} valid recipient{recipientCount === 1 ? "" : "s"}
                  </span>
                </div>

                {mode === "paste" ? (
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={4}
                    placeholder={"hr1@company.com, hr2@company.com\nhr3@example.com\n..."}
                    className="w-full rounded-md border border-outline-variant bg-background px-3 py-2 text-sm text-on-background font-mono"
                  />
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-md py-6 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors">
                      <Upload className="w-5 h-5 text-on-surface-variant" />
                      <span className="text-xs text-on-surface-variant">
                        {csvFileName ? csvFileName : "Click to upload CSV (columns: email, name, company)"}
                      </span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleCsvFile(f);
                        }}
                      />
                    </label>
                    {csvRecipients.length > 0 && (
                      <div className="max-h-32 overflow-y-auto rounded-md border border-outline-variant/40 bg-surface-container/40">
                        <table className="w-full text-[11px]">
                          <thead className="bg-surface-container text-on-surface-variant uppercase tracking-wider">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium">Email</th>
                              <th className="px-2 py-1 text-left font-medium">Name</th>
                              <th className="px-2 py-1 text-left font-medium">Company</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvRecipients.slice(0, 50).map((r, i) => (
                              <tr key={i} className="border-t border-outline-variant/20">
                                <td className="px-2 py-1 text-on-background">{r.email}</td>
                                <td className="px-2 py-1 text-on-surface-variant">{r.name || "—"}</td>
                                <td className="px-2 py-1 text-on-surface-variant">{r.company || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvRecipients.length > 50 && (
                          <p className="px-2 py-1 text-[10px] text-on-surface-variant/70">
                            +{csvRecipients.length - 50} more…
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Jane Doe"
                    className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="jane@gmail.com"
                    className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Gmail App Password
                  </label>
                  <input
                    type="password"
                    value={gmailPass}
                    onChange={(e) => setGmailPass(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                  />
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                    Required for Gmail. Get from{" "}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                      Google App Passwords
                    </a>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Subject <span className="text-on-surface-variant/60">— use {"{name}"} and {"{company}"}</span>
                </label>
                <input
                  value={subjectTpl}
                  onChange={(e) => setSubjectTpl(e.target.value)}
                  className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Email Body <span className="text-on-surface-variant/60">— {"{name}"} and {"{company}"} get replaced per recipient</span>
                </label>
                <textarea
                  value={bodyTpl}
                  onChange={(e) => setBodyTpl(e.target.value)}
                  rows={7}
                  className="w-full rounded-md border border-outline-variant bg-background px-3 py-2 text-sm text-on-background font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Attach Resume
                  </label>
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                  >
                    <option value="">No saved resume</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                  {resumeId && (
                    <p className="mt-1 text-[10px] text-on-surface-variant/70 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Attached as .txt (raw text extract)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Throttle (ms between sends)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    step={100}
                    value={throttleMs}
                    onChange={(e) => setThrottleMs(Number(e.target.value) || 0)}
                    className="h-9 w-full rounded-md border border-outline-variant bg-background px-3 text-sm text-on-background"
                  />
                  <p className="mt-1 text-[10px] text-on-surface-variant/70">
                    Recommended: 1000ms (≈1 email/sec) to avoid SMTP blocks
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Extra Attachment (PDF, DOCX, …)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-2 h-9 px-3 rounded-md border border-outline-variant bg-background cursor-pointer hover:bg-surface-container-high transition-colors">
                    <Paperclip className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span className="text-xs text-on-surface-variant truncate">
                      {attachmentFile ? attachmentFile.name : "Click to attach file (≤5 MB)"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleAttachmentFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {attachmentFile && (
                    <button
                      type="button"
                      onClick={() => setAttachmentFile(null)}
                      className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {globalError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-300">{globalError}</p>
                </div>
              )}

              {(isSending || progress.length > 0) && (
                <div className="rounded-lg border border-outline-variant/40 bg-surface-container/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-on-surface">
                      {isSending ? "Sending…" : summary ? "Completed" : "Ready"}
                    </span>
                    <span className="text-on-surface-variant">
                      {sentCount + failedCount + previewCount} / {progress.length} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {sentCount} sent
                    </span>
                    {previewCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <FileText className="w-3.5 h-3.5" /> {previewCount} preview
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" /> {failedCount} failed
                    </span>
                  </div>

                  {summary?.mode === "preview" && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      SMTP not configured. Emails were validated but not actually sent. Set SMTP_HOST,
                      SMTP_PORT, SMTP_USER, SMTP_PASS env vars to enable real sending.
                    </p>
                  )}

                  {progress.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-outline-variant/30 rounded-md bg-background">
                      <ul className="divide-y divide-outline-variant/20 text-[11px]">
                        {progress.map((p, idx) => (
                          <li key={`${p.email}-${idx}`} className="flex items-center justify-between px-2 py-1">
                            <span className="text-on-background truncate">{p.email}</span>
                            {p.status === "pending" && (
                              <span className="text-on-surface-variant/70 inline-flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> waiting
                              </span>
                            )}
                            {p.status === "sent" && (
                              <span className="text-green-700 dark:text-green-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> sent
                              </span>
                            )}
                            {p.status === "preview" && (
                              <span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                <FileText className="w-3 h-3" /> preview
                              </span>
                            )}
                            {p.status === "failed" && (
                              <span
                                className="text-red-700 dark:text-red-400 inline-flex items-center gap-1 truncate max-w-[60%]"
                                title={p.error}
                              >
                                <AlertCircle className="w-3 h-3" /> {p.error || "failed"}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container/40">
              <p className="text-[11px] text-on-surface-variant">
                {recipientCount > 0 && throttleMs > 0
                  ? `Estimated time: ~${Math.ceil((recipientCount * throttleMs) / 1000)}s`
                  : "Add recipients to begin"}
              </p>
              <div className="flex items-center gap-2">
                {isSending ? (
                  <button
                    onClick={handleCancel}
                    className="px-4 h-9 rounded-md border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 h-9 rounded-md border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Close
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={isSending || recipientCount === 0}
                  className="inline-flex items-center gap-2 px-5 h-9 rounded-md bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 shadow-md"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send to {recipientCount || 0}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
