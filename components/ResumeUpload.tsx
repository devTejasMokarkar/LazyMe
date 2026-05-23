"use client";

import { useCallback, useState } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { useToast } from "./ToastProvider";

interface ResumeUploadProps {
  onParsed: (data: {
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
    summary?: string;
    skills?: string[];
    experience?: Array<any>;
    education?: Array<any>;
  }) => void;
}

export function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const { showToast } = useToast();

  const handleFile = useCallback(async (selectedFile: File) => {
    // Supported MIME types (PDF, DOCX, TXT, TEX, images)
    const supportedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/x-tex",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    // Validate file type
    if (!supportedTypes.includes(selectedFile.type)) {
      showToast(
        "We couldn't read your resume.\n\n✔ Please upload:\n• PDF, DOCX, TXT, TEX, or an image (PNG/JPG)\n• OR paste your resume manually",
        "error"
      );
      return;
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast("File too large. Maximum size is 5MB.", "error");
      return;
    }

    // Validate file not empty
    if (selectedFile.size === 0) {
      showToast("File is empty. Please select a valid file.", "error");
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to parse resume");
      }

      const data = await res.json();
      onParsed(data);
      showToast("Resume parsed successfully!", "success");
    } catch (error: any) {
      const errorMessage = error.message || "Failed to parse resume. Try manual entry.";
      showToast(errorMessage, "error");
    } finally {
      setParsing(false);
    }
  }, [onParsed, showToast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  return (
    <div className="w-full">
      {!file ? (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-outline-variant rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,.tex,.png,.jpg,.jpeg,.webp,.gif,image/*"
            onChange={onInput}
            className="hidden"
            id="resume-upload"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 mx-auto mb-3 text-on-surface-variant" />
            <p className="text-on-background font-medium mb-1">Drop your resume here</p>
            <p className="text-on-surface-variant text-sm">PDF, DOCX, TXT, TEX, PNG, JPG (max 5MB)</p>
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-surface-container-high/50 border border-outline-variant rounded-xl p-4">
          <File className="w-8 h-8 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-on-background font-medium truncate">{file.name}</p>
            <p className="text-on-surface-variant text-sm">
              {parsing ? "Parsing with AI..." : "Ready"}
            </p>
          </div>
          {parsing && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          <button
            onClick={() => { setFile(null); }}
            className="p-1 hover:bg-surface-container-highest rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      )}
    </div>
  );
}
