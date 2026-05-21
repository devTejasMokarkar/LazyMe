"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Undo2, Redo2, Mail, Phone, MapPin, Sparkles, PlusCircle, X,
  Download, ZoomIn, ZoomOut, Upload, FileType, CheckCircle2, History,
  RotateCcw, Save, Trash2, Eye, Loader2, PanelLeftClose, PanelRightClose,
  Monitor, Smartphone, Briefcase, Palette
} from 'lucide-react';
import Link from 'next/link';
import { cn, validateParsedResume, calculateResumeCompleteness } from '@/lib/utils';
import { useToast } from './ToastProvider';
import DownloadDropdown from './DownloadDropdown';
import { resumeToLatex } from '@/utils/latexFormatter';

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
    location?: string;
    summary?: string;
    education?: any[];
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
  const [resumeColor, setResumeColor] = useState('#000000');
  const [zoom, setZoom] = useState(85);
  
  const ACCENT_COLORS = ['#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

  const { showToast } = useToast();
  const lastSavedContent = useRef<string>('');
  const isUndoRedoActionRef = useRef<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (initialPrompt !== undefined) setNeedsUpload(true);
  }, [initialPrompt]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Clear all cached resume data
    localStorage.removeItem('lazyme_pending_resume');
    sessionStorage.removeItem('pendingResume');
    sessionStorage.removeItem('lazyme_pending_resume');
    pendingResumeApplied.current = false;
    
    // Reset state
    setResumeId(null);
    setUserName('');
    setUserRole('');
    setExperience([]);
    setSkills([]);
    setEmail('');
    setPhone('');
    setLocation('');
    setSummary('');
    setEducation([]);
    setVersions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setParsingFeedback([]);
    setParseError(null);
    setUploadSuccess(false);
    lastSavedContent.current = '';
    
    // Fetch fresh data from database
    try {
      const res = await fetch('/api/resumes?_t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          loadResume(primary);
          setVersions(data.map((r: any) => ({
            id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
          })));
        } else {
          // No resumes in DB, show upload prompt
          setNeedsUpload(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
      showToast("Failed to refresh resume", "error");
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && needsUpload && fileInputRef.current) {
      setTimeout(() => fileInputRef.current?.click(), 300);
    }
  }, [loading, needsUpload]);

  useEffect(() => {
    let cancelled = false;

    async function initResume() {
      // Step 1: Check localStorage/sessionStorage for pending resume data
      const pending = localStorage.getItem('lazyme_pending_resume') || sessionStorage.getItem('pendingResume');
      
      if (pending) {
        // IMMEDIATELY clear storage so no other mount/call can re-read stale data
        sessionStorage.removeItem('pendingResume');
        localStorage.removeItem('lazyme_pending_resume');
        
        // Mark that this component instance consumed pending data
        pendingResumeApplied.current = true;

        try {
          const parsed = JSON.parse(pending);
          
          // Apply parsed data to state
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
          
          lastSavedContent.current = JSON.stringify({
            name: parsed.name || 'Your Name',
            title: parsed.title || 'Your Role',
            experience: parsed.experience || [],
            skills: normalizeSkills(parsed.skills),
            email: parsed.email || '',
            phone: parsed.phone || '',
            location: parsed.location || '',
            summary: parsed.summary || '',
            education: parsed.education || []
          });

          const baseline = {
            userName: parsed.name || 'Your Name',
            userRole: parsed.title || 'Your Role',
            experience: parsed.experience || [],
            skills: normalizeSkills(parsed.skills),
            email: parsed.email || '',
            phone: parsed.phone || '',
            location: parsed.location || '',
            summary: parsed.summary || '',
            education: parsed.education || []
          };
          setHistory([baseline]);
          setHistoryIndex(0);
          isUndoRedoActionRef.current = true;

          setTimeout(() => setUploadSuccess(false), 5000);

          // Save to database
          if (parsed.id) {
            setResumeId(parsed.id);
            try {
              const res = await fetch('/api/resumes?_t=' + Date.now());
              if (!cancelled && res.ok) {
                const data = await res.json();
                setVersions(data.map((r: any) => ({
                  id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
                })));
              }
            } catch (error) {
              console.error("Failed to fetch versions:", error);
            }
          } else {
            try {
              const saveRes = await fetch('/api/resumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: `Resume ${new Date().toLocaleDateString()}`,
                  content: { 
                    name: parsed.name, 
                    title: parsed.title, 
                    experience: parsed.experience, 
                    skills: parsed.skills, 
                    email: parsed.email, 
                    phone: parsed.phone, 
                    location: parsed.location, 
                    summary: parsed.summary, 
                    education: parsed.education 
                  },
                  isDefault: true
                })
              });
              if (!cancelled && saveRes.ok) {
                const newResume = await saveRes.json();
                setResumeId(newResume.id);
                setVersions(prev => [{
                  id: newResume.id,
                  timestamp: new Date().toLocaleString(),
                  name: newResume.name,
                  content: newResume.content
                }, ...prev]);
              }
            } catch (dbErr) {
              console.error("Failed to auto-save pending resume to DB:", dbErr);
            }
          }

          return; // Done — do NOT fall through to DB fetch
        } catch (err) {
          console.error("Failed to parse pending resume:", err);
        }
      }

      // Step 2: If pending data was already consumed by a previous mount (Strict Mode),
      // do NOT overwrite the state with stale DB data
      if (pendingResumeApplied.current) {
        setLoading(false);
        return;
      }

      // Step 3: No pending resume at all — fetch from DB
      try {
        const res = await fetch('/api/resumes?_t=' + Date.now());
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          if (initialPrompt === undefined) {
            loadResume(primary);
          }
          setVersions(data.map((r: any) => ({
            id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
          })));
        }
      } catch (error) {
        console.error("Failed to fetch resumes:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initResume();

    const handler = (e?: Event) => {
      if (!e || e.type === 'pendingResumeReady' || (e as StorageEvent).key === 'lazyme_pending_resume') {
        // Reset the flag so the new pending data can be consumed
        pendingResumeApplied.current = false;
        initResume();
      }
    };
    window.addEventListener('pendingResumeReady', handler);
    window.addEventListener('storage', handler as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('pendingResumeReady', handler);
      window.removeEventListener('storage', handler as EventListener);
    };
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

    lastSavedContent.current = JSON.stringify({
      name: c.name || 'Your Name',
      title: c.title || 'Your Role',
      experience: c.experience || [],
      skills: normalizeSkills(c.skills),
      email: c.email || '',
      phone: c.phone || '',
      location: c.location || '',
      summary: c.summary || '',
      education: c.education || []
    });

    const baseline = {
      userName: c.name || 'Your Name',
      userRole: c.title || 'Your Role',
      experience: c.experience || [],
      skills: normalizeSkills(c.skills),
      email: c.email || '',
      phone: c.phone || '',
      location: c.location || '',
      summary: c.summary || '',
      education: c.education || []
    };
    setHistory([baseline]);
    setHistoryIndex(0);
    isUndoRedoActionRef.current = true;
  };

  const saveCurrentVersion = async (name?: string) => {
    const content = { name: userName, title: userRole, experience, skills, email, phone, location, summary, education };
    const currentSerialized = JSON.stringify(content);

    if (currentSerialized === lastSavedContent.current) {
      showToast("already saved no changes detected", "info");
      return;
    }

    try {
      if (resumeId) {
        // Update existing resume
        const res = await fetch('/api/resumes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: resumeId, content, name })
        });
        if (res.ok) {
          lastSavedContent.current = currentSerialized;
          showToast("saved successfully", "success");
          
          // Update versions list
          setVersions(prev => prev.map(v => v.id === resumeId ? {
            ...v,
            name: name || v.name,
            timestamp: new Date().toLocaleString(),
            content
          } : v));
        } else {
          showToast("Failed to save resume", "error");
        }
      } else {
        // Create new default resume
        const res = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || `Resume ${new Date().toLocaleDateString()}`,
            content,
            isDefault: true
          })
        });
        if (res.ok) {
          const newResume = await res.json();
          setResumeId(newResume.id);
          lastSavedContent.current = currentSerialized;
          showToast("saved successfully", "success");
          setVersions(prev => [{
            id: newResume.id,
            timestamp: new Date().toLocaleString(),
            name: newResume.name,
            content: newResume.content
          }, ...prev]);
        } else {
          showToast("Failed to save resume", "error");
        }
      }
    } catch (error) {
      console.error("Save failed:", error);
      showToast("Failed to save resume", "error");
    }
  };

  const revertToVersion = async (version: ResumeVersion) => {
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

    lastSavedContent.current = JSON.stringify({
      name: version.content.name,
      title: version.content.title,
      experience: version.content.experience,
      skills: normalizeSkills(version.content.skills),
      email: version.content.email || '',
      phone: version.content.phone || '',
      location: version.content.location || '',
      summary: version.content.summary || '',
      education: version.content.education || []
    });

    const baseline = {
      userName: version.content.name,
      userRole: version.content.title,
      experience: version.content.experience,
      skills: normalizeSkills(version.content.skills),
      email: version.content.email || '',
      phone: version.content.phone || '',
      location: version.content.location || '',
      summary: version.content.summary || '',
      education: version.content.education || []
    };
    setHistory([baseline]);
    setHistoryIndex(0);
    isUndoRedoActionRef.current = true;

    try {
      await fetch('/api/resumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: version.id, isDefault: true })
      });
    } catch (err) {
      console.error("Failed to mark version as default:", err);
    }
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

        // Check completeness - must be at least 70%
        const completeness = calculateResumeCompleteness(data);
        if (completeness < 70) {
          setParseError(
            `Failed to parse PDF completely. Only ${completeness}% of details were extracted. ` +
            `The file may be image-based or corrupted. Please try a different format (DOCX or text-based PDF).`
          );
          setParsingFeedback([
            { name: 'Identity', status: data.name ? 'success' : 'error', confidence: data.name ? 90 : 0 },
            { name: 'Experience', status: data.experience?.length > 0 ? 'success' : 'error', confidence: data.experience?.length > 0 ? 80 : 0 },
            { name: 'Skills', status: data.skills?.length > 0 ? 'success' : 'error', confidence: data.skills?.length > 0 ? 75 : 0 },
            { name: 'Education', status: data.education?.length > 0 ? 'success' : 'warning', confidence: data.education?.length > 0 ? 85 : 30 }
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

        if (saveRes.ok) {
          const newResume = await saveRes.json();
          setResumeId(newResume.id);
        }

        lastSavedContent.current = JSON.stringify({
          name: data.name,
          title: data.title,
          experience: data.experience || [],
          skills: normalizeSkills(data.skills),
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          summary: data.summary || '',
          education: data.education || []
        });

        const baseline = {
          userName: data.name,
          userRole: data.title,
          experience: data.experience || [],
          skills: normalizeSkills(data.skills),
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          summary: data.summary || '',
          education: data.education || []
        };
        setHistory([baseline]);
        setHistoryIndex(0);
        isUndoRedoActionRef.current = true;

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

  useEffect(() => {
    if (loading) return;

    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }

    const stateToSave = {
      userName,
      userRole,
      experience: JSON.parse(JSON.stringify(experience)),
      skills: [...skills],
      email,
      phone,
      location,
      summary,
      education: JSON.parse(JSON.stringify(education))
    };

    if (history.length === 0) {
      setHistory([stateToSave]);
      setHistoryIndex(0);
      return;
    }

    const currentHistoryItem = history[historyIndex];
    if (currentHistoryItem) {
      const isChanged = JSON.stringify(currentHistoryItem) !== JSON.stringify(stateToSave);
      if (isChanged) {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, stateToSave]);
        setHistoryIndex(newHistory.length);
      }
    }
  }, [userName, userRole, experience, skills, email, phone, location, summary, education, loading]);

  // Debounced auto-save to the database
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(async () => {
      const content = {
        name: userName,
        title: userRole,
        experience,
        skills,
        email,
        phone,
        location,
        summary,
        education
      };
      
      const currentSerialized = JSON.stringify(content);
      if (currentSerialized === lastSavedContent.current) return;

      try {
        if (resumeId) {
          // Update existing resume
          const res = await fetch('/api/resumes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: resumeId, content })
          });
          if (res.ok) {
            lastSavedContent.current = currentSerialized;
          }
        } else {
          // Create new default resume
          const res = await fetch('/api/resumes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Resume ${new Date().toLocaleDateString()}`,
              content,
              isDefault: true
            })
          });
          if (res.ok) {
            const newResume = await res.json();
            setResumeId(newResume.id);
            lastSavedContent.current = currentSerialized;
            setVersions(prev => [{
              id: newResume.id,
              timestamp: new Date().toLocaleString(),
              name: newResume.name,
              content: newResume.content
            }, ...prev]);
          }
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [userName, userRole, experience, skills, email, phone, location, summary, education, resumeId, loading]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoActionRef.current = true;
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      
      setUserName(prevState.userName);
      setUserRole(prevState.userRole);
      setExperience(JSON.parse(JSON.stringify(prevState.experience)));
      setSkills([...prevState.skills]);
      setEmail(prevState.email);
      setPhone(prevState.phone);
      setLocation(prevState.location);
      setSummary(prevState.summary);
      setEducation(JSON.parse(JSON.stringify(prevState.education)));
      
      setHistoryIndex(prevIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoActionRef.current = true;
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      
      setUserName(nextState.userName);
      setUserRole(nextState.userRole);
      setExperience(JSON.parse(JSON.stringify(nextState.experience)));
      setSkills([...nextState.skills]);
      setEmail(nextState.email);
      setPhone(nextState.phone);
      setLocation(nextState.location);
      setSummary(nextState.summary);
      setEducation(JSON.parse(JSON.stringify(nextState.education)));
      
      setHistoryIndex(nextIndex);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex h-full w-full overflow-hidden bg-background p-6 gap-6 animate-pulse">
        {/* Sidebar Skeleton */}
        <div className="flex-1 max-w-3xl space-y-6">
          <div className="h-10 bg-white/5 rounded-xl border border-white/10 w-1/3" />
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="h-8 bg-white/5 rounded-lg w-1/2" />
            <div className="h-4 bg-white/5 rounded-lg w-1/4" />
            <div className="flex gap-4 mt-3">
              <div className="h-4 bg-white/5 rounded-md w-16" />
              <div className="h-4 bg-white/5 rounded-md w-16" />
              <div className="h-4 bg-white/5 rounded-md w-16" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-white/5 rounded-lg w-1/4" />
            <div className="glass rounded-xl p-4 h-24" />
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-white/5 rounded-lg w-1/4" />
            <div className="glass rounded-xl p-4 h-32" />
          </div>
        </div>
        {/* Preview Skeleton */}
        <div className="hidden lg:block w-[600px] bg-background border-l border-white/5 p-6 space-y-6">
          <div className="h-8 bg-white/5 rounded-lg w-1/2 mx-auto" />
          <div className="h-4 bg-white/5 rounded-lg w-1/3 mx-auto" />
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="h-6 bg-white/5 rounded-lg w-1/4" />
            <div className="h-4 bg-white/5 rounded-lg w-full" />
            <div className="h-4 bg-white/5 rounded-lg w-5/6" />
          </div>
          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="h-6 bg-white/5 rounded-lg w-1/4" />
            <div className="h-16 bg-white/5 rounded-lg w-full" />
          </div>
        </div>
      </div>
    );
  }

  const resumeData = {
    name: userName,
    title: userRole,
    experience,
    skills,
    email,
    phone,
    location,
    summary,
    education
  };
  const latex = resumeToLatex(resumeData);

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
              <button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  isRefreshing ? "text-on-surface-variant/30 cursor-not-allowed" : "hover:bg-surface-container text-on-surface-variant hover:text-primary"
                )} 
                title="Refresh Resume"
              >
                <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
              <button onClick={() => saveCurrentVersion()} className="p-2 hover:bg-surface-container rounded-md text-on-surface-variant hover:text-primary transition-colors" title="Save">
                <Save className="w-4 h-4" />
              </button>
               <button 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  historyIndex > 0 ? "hover:bg-surface-container text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                )}
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  historyIndex < history.length - 1 ? "hover:bg-surface-container text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                )}
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-outline-variant/30 mx-1" />
              <Link 
                href={parseError ? "#" : "/apply"} 
                className={cn(
                  "btn-primary py-1.5 text-sm font-medium",
                  parseError && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
                onClick={(e) => parseError && e.preventDefault()}
              >
                <Briefcase className="w-4 h-4" />
                Apply Now
              </Link>
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
                  "glass rounded-xl p-6 text-center cursor-pointer transition-all hover:border-primary hover:shadow-[0_0_15px_rgba(112,145,230,0.3)]",
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

            {/* Parse Error Alert */}
            {parseError && (
              <div className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-400">Failed to Parse Resume</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{parseError}</p>
                    <button 
                      onClick={() => { setParseError(null); setNeedsUpload(true); }}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Try uploading a different file
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Name & Role Card */}
            <div className="glass rounded-xl p-5 group relative">
              <h1 className="text-2xl font-bold text-on-surface outline-none focus:text-primary transition-colors" contentEditable suppressContentEditableWarning onBlur={(e) => setUserName(e.currentTarget.innerText)}>{userName || 'Your Name'}</h1>
              <p className="text-on-surface-variant text-sm font-medium mt-1 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setUserRole(e.currentTarget.innerText)}>{userRole || 'Your Title'}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-on-surface-variant/70">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /><span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setEmail(e.currentTarget.innerText)}>{email || 'email'}</span></span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /><span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setPhone(e.currentTarget.innerText)}>{phone || 'phone'}</span></span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setLocation(e.currentTarget.innerText)}>{location || 'location'}</span></span>
              </div>
              <button className="absolute -right-2 top-4 w-8 h-8 flex items-center justify-center bg-primary/10 border border-primary/20 text-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><Sparkles className="w-4 h-4" /></button>
            </div>

            {/* Summary Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Summary</h3>
              </div>
              <div className="glass rounded-xl p-4 group">
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
                <div className="glass rounded-xl p-4 text-center text-on-surface-variant text-sm">
                  No education added yet
                </div>
              ) : (
                education.map((edu, i) => (
                  <div key={i} className="glass rounded-xl p-4 group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-base font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...education]; n[i].school = e.currentTarget.innerText; setEducation(n); }}>{edu.school}</h4>
                        <p className="text-xs font-semibold text-on-surface-variant mt-0.5 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...education]; n[i].degree = e.currentTarget.innerText; setEducation(n); }}>{edu.degree}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-on-surface-variant/60 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...education]; n[i].year = e.currentTarget.innerText; setEducation(n); }}>{edu.year}</span>
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
                <div key={i} className="glass rounded-xl p-4 group hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-base font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].company = e.currentTarget.innerText; setExperience(n); }}>{exp.company}</h4>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase mt-0.5 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].role = e.currentTarget.innerText; setExperience(n); }}>{exp.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-on-surface-variant/60 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { const n = [...experience]; n[i].duration = e.currentTarget.innerText; setExperience(n); }}>{exp.duration || exp.period}</span>
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
                {skills.map((skill, i) => (
                  <div key={i} className="glass rounded-full px-3 py-1.5 flex items-center gap-2 group transition-all hover:bg-white/5">
                    <span 
                      className="text-xs font-semibold text-on-surface outline-none min-w-[40px] cursor-text"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newSkills = [...skills];
                        const val = e.currentTarget.innerText.trim();
                        if (val) {
                          newSkills[i] = val;
                          setSkills(newSkills);
                        } else {
                          setSkills(skills.filter((_, idx) => idx !== i));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                    >
                      {skill}
                    </span>
                    <button 
                      onClick={() => setSkills(skills.filter((_, idx) => idx !== i))} 
                      className="text-on-surface-variant hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => setSkills([...skills, 'New Skill'])} 
                  className="bg-primary/10 border border-primary/30 text-primary rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-primary/15 transition-all"
                >
                  + Add
                </button>
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
            className="hidden lg:flex flex-col h-full bg-background border-l border-white/5 overflow-hidden"
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
                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-1 rounded-lg border border-white/10">
                  {['#000000', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setResumeColor(color)}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border transition-all hover:scale-110",
                        resumeColor === color ? "border-white scale-110 shadow-sm" : "border-transparent"
                      )}
                      style={{ backgroundColor: color === '#000000' && resumeTheme === 'dark' ? '#ffffff' : color }}
                      title={`Accent Color ${color}`}
                    />
                  ))}
                </div>
                <button onClick={() => setResumeTheme(resumeTheme === 'light' ? 'dark' : 'light')} className="text-[10px] font-semibold text-white/40 uppercase hover:text-white/60">{resumeTheme}</button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center bg-background">
              <motion.div
                id="resume-preview"
                className={cn(
                  "rounded-lg shadow-2xl p-8 flex flex-col font-sans transition-all",
                  previewMode === 'mobile' ? "w-[320px]" : "w-[800px]"
                )}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  minHeight: '900px',
                  backgroundColor: resumeTheme === 'light' ? '#ffffff' : '#1a1b1f',
                  color: resumeTheme === 'light' ? '#000000' : '#e2e8f0'
                }}
              >
                {/* Resume Content */}
                <div className="text-center mb-6">
                  <h2 className={cn("text-2xl font-extrabold", resumeTheme === 'light' && resumeColor === '#000000' ? "text-black" : resumeTheme === 'dark' && resumeColor === '#000000' ? 'text-white' : '')} style={resumeColor !== '#000000' ? { color: resumeColor } : {}}>{userName || 'Your Name'}</h2>
                  <p className={cn("text-sm", resumeTheme === 'light' ? "text-slate-800" : "text-slate-400")}>{userRole || 'Your Title'}</p>
                </div>
                <div className={cn("flex justify-center gap-4 text-[9px] uppercase tracking-wider mb-5 pb-3 border-b", resumeTheme === 'light' ? "text-slate-700 border-slate-300" : "text-slate-500 border-slate-800")}>
                  {email && <span>{email}</span>}
                  {phone && <span>{phone}</span>}
                  <span>{location || 'Location'}</span>
                </div>
                <div className="space-y-5 flex-1">
                  {summary && (
                    <div>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-2", resumeTheme === 'light' && resumeColor === '#000000' ? "text-black" : resumeTheme === 'dark' && resumeColor === '#000000' ? 'text-white' : '')} style={resumeColor !== '#000000' ? { color: resumeColor } : {}}>Summary</h3>
                      <p className={cn("text-xs leading-relaxed", resumeTheme === 'light' ? "text-slate-800" : "text-slate-400")}>{summary}</p>
                    </div>
                  )}
                  {skills.length > 0 && (
                    <div className={cn("pt-2", summary ? "border-t" : "")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-2", resumeTheme === 'light' && resumeColor === '#000000' ? "text-black" : resumeTheme === 'dark' && resumeColor === '#000000' ? 'text-white' : '')} style={resumeColor !== '#000000' ? { color: resumeColor } : {}}>Skills</h3>
                      <div className={cn("text-xs flex flex-wrap gap-x-3 gap-y-1", resumeTheme === 'light' ? "text-slate-800" : "text-slate-400")}>{skills.join(', ')}</div>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div className={cn("pt-4 border-t", resumeTheme === 'light' ? "border-slate-300" : "border-slate-800")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-3", resumeTheme === 'light' && resumeColor === '#000000' ? "text-black" : resumeTheme === 'dark' && resumeColor === '#000000' ? 'text-white' : '')} style={resumeColor !== '#000000' ? { color: resumeColor } : {}}>Experience</h3>
                      <div className="space-y-4">
                        {experience.map((exp, i) => (
                          <div key={i}>
                            <div className="flex justify-between"><span className={cn("font-bold text-xs", resumeTheme === 'light' ? "text-black" : "text-white")}>{exp.company}</span><span className={cn("text-[9px]", resumeTheme === 'light' ? "text-slate-600" : "text-slate-500")}>{exp.duration || exp.period}</span></div>
                            <p className={cn("text-xs mt-0.5", resumeTheme === 'light' ? "text-slate-800" : "text-slate-400")}>{exp.role}</p>
                            {(exp.bullets && exp.bullets.length > 0) && (
                              <ul className={cn("text-[10px] mt-1 space-y-0.5", resumeTheme === 'light' ? "text-slate-700" : "text-slate-500")}>
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
                    <div className={cn("pt-4 border-t", resumeTheme === 'light' ? "border-slate-300" : "border-slate-800")}>
                      <h3 className={cn("text-[9px] font-black tracking-[0.2em] uppercase mb-3", resumeTheme === 'light' && resumeColor === '#000000' ? "text-black" : resumeTheme === 'dark' && resumeColor === '#000000' ? 'text-white' : '')} style={resumeColor !== '#000000' ? { color: resumeColor } : {}}>Education</h3>
                      <div className="space-y-2">
                        {education.map((edu, i) => (
                          <div key={i}>
                            <div className="flex justify-between"><span className={cn("font-bold text-xs", resumeTheme === 'light' ? "text-black" : "text-white")}>{edu.school}</span><span className={cn("text-[9px]", resumeTheme === 'light' ? "text-slate-600" : "text-slate-500")}>{edu.year}</span></div>
                            <p className={cn("text-xs mt-0.5", resumeTheme === 'light' ? "text-slate-800" : "text-slate-400")}>{edu.degree}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Download Action */}
            <div className="p-4 border-t border-white/5 glass-dark flex justify-center">
              <DownloadDropdown resumeData={resumeData} latex={latex} resumePreviewId="resume-preview" />
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
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-80 glass-dark z-50 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
                <div className="flex items-center gap-2"><History className="w-5 h-5 text-primary" /><h2 className="text-base font-bold">Timeline</h2></div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-surface-container-highest rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {versions.length === 0 ? <div className="text-center text-on-surface-variant text-sm py-10 opacity-50">No versions</div> : versions.map(v => (
                  <div key={v.id} className="glass rounded-lg p-3 group">
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