"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Undo2, Redo2, Mail, Phone, MapPin, Sparkles, PlusCircle, X,
  Download, ZoomIn, ZoomOut, Upload, FileType, CheckCircle2, History,
  RotateCcw, Save, Trash2, Eye, Loader2, PanelLeftClose, PanelRightClose,
  Monitor, Smartphone
} from 'lucide-react';
import { cn, validateParsedResume } from '@/lib/utils';

interface ResumeVersion {
  id: string;
  timestamp: string;
  name: string;
  content: {
    name: string;
    title: string;
    experience: any[];
    skills: string[];
    email?: string;
    phone?: string;
  };
}

interface ParsedSection {
  name: string;
  status: 'success' | 'warning' | 'error';
  confidence: number;
}

// Helper to normalize skills from various formats
function normalizeSkills(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'object') {
    return [
      ...(skills.technical || []),
      ...(skills.soft || []),
      ...(skills.tools || []),
      ...(skills.languages || []),
    ];
  }
  return [];
}

export default function ResumeBuilder({ initialPrompt }: { initialPrompt?: string }) {
  const [loading, setLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [resumeTheme, setResumeTheme] = useState<'light' | 'dark'>('light');
  const [zoom, setZoom] = useState(85);

  const [resumeId, setResumeId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [experience, setExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [education, setEducation] = useState<any[]>([]);

  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [parsingFeedback, setParsingFeedback] = useState<ParsedSection[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [needsUpload, setNeedsUpload] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingResumeApplied = useRef(false);

  useEffect(() => {
    if (initialPrompt !== undefined) setNeedsUpload(true);
  }, [initialPrompt]);

  useEffect(() => {
    if (!loading && needsUpload && fileInputRef.current) {
      setTimeout(() => fileInputRef.current?.click(), 300);
    }
  }, [loading, needsUpload]);

  useEffect(() => {
    // Clear any stale pending resume on mount (handles logout/login)
    sessionStorage.removeItem('pendingResume');
    localStorage.removeItem('lazyme_pending_resume');

    function applyPendingResume() {
      const pending = sessionStorage.getItem('pendingResume');
      if (!pending) return false;
      sessionStorage.removeItem('pendingResume');
      try {
        const parsed = JSON.parse(pending);
        pendingResumeApplied.current = true;
        setUserName(parsed.name || 'Your Name');
        setUserRole(parsed.title || 'Your Role');
        setExperience(parsed.experience || []);
        setSkills(normalizeSkills(parsed.skills));
        setEmail(parsed.email || '');
        setPhone(parsed.phone || '');
        setLocation(parsed.location || '');
        setSummary(parsed.summary || '');
        setEducation(parsed.education || []);
        setUploadSuccess(true);
        setLoading(false);
        setParsingFeedback([
          { name: 'Identity', status: 'success', confidence: 98 },
          { name: 'Experience', status: 'success', confidence: 94 },
          { name: 'Skills', status: 'success', confidence: 91 },
          { name: 'Education', status: 'success', confidence: 88 }
        ]);
        setTimeout(() => setUploadSuccess(false), 5000);
        return true;
      } catch { return false; }
    }
    applyPendingResume();
    const handler = () => applyPendingResume();
    window.addEventListener('pendingResumeReady', handler);
    return () => window.removeEventListener('pendingResumeReady', handler);
  }, []);

  useEffect(() => {
    async function fetchResumes() {
      if (pendingResumeApplied.current) { setLoading(false); return; }
      try {
        // Always fetch fresh data with cache-busting
        const res = await fetch('/api/resumes?_t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          if (initialPrompt === undefined) loadResume(primary);
          setVersions(data.map((r: any) => ({
            id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
          })));
        }
      } catch (error) { console.error("Failed to fetch resumes:", error); }
      finally { setLoading(false); }
    }
    fetchResumes();
  }, []);

  const loadResume = (resume: any) => {
    setResumeId(resume.id);
    const c = resume.content;
    setUserName(c.name || 'Your Name');
    setUserRole(c.title || 'Your Role');
    setExperience(c.experience || []);
    setSkills(normalizeSkills(c.skills));
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setLocation(c.location || '');
    setSummary(c.summary || '');
    setEducation(c.education || []);
  };

  const saveCurrentVersion = async (name: string = `Backup ${new Date().toLocaleTimeString()}`) => {
    const content = { name: userName, title: userRole, experience, skills, email, phone, location, summary, education };
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, isDefault: false })
      });
      const newResume = await res.json();
      setVersions(prev => [{ id: newResume.id, timestamp: new Date().toLocaleString(), name, content }, ...prev]);
    } catch (error) { console.error("Save failed:", error); }
  };

  const revertToVersion = (version: ResumeVersion) => {
    setUserName(version.content.name);
    setUserRole(version.content.title);
    setExperience(version.content.experience);
    setSkills(normalizeSkills(version.content.skills));
    setEmail(version.content.email || '');
    setPhone(version.content.phone || '');
    setLocation(version.content.location || '');
    setSummary(version.content.summary || '');
    setEducation(version.content.education || []);
    setResumeId(version.id);
    setShowHistory(false);
  };

  const addEducation = () => {
    setEducation([...education, { school: 'School Name', degree: 'Degree', year: '2020' }]);
  };

  const addExperience = () => {
    setExperience([...experience, { company: 'Company Name', role: 'Job Title', duration: '2020 - Present', bullets: ['Achievement 1', 'Achievement 2'] }]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setParsingFeedback([]);
    setParseError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        const validationError = validateParsedResume(data);
        if (validationError) {
          setParseError(validationError);
          setParsingFeedback([
            { name: 'Identity', status: 'error', confidence: 0 },
            { name: 'Experience', status: 'error', confidence: 0 },
            { name: 'Skills', status: 'error', confidence: 0 },
            { name: 'Education', status: 'error', confidence: 0 }
          ]);
          return;
        }
        setUserName(data.name || 'Your Name');
        setUserRole(data.title || 'Your Role');
        setExperience(data.experience || []);
        setSkills(normalizeSkills(data.skills));
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setLocation(data.location || '');
        setSummary(data.summary || '');
        setEducation(data.education || []);
        setUploadSuccess(true);
        setNeedsUpload(false);
        setParsingFeedback([
          { name: 'Identity', status: 'success', confidence: 98 },
          { name: 'Experience', status: 'success', confidence: 94 },
          { name: 'Skills', status: 'success', confidence: 91 },
          { name: 'Education', status: 'success', confidence: 88 }
        ]);

        // Auto-save the uploaded resume to database
        const saveRes = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Resume ${new Date().toLocaleDateString()}`,
            content: { name: data.name, title: data.title, experience: data.experience, skills: data.skills, email: data.email, phone: data.phone, location: data.location, summary: data.summary, education: data.education },
            isDefault: true
          })
        });

        // Refresh versions with fresh fetch
        const versionsRes = await fetch('/api/resumes?_t=' + Date.now());
        if (versionsRes.ok) {
          const latestVersions = await versionsRes.json();
          if (Array.isArray(latestVersions)) {
            setVersions(latestVersions.map((r: any) => ({
              id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
            })));
          }
        }
      } else {
        setParseError(data.error || 'Parsing failed.');
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setParseError('Upload failed.');
    } finally {
      setIsParsing(false);
      setTimeout(() => setUploadSuccess(false), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Editor - Takes remaining space */}
      <section className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-outline-variant/30 px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Cloud className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Synced</span>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-container-high text-on-surface-variant transition-all"
              >
                <History className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{versions.length}</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => saveCurrentVersion()} className="p-2 hover:bg-surface-container rounded-md text-on-surface-variant hover:text-primary transition-colors" title="Save">
                <Save className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors"><Undo2 className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors"><Redo2 className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-outline-variant/30 mx-1" />
              <button onClick={() => setShowPreview(!showPreview)} className="p-2 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors">
                {showPreview ? <PanelRightClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Upload Card */}
            <div className="relative group">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx" />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "bg-surface-container-low border border-outline-variant/50 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-surface-container-high hover:border-primary/30",
                  isParsing && "pointer-events-none opacity-50",
                  parseError && "border-red-500/30 bg-red-500/5"
                )}
              >
                <AnimatePresence mode="wait">
                  {isParsing ? (
                    <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary" />
                        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                      </div>
                      <div><h3 className="text-sm font-bold">AI Parsing...</h3><p className="text-xs text-on-surface-variant">Extracting experience</p></div>
                    </motion.div>
                  ) : uploadSuccess ? (
                    <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-tertiary"><CheckCircle2 className="w-5 h-5" /><span className="text-sm font-bold">Resume Parsed</span></div>
                      <div className="flex gap-1.5">{parsingFeedback.map(s => (<span key={s.name} className="px-2 py-0.5 bg-surface-container-high rounded text-[9px] font-semibold">{s.name}</span>))}</div>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center"><Upload className="w-5 h-5 text-on-surface-variant" /></div>
                      <div><h3 className="text-sm font-bold">Import Resume</h3><p className="text-xs text-on-surface-variant">PDF or DOCX</p></div>
                      <div className="flex gap-2 mt-1"><span className="text-[8px] font-semibold text-outline uppercase bg-background px-2 py-0.5 rounded border border-outline-variant">PDF</span><span className="text-[8px] font-semibold text-outline uppercase bg-background px-2 py-0.5 rounded border border-outline-variant">DOCX</span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Name & Role Card */}
            <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-5 group">
              <h1 className="text-2xl font-bold text-on-surface outline-none focus:text-primary transition-colors" contentEditable suppressContentEditableWarning onBlur={(e) => setUserName(e.currentTarget.innerText)}>{userName || 'Your Name'}</h1>
              <p className="text-on-surface-variant text-sm font-medium mt-1 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setUserRole(e.currentTarget.innerText)}>{userRole || 'Your Title'}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-on-surface-variant/70">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email || 'email'}</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone || 'phone'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location || 'location'}</span>
              </div>
              <button className="absolute -right-2 top-4 w-8 h-8 flex items-center justify-center bg-primary/10 border border-primary/20 text-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><Sparkles className="w-4 h-4" /></button>
            </div>

            {/* Summary Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Summary</h3>
              </div>
              <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 group">
                <div
                  className="text-sm text-on-surface outline-none min-h-[80px]"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setSummary(e.currentTarget.innerText)}
                >
                  {summary || 'Write a brief professional summary about yourself...'}
                </div>
              </div>
            </div>

            {/* Education Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Education</h3>
                <button onClick={addEducation} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><PlusCircle className="w-5 h-5" /></button>
              </div>
              {education.length === 0 ? (
                <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 text-center text-on-surface-variant text-sm">
                  No education added yet
                </div>
              ) : (
                education.map((edu, i) => (
                  <div key={i} className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 group hover:border-outline-variant/80 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-base font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...education]; n[i].school = e.currentTarget.innerText; setEducation(n); }}>{edu.school}</h4>
                        <p className="text-xs font-semibold text-on-surface-variant mt-0.5 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...education]; n[i].degree = e.currentTarget.innerText; setEducation(n); }}>{edu.degree}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-on-surface-variant/60">{edu.year}</span>
                        <button onClick={() => setEducation(education.filter((_, idx) => idx !== i))} className="p-1 text-on-surface-variant hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Experience Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Experience</h3>
                <button onClick={addExperience} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><PlusCircle className="w-5 h-5" /></button>
              </div>
              {experience.map((exp, i) => (
                <div key={i} className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 group hover:border-outline-variant/80 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-base font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].company = e.currentTarget.innerText; setExperience(n); }}>{exp.company}</h4>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase mt-0.5 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].role = e.currentTarget.innerText; setExperience(n); }}>{exp.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-on-surface-variant/60">{exp.duration || exp.period}</span>
                      <button onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} className="p-1 text-on-surface-variant hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <ul className="list-disc ml-4 text-sm text-on-surface-variant space-y-1.5">
                    {(exp.bullets || []).map((b: string, j: number) => (<li key={j} className="outline-none leading-relaxed" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].bullets[j] = e.currentTarget.innerText; setExperience(n); }}>{b}</li>))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Skills Section */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Skills & Tools</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <div key={skill} className="bg-surface-container-low border border-outline-variant/50 rounded-full px-3 py-1.5 flex items-center gap-2 group transition-all hover:bg-surface-container-high">
                    <span className="text-xs font-semibold text-on-surface">{skill}</span>
                    <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="text-on-surface-variant hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button onClick={() => setSkills([...skills, 'New'])} className="bg-primary/10 border border-primary/30 text-primary rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-primary/15 transition-all">+ Add</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Panel - Fixed width, sticky */}
      <AnimatePresence>
        {showPreview && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 600, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:flex flex-col h-full bg-[#0d0e13] border-l border-white/5 overflow-hidden"
          >
            {/* Preview Toolbar */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={() => setPreviewMode('desktop')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'desktop' ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setPreviewMode('mobile')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'mobile' ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}><Smartphone className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                  <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 text-white/50 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <span className="text-[10px] font-mono text-white/40 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(Math.min(120, zoom + 10))} className="p-1.5 text-white/50 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => setResumeTheme(resumeTheme === 'light' ? 'dark' : 'light')} className="text-[10px] font-semibold text-white/40 uppercase hover:text-white/60">{resumeTheme}</button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center bg-[#0d0e13]">
              <motion.div
                className={cn(
                  "rounded-lg shadow-2xl p-8 flex flex-col font-sans transition-all",
                  previewMode === 'mobile' ? "w-[320px]" : "w-[800px]"
                )}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  minHeight: '900px',
                  backgroundColor: resumeTheme === 'light' ? '#ffffff' : '#1a1b1f',
                  color: resumeTheme === 'light' ? '#1e293b' : '#e2e8f0'
                }}
              >
                {/* Resume Content */}
                <div className="text-center mb-6">
                  <h2 className={cn("text-2xl font-extrabold", resumeTheme === 'light' ? "text-slate-900" : "text-white")}>{userName || 'Your Name'}</h2>
                  <p className={cn("text-sm", resumeTheme === 'light' ? "text-slate-500" : "text-slate-400")}>{userRole || 'Your Title'}</p>
                </div>
                <div className={cn("flex justify-center gap-4 text-[9px] uppercase tracking-wider mb-5 pb-3 border-b", resumeTheme === 'light' ? "text-slate-400 border-slate-100" : "text-slate-500 border-slate-800")}>
                  {email && <span>{email}</span>}
                  {phone && <span>{phone}</span>}
                  <span>{location || 'Location'}</span>
                </div>
                <div className="space-y-5 flex-1">
                  {summary && (
                    <div>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-2", resumeTheme === 'light' ? "text-slate-300" : "text-slate-700")}>Summary</h3>
                      <p className={cn("text-xs leading-relaxed", resumeTheme === 'light' ? "text-slate-500" : "text-slate-400")}>{summary}</p>
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className={cn("pt-2", summary ? "border-t" : "")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-2", resumeTheme === 'light' ? "text-slate-300" : "text-slate-700")}>Skills</h3>
                      <div className={cn("text-xs flex flex-wrap gap-x-3 gap-y-1", resumeTheme === 'light' ? "text-slate-500" : "text-slate-400")}>{skills.join(', ')}</div>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div className={cn("pt-4 border-t", resumeTheme === 'light' ? "border-slate-50" : "border-slate-800")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-3", resumeTheme === 'light' ? "text-slate-300" : "text-slate-700")}>Experience</h3>
                      <div className="space-y-4">
                        {experience.map((exp, i) => (
                          <div key={i}>
                            <div className="flex justify-between"><span className={cn("font-bold text-xs", resumeTheme === 'light' ? "text-slate-900" : "text-white")}>{exp.company}</span><span className={cn("text-[9px]", resumeTheme === 'light' ? "text-slate-400" : "text-slate-500")}>{exp.duration || exp.period}</span></div>
                            <p className={cn("text-xs mt-0.5", resumeTheme === 'light' ? "text-slate-500" : "text-slate-400")}>{exp.role}</p>
                            {(exp.bullets && exp.bullets.length > 0) && (
                              <ul className={cn("text-[10px] mt-1 space-y-0.5", resumeTheme === 'light' ? "text-slate-400" : "text-slate-500")}>
                                {exp.bullets.slice(0, 3).map((b: string, j: number) => (
                                  <li key={j} className="flex gap-1"><span className="shrink-0">•</span><span>{b}</span></li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {education.length > 0 && (
                    <div className={cn("pt-4 border-t", resumeTheme === 'light' ? "border-slate-50" : "border-slate-800")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-3", resumeTheme === 'light' ? "text-slate-300" : "text-slate-700")}>Education</h3>
                      <div className="space-y-2">
                        {education.map((edu, i) => (
                          <div key={i}>
                            <div className="flex justify-between"><span className={cn("font-bold text-xs", resumeTheme === 'light' ? "text-slate-900" : "text-white")}>{edu.school}</span><span className={cn("text-[9px]", resumeTheme === 'light' ? "text-slate-400" : "text-slate-500")}>{edu.year}</span></div>
                            <p className={cn("text-xs mt-0.5", resumeTheme === 'light' ? "text-slate-500" : "text-slate-400")}>{edu.degree}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Download Action */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
              <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Preview Toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="lg:hidden fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center z-30"
      >
        {showPreview ? <PanelRightClose className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {/* Version History Modal */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-80 bg-surface-container-low border-l border-outline-variant/50 z-50 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
                <div className="flex items-center gap-2"><History className="w-5 h-5 text-primary" /><h2 className="text-base font-bold">Timeline</h2></div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-surface-container-highest rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versions.length === 0 ? <div className="text-center text-on-surface-variant text-sm py-10 opacity-50">No versions</div> : versions.map(v => (
                  <div key={v.id} className="bg-surface-container-high border border-outline-variant/50 rounded-lg p-3 group">
                    <div className="flex justify-between"><div><h4 className="text-sm font-semibold">{v.name}</h4><p className="text-[9px] text-on-surface-variant mt-0.5">{v.timestamp}</p></div><button onClick={async () => { await fetch(`/api/resumes?id=${v.id}`, { method: 'DELETE' }); setVersions(versions.filter(x => x.id !== v.id)); }} className="p-1 opacity-0 group-hover:opacity-100 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div>
                    <button onClick={() => revertToVersion(v)} className="w-full mt-2 bg-primary/10 text-primary text-[10px] font-semibold py-1.5 rounded hover:bg-primary/20 transition-all">Revert</button>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}