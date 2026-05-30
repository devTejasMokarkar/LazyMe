"use client";

import { ResumeData } from "@/features/ai/prompts/resume.prompts";
import { resumeToLatex, latexToHtml } from "@/features/ai/latex.service";
import { FileText } from "lucide-react";

interface LivePreviewProps {
  data: ResumeData;
}

export function LivePreview({ data }: LivePreviewProps) {
  const latex = resumeToLatex(data);
  const html = latexToHtml(latex);

  const hasContent = data.name || data.experience.length > 0;

  if (!hasContent) {
    return (
      <div className="w-full overflow-x-auto">
        <div className="bg-white w-[794px] h-[1123px] shadow-2xl flex items-center justify-center p-12 mx-auto">
          <div className="text-center text-slate-300">
            <FileText className="w-16 h-16 mx-auto mb-6 opacity-20" />
            <p className="text-xl font-bold">Resume Preview</p>
            <p className="text-sm mt-2 text-slate-400">Content will appear as you type or upload.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="bg-white w-[794px] min-h-[1123px] shadow-[0_0_20px_rgba(0,0,0,0.5)] p-[40px] text-black animate-in fade-in duration-700 relative overflow-hidden flex flex-col mx-auto">
      <style jsx global>{`
        .resume-content h2 {
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #000 !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1.5px solid #000;
          padding-bottom: 4px;
          margin-top: 24px !important;
          margin-bottom: 12px !important;
        }
        .resume-content strong {
          font-weight: 600 !important;
        }
        .resume-content p, .resume-content li {
          font-weight: 400 !important;
          color: #000 !important;
          line-height: 1.5;
        }
        .resume-content .text-center h1 {
          font-size: 32px !important;
          font-weight: 700 !important;
          margin-bottom: 4px !important;
        }
        .resume-content .text-center p {
          font-size: 14px !important;
          color: #444 !important;
        }
      `}</style>
      
      {/* Resume Content rendered via LaTeX-to-HTML formatter */}
      <div 
        className="resume-content prose prose-slate max-w-none prose-headings:m-0 prose-p:m-0 w-full"
        style={{
          fontFamily: "'Inter', sans-serif",
        }}
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    </div>
      </div>
  );
}
