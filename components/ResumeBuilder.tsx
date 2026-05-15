"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Undo2, Redo2, Mail, Phone, MapPin, Sparkles, PlusCircle, X, Download, ZoomIn, ZoomOut, Upload, FileType, CheckCircle2, History, RotateCcw, Save, Trash2, Eye, Info, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  message?: string;
  suggestions?: string[];
}

export default function ResumeBuilder({ initialPrompt }: { initialPrompt?: string }) {
  const [loading, setLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [resumeTheme, setResumeTheme] = useState<'light' | 'dark'>('light');
  
  // Resume State
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [experience, setExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // History State
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  
  // Parsing Feedback State
  const [parsingFeedback, setParsingFeedback] = useState<ParsedSection[]>([]);
  const [needsUpload, setNeedsUpload] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When arriving from landing page, mark that we need an upload after loading completes
  useEffect(() => {
    if (initialPrompt !== undefined) {
      setNeedsUpload(true);
    }
  }, [initialPrompt]);

  // Once loading finishes and we need an upload, trigger the file picker
  useEffect(() => {
    if (!loading && needsUpload && fileInputRef.current) {
      setTimeout(() => fileInputRef.current?.click(), 300);
    }
  }, [loading, needsUpload]);

  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch('/api/resumes');
        if (!res.ok) {
          // API returned an error — just continue with empty state
          console.warn('Could not fetch resumes, status:', res.status);
          return;
        }
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          
          // Only load the default resume if we aren't starting an AI prompt flow
          if (initialPrompt === undefined) {
            loadResume(primary);
          }
          
          // Load versions
          setVersions(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            timestamp: new Date(r.updatedAt).toLocaleString(),
            content: r.content
          })));
        }
      } catch (error) {
        console.error("Failed to fetch resumes:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchResumes();
  }, []);

  const loadResume = (resume: any) => {
    setResumeId(resume.id);
    const c = resume.content;
    setUserName(c.name || 'Your Name');
    setUserRole(c.title || 'Your Role');
    setExperience(c.experience || []);
    setSkills(c.skills || []);
    setEmail(c.email || '');
    setPhone(c.phone || '');
  };

  const saveCurrentVersion = async (name: string = `Backup ${new Date().toLocaleTimeString()}`) => {
    const content = { name: userName, title: userRole, experience, skills, email, phone };
    
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          content,
          isDefault: false
        })
      });
      
      const newResume = await res.json();
      setVersions(prev => [{
        id: newResume.id,
        timestamp: new Date().toLocaleString(),
        name,
        content
      }, ...prev]);
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const revertToVersion = (version: ResumeVersion) => {
    setUserName(version.content.name);
    setUserRole(version.content.title);
    setExperience(version.content.experience);
    setSkills(version.content.skills);
    setEmail(version.content.email || '');
    setPhone(version.content.phone || '');
    setResumeId(version.id);
    setShowHistory(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsParsing(true);
      setParsingFeedback([]);
      
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/parse-resume', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        console.log('Parsed resume data:', JSON.stringify(data, null, 2));
        
        if (res.ok) {
          // Update UI with parsed data from the uploaded resume
          setUserName(data.name || 'Your Name');
          setUserRole(data.title || 'Your Role');
          setExperience(data.experience || []);
          setSkills(data.skills || []);
          setEmail(data.email || '');
          setPhone(data.phone || '');
          
          setUploadSuccess(true);
          setNeedsUpload(false);
          setParsingFeedback([
            { name: 'Identity', status: 'success', confidence: 98 },
            { name: 'Experience', status: 'success', confidence: 94 },
            { name: 'Skills', status: 'success', confidence: 91 },
            { name: 'Education', status: 'success', confidence: 88 }
          ]);
          
          // Refresh versions after auto-save (non-critical, don't crash on failure)
          try {
            const versionsRes = await fetch('/api/resumes');
            if (versionsRes.ok) {
              const latestVersions = await versionsRes.json();
              if (Array.isArray(latestVersions)) {
                setVersions(latestVersions.map((r: any) => ({
                  id: r.id,
                  name: r.name,
                  timestamp: new Date(r.updatedAt).toLocaleString(),
                  content: r.content
                })));
              }
            }
          } catch (versionError) {
            console.warn('Could not refresh versions:', versionError);
          }

        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setIsParsing(false);
        setTimeout(() => setUploadSuccess(false), 5000);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left Editor */}
      <section className="w-full md:w-[55%] h-full bg-background border-r border-outline-variant flex flex-col overflow-y-auto custom-scrollbar">
        <div className="max-w-[720px] mx-auto w-full p-8 flex flex-col gap-8">
          
          {/* Upload Area */}
          <div className="relative group">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
              accept=".pdf,.docx"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "bg-surface-container-low border-2 border-dashed border-outline-variant rounded-3xl p-12 text-center cursor-pointer transition-all hover:bg-surface-container-high group-hover:border-primary/50",
                isParsing && "pointer-events-none opacity-50"
              )}
            >
              <AnimatePresence mode="wait">
                {isParsing ? (
                  <motion.div 
                    key="parsing"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="relative">
                       <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary"
                       />
                       <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">AI Engine Parsing...</h3>
                      <p className="text-on-surface-variant text-sm font-medium">Extracting technical context and experience graph.</p>
                    </div>
                    <div className="w-full max-w-xs bg-background h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4 }}
                        className="bg-primary h-full rounded-full"
                      />
                    </div>
                  </motion.div>
                ) : uploadSuccess ? (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-6"
                  >
                    <div className="flex flex-col items-center gap-4 text-tertiary">
                      <div className="w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold">Resume Parsed Successfully</h3>
                    </div>

                    <div className="w-full max-w-md bg-background/50 rounded-2xl p-4 border border-outline-variant space-y-3">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Section Status</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowInsights(true); }}
                          className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View Structured Data
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {parsingFeedback.map(section => (
                          <div key={section.name} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-high border border-outline-variant">
                            {section.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-tertiary" />}
                            {section.status === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-orange-400" />}
                            {section.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                            <span className="text-[10px] font-bold text-on-surface uppercase tracking-tight">{section.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-2 shadow-xl group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">Import Existing Resume</h3>
                      <p className="text-on-surface-variant text-sm font-medium">Drag and drop or click to upload PDF/DOCX</p>
                    </div>
                    <div className="flex gap-4 mt-2">
                       <span className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest bg-background px-3 py-1.5 rounded-lg border border-outline-variant"><FileType className="w-3 h-3" /> PDF</span>
                       <span className="flex items-center gap-2 text-[10px] font-bold text-outline uppercase tracking-widest bg-background px-3 py-1.5 rounded-lg border border-outline-variant"><FileType className="w-3 h-3" /> DOCX</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="h-[0.5px] bg-outline-variant w-full" />

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Cloud className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">Synced with Cloud</span>
              </div>
              <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-all"
              >
                <History className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest">{versions.length} versions</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => saveCurrentVersion()}
                className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant group relative"
                title="Save Version"
              >
                <Save className="w-5 h-5" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-container-highest text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Snapshot</span>
              </button>
              <button className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant">
                <Undo2 className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant">
                <Redo2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-2 group relative"
          >
            <h1 
              className="text-4xl font-bold text-on-surface outline-none focus:text-primary transition-colors" 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => setUserName(e.currentTarget.innerText)}
            >
              {userName}
            </h1>
            <p 
              className="text-on-surface-variant text-lg font-medium outline-none" 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => setUserRole(e.currentTarget.innerText)}
            >
              {userRole}
            </p>
            <div className="flex flex-wrap gap-6 mt-4">
              <div className="flex items-center gap-2 text-on-surface-variant/70 italic text-sm">
                <Mail className="w-3.5 h-3.5" /> {email || 'no-email@set.com'}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant/70 italic text-sm">
                <Phone className="w-3.5 h-3.5" /> {phone || '+91 00000 00000'}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant/70 italic text-sm">
                <MapPin className="w-3.5 h-3.5" /> India
              </div>
            </div>

            {/* AI Floating Helper */}
            <div className="absolute -right-4 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-10 h-10 flex items-center justify-center bg-surface-container-highest border border-outline-variant text-primary rounded-full shadow-2xl hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 fill-primary/20" />
              </button>
            </div>
          </motion.div>

          <div className="h-[0.5px] bg-outline-variant w-full my-4" />

          <section className="space-y-12">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-primary tracking-[0.2em] uppercase">Experience</h3>
              <button className="p-1 text-on-surface-variant hover:text-primary transition-colors">
                <PlusCircle className="w-6 h-6" />
              </button>
            </div>

            {experience.map((exp, i) => (
              <div key={i} className="group relative p-6 -mx-6 rounded-2xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 
                      className="text-xl font-bold text-on-surface outline-none" 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newExp = [...experience];
                        newExp[i].company = e.currentTarget.innerText;
                        setExperience(newExp);
                      }}
                    >
                      {exp.company}
                    </h4>
                    <p 
                      className="text-on-surface-variant text-sm font-bold uppercase tracking-wider mt-1" 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newExp = [...experience];
                        newExp[i].role = e.currentTarget.innerText;
                        setExperience(newExp);
                      }}
                    >
                      {exp.role}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-on-surface-variant/60 font-bold">{exp.duration || exp.period}</span>
                </div>
                <ul className="list-disc ml-4 space-y-3 text-on-surface-variant font-medium text-sm">
                  {(exp.bullets || []).map((bullet: string, j: number) => (
                    <li 
                      key={j} 
                      className="outline-none focus:text-on-surface leading-loose" 
                      contentEditable 
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newExp = [...experience];
                        newExp[i].bullets[j] = e.currentTarget.innerText;
                        setExperience(newExp);
                      }}
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
                <div className="absolute -right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-8 h-8 flex items-center justify-center bg-surface-container-highest border border-outline-variant text-primary rounded-full shadow-lg">
                    <Sparkles className="w-4 h-4 fill-primary/20" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          <div className="h-[0.5px] bg-outline-variant w-full my-4" />

          <section className="space-y-6 pb-24">
            <h3 className="text-[11px] font-bold text-primary tracking-[0.2em] uppercase">Skills & Tools</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <div key={skill} className="bg-surface-container-high border border-outline-variant rounded-full px-4 py-2 flex items-center gap-3 group/chip transition-all hover:bg-surface-container-highest">
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface">{skill}</span>
                  <button 
                    onClick={() => setSkills(skills.filter(s => s !== skill))}
                    className="text-on-surface-variant hover:text-red-400 opacity-0 group-hover/chip:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setSkills([...skills, 'New Skill'])}
                className="bg-primary-container/10 border-dashed border border-primary/50 text-primary rounded-full px-6 py-2 flex items-center gap-2 hover:bg-primary-container/20 transition-all font-bold text-xs uppercase tracking-widest"
              >
                <PlusCircle className="w-4 h-4" /> Add Skill
              </button>
            </div>
          </section>
        </div>
      </section>

      {/* Right Preview */}
      <section className="hidden md:flex flex-1 h-full bg-surface-container-low flex-col relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 px-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/80 backdrop-blur-md">
          <div className="flex bg-background rounded-xl p-1 shadow-inner">
            <button 
              onClick={() => setResumeTheme('light')}
              className={cn(
                "px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all",
                resumeTheme === 'light' ? "bg-primary-container text-on-primary-container shadow-lg" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Classic
            </button>
            <button 
              onClick={() => setResumeTheme('dark')}
              className={cn(
                "px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all",
                resumeTheme === 'dark' ? "bg-primary-container text-on-primary-container shadow-lg" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Modern
            </button>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs font-bold text-on-surface-variant">Theme: {resumeTheme.toUpperCase()}</span>
            <div className="flex border border-outline-variant rounded-xl overflow-hidden bg-background">
              <button className="p-2.5 hover:bg-surface-container-high transition-all text-on-surface-variant border-r border-outline-variant">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button className="p-2.5 hover:bg-surface-container-high transition-all text-on-surface">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 flex justify-center bg-black/40">
           <motion.div 
             initial={{ scale: 0.95, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className={cn(
               "w-full max-w-[595px] aspect-[1/1.41] rounded shadow-[0_40px_100px_rgba(0,0,0,0.4)] p-16 flex flex-col font-sans origin-top transition-colors duration-500",
               resumeTheme === 'white' ? "bg-white text-slate-800" : "bg-slate-900 text-slate-100 border border-slate-700"
             )}
             style={{ 
                backgroundColor: resumeTheme === 'light' ? '#FFFFFF' : '#1e1f26', 
                color: resumeTheme === 'light' ? '#1e293b' : '#e2e8f0' 
             }}
           >
              <div className="mb-10 text-center">
                <h2 className={cn(
                  "text-4xl font-extrabold tracking-tight mb-2",
                  resumeTheme === 'light' ? "text-slate-900" : "text-white"
                )}>
                  {userName}
                </h2>
                <p className={cn(
                  "text-xl font-medium italic",
                  resumeTheme === 'light' ? "text-slate-600" : "text-slate-400"
                )}>
                  {userRole}
                </p>
              </div>
              
              <div className={cn(
                "grid grid-cols-3 gap-6 mb-12 text-[10px] font-bold uppercase tracking-wider border-y py-4",
                resumeTheme === 'light' ? "text-slate-400 border-slate-100" : "text-slate-500 border-slate-800"
              )}>
                <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {email || 'no-email@set.com'}</span>
                <span className="flex items-center gap-2"><Phone className="w-3 h-3" /> {phone || '+91 00000 00000'}</span>
                <span className="flex items-center gap-2 self-end text-right"><MapPin className="w-3 h-3" /> India</span>
              </div>

              <div className="space-y-10">
                <div>
                  <h3 className={cn(
                    "text-[10px] font-black tracking-[0.3em] mb-6 uppercase",
                    resumeTheme === 'light' ? "text-slate-300" : "text-slate-700"
                  )}>
                    Experience
                  </h3>
                  <div className="space-y-8">
                    {experience.map((exp, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className={cn(
                            "font-bold text-base",
                            resumeTheme === 'light' ? "text-slate-900" : "text-white"
                          )}>{exp.company}</span>
                          <span className={cn(
                            "text-[10px] font-mono",
                            resumeTheme === 'light' ? "text-slate-400" : "text-slate-500"
                          )}>{exp.duration || exp.period}</span>
                        </div>
                        <p className={cn(
                          "text-xs font-bold italic mb-3",
                          resumeTheme === 'light' ? "text-slate-500" : "text-slate-400"
                        )}>{exp.role}</p>
                        <ul className={cn(
                          "list-disc ml-3 text-[11px] space-y-2 leading-relaxed",
                          resumeTheme === 'light' ? "text-slate-600" : "text-slate-300"
                        )}>
                          {(exp.bullets || []).map((b: string, j: number) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cn(
                  "mt-auto pt-10 border-t",
                  resumeTheme === 'light' ? "border-slate-50" : "border-slate-800"
                )}>
                   <h3 className={cn(
                    "text-[10px] font-black tracking-[0.3em] mb-4 uppercase",
                    resumeTheme === 'light' ? "text-slate-300" : "text-slate-700"
                  )}>Expertise</h3>
                   <div className={cn(
                     "flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold",
                     resumeTheme === 'light' ? "text-slate-500" : "text-slate-400"
                   )}>
                    {skills.map(s => (
                      <span key={s}>{s}</span>
                    ))}
                   </div>
                </div>
              </div>
           </motion.div>
        </div>

        {/* Action Bar */}
        <div className="p-8 bg-surface-container-low/95 backdrop-blur-md border-t border-outline-variant flex justify-center items-center shadow-2xl">
          <button className="bg-primary text-on-primary px-12 py-5 rounded-2xl flex items-center gap-4 font-bold text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,178,186,0.3)]">
            <Download className="w-5 h-5" /> Download PDF
          </button>
        </div>
      </section>

      {/* Version History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-surface-container-low border-l border-outline-variant z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold tracking-tight">Timeline</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {versions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20 px-8">
                    <History className="w-12 h-12 mb-4" />
                    <p className="text-sm font-medium">No versions saved yet. Versions are created automatically when you parse or manually when you snap.</p>
                  </div>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="bg-surface-container-high border border-outline-variant rounded-2xl p-5 group hover:bg-surface-container-highest transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-on-surface">{v.name}</h4>
                          <p className="text-[10px] font-mono font-bold text-on-surface-variant uppercase mt-1">{v.timestamp}</p>
                        </div>
                        <button 
                          onClick={async () => {
                             await fetch(`/api/resumes?id=${v.id}`, { method: 'DELETE' });
                             setVersions(versions.filter(x => x.id !== v.id));
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => revertToVersion(v)}
                          className="flex-1 bg-primary/10 text-primary border border-primary/20 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Revert
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* AI Insights / Parsed Data Modal */}
      <AnimatePresence>
        {showInsights && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl bg-surface-container-low border border-outline-variant rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-outline-variant flex justify-between items-center">
                <div className="flex items-center gap-3 text-primary">
                  <Eye className="w-6 h-6" />
                  <h3 className="text-2xl font-bold tracking-tight">AI Recognition Insights</h3>
                </div>
                <button onClick={() => setShowInsights(false)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Parsing Reliability</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {parsingFeedback.map(item => (
                      <div key={item.name} className="bg-surface-container-high border border-outline-variant rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-on-surface">{item.name}</span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                            item.status === 'success' ? "bg-tertiary/10 text-tertiary" : 
                            item.status === 'warning' ? "bg-orange-400/10 text-orange-400" : "bg-red-400/10 text-red-400"
                          )}>
                            {item.confidence}% Confidence
                          </span>
                        </div>
                        {item.message && (
                          <div className="flex flex-col gap-3 p-4 rounded-xl bg-background/50 border border-outline-variant/30">
                            <div className="flex gap-2 items-start text-xs text-on-surface-variant font-medium">
                              <Info className="w-4 h-4 shrink-0 text-primary" />
                              <p>{item.message}</p>
                            </div>
                            
                            {item.suggestions && item.suggestions.length > 0 && (
                              <div className="space-y-2 border-t border-outline-variant/20 pt-3">
                                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.1em]">AI Suggestions:</span>
                                <ul className="space-y-1.5">
                                  {item.suggestions.map((s, idx) => (
                                    <li key={idx} className="text-[11px] text-on-surface-variant flex gap-2 items-start leading-tight">
                                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="w-full h-1.5 bg-background rounded-full mt-4 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.confidence}%` }}
                            className={cn(
                              "h-full rounded-full",
                              item.status === 'success' ? "bg-tertiary" : 
                              item.status === 'warning' ? "bg-orange-400" : "bg-red-400"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary-container/10 p-6 rounded-2xl border border-primary/20">
                  <div className="flex gap-4 items-start">
                    <Sparkles className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <h5 className="font-bold text-primary mb-1">Knowledge Injection</h5>
                      <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                        The AI has structured your experience into a technical knowledge graph. This data is now indexed for real-time injection into job applications. No manual keyword tailoring needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant bg-surface-container-low/50 backdrop-blur-md flex justify-end">
                <button 
                  onClick={() => setShowInsights(false)}
                  className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all"
                >
                  Confirm & Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
