"use client";

import { useState, useRef, useEffect } from "react";
import { downloadPDF } from "@/utils/pdfExporter";
import { useToast } from "./ToastProvider";
import { latexToHtml } from "@/utils/latexFormatter";
import { Download, FileText, Code, AlignLeft, File as FileIcon, ChevronDown } from "lucide-react";

interface DownloadDropdownProps {
  resumeData: any;
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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={downloading !== null}
        className="flex items-center gap-2 w-full py-3 bg-primary hover:bg-primary/95 text-on-primary text-sm font-semibold rounded-xl transition-all active:scale-98 shadow-md justify-center"
      >
        {downloading ? (
          <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Download Resume</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-56 bg-surface-container border border-outline-variant rounded-2xl shadow-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant bg-surface-container-low">
            Select Export Format
          </div>
          <div className="p-2 space-y-1">
            <button 
              onClick={() => downloadFile("pdf")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center text-error group-hover:scale-110 transition-transform">
                <FileIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface">PDF Document</p>
                <p className="text-[10px] text-on-surface-variant">Best for printing</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("tex")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Code className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface">LaTeX Source</p>
                <p className="text-[10px] text-on-surface-variant">For LaTeX editors</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("doc")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface">Word Document</p>
                <p className="text-[10px] text-on-surface-variant">Editable format</p>
              </div>
            </button>
            <button 
              onClick={() => downloadFile("txt")} 
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface">Plain Text</p>
                <p className="text-[10px] text-on-surface-variant">Simple formatting</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
