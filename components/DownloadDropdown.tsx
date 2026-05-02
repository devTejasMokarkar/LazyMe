"use client";

import { useState, useRef, useEffect } from "react";
import { downloadPDF } from "@/utils/pdfExporter";
import { useToast } from "./ToastProvider";
import { latexToHtml } from "@/utils/latexFormatter";
import { Download, FileText, Code, AlignLeft, File as FileIcon, ChevronDown } from "lucide-react";

interface DownloadDropdownProps {
  resumeData: any; // Using structured data as single source
  latex: string;
  resumePreviewId?: string;
}

export default function DownloadDropdown({ resumeData, latex, resumePreviewId = "resume-preview" }: DownloadDropdownProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { showToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const downloadFile = async (type: string) => {
    setDownloading(type);
    
    try {
      const filename = `resume_${resumeData.name?.replace(/\s+/g, '_').toLowerCase() || 'download'}`;

      switch (type) {
        case "tex":
          const texBlob = new Blob([latex], { type: "application/x-tex" });
          const texUrl = URL.createObjectURL(texBlob);
          const texA = document.createElement("a");
          texA.href = texUrl;
          texA.download = `${filename}.tex`;
          texA.click();
          URL.revokeObjectURL(texUrl);
          showToast("LaTeX source downloaded!", "success");
          break;

        case "txt":
          // Plain text from structured data
          const txtContent = `
${resumeData.name.toUpperCase()}
${resumeData.title}
${resumeData.email} | ${resumeData.phone}

SUMMARY
${resumeData.summary}

SKILLS
${resumeData.skills.join(", ")}

EXPERIENCE
${resumeData.experience.map((e: any) => `${e.role} at ${e.company} (${e.duration})\n${e.bullets.map((b: string) => `• ${b}`).join("\n")}`).join("\n\n")}

EDUCATION
${resumeData.education.map((e: any) => `${e.degree} from ${e.school} (${e.year})`).join("\n")}
          `.trim();
          
          const txtBlob = new Blob([txtContent], { type: "text/plain" });
          const txtUrl = URL.createObjectURL(txtBlob);
          const txtA = document.createElement("a");
          txtA.href = txtUrl;
          txtA.download = `${filename}.txt`;
          txtA.click();
          URL.revokeObjectURL(txtUrl);
          showToast("Plain text resume downloaded!", "success");
          break;

        case "pdf":
          if (resumePreviewId) {
            await downloadPDF(resumePreviewId, `${filename}.pdf`);
            showToast("PDF resume downloaded!", "success");
          }
          break;

        case "doc":
          // WORD EXPORT FIX: Use HTML source for consistency
          const htmlContent = latexToHtml(latex);
          const docContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Resume</title>
            <style>
              body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; }
              h1 { color: #1f4788; font-size: 24pt; }
              h2 { color: #1f4788; border-bottom: 1px solid #ccc; font-size: 16pt; margin-top: 20px; }
              ul { margin-left: 20px; }
              .text-center { text-align: center; }
              .float-right { float: right; }
            </style>
            </head>
            <body>${htmlContent}</body>
            </html>
          `;
          const docBlob = new Blob([docContent], { type: "application/msword" });
          const docUrl = URL.createObjectURL(docBlob);
          const docA = document.createElement("a");
          docA.href = docUrl;
          docA.download = `${filename}.doc`;
          docA.click();
          URL.revokeObjectURL(docUrl);
          showToast("Word document generated!", "success");
          break;

        default:
          break;
      }
    } catch (error) {
      showToast(`Failed to download ${type.toUpperCase()}`, "error");
    } finally {
      setDownloading(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={downloading !== null}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl border border-slate-700 transition-all active:scale-95 shadow-sm min-w-[110px] justify-center"
      >
        {downloading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Download className="w-4 h-4 text-primary" />
        )}
        <span>Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 bg-slate-900/50">
            Select Export Format
          </div>
          <div className="p-2 space-y-1">
            <button 
              onClick={() => downloadFile("pdf")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <FileIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold">PDF Document</p>
                <p className="text-[10px] text-slate-500">Best for printing</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("tex")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Code className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold">LaTeX Source</p>
                <p className="text-[10px] text-slate-500">For LaTeX editors</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("doc")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold">Word Document</p>
                <p className="text-[10px] text-slate-500">Editable format</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("txt")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold">Plain Text</p>
                <p className="text-[10px] text-slate-500">Simple formatting</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
