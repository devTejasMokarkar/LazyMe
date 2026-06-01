"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Undo2, Redo2, Mail, Phone, MapPin, Sparkles, PlusCircle, X,
  Download, ZoomIn, ZoomOut, Upload, FileType, CheckCircle2, History,
  RotateCcw, Save, Trash2, Eye, Loader2, PanelLeftClose, PanelRightClose,
  Monitor, Smartphone, Briefcase, Palette, Code, Send,
  FileText, AlertCircle, Target, ChevronDown, Edit3, MessageSquare, Bot, User
} from 'lucide-react';
import { ATSScoreCard } from '@/components/jobs/ATSScoreCard';
import Link from 'next/link';
import { cn, validateParsedResume, calculateResumeCompleteness } from '@/lib/utils';
import { useToast } from '@/components/layout/ToastProvider';
import DownloadDropdown from '@/components/resume/DownloadDropdown';
import { LineByLineImprovements } from '@/components/resume/LineByLineImprovements';
import { ClassicTemplate } from '@/components/resume/templates/ClassicTemplate';
import { ModernTemplate } from '@/components/resume/templates/ModernTemplate';
import { MinimalistTemplate } from '@/components/resume/templates/MinimalistTemplate';
import type { TemplateType, ResumeData as TemplateResumeData } from '@/components/resume/templates/index';
import { resumeToLatex } from '@/features/ai/latex.service';

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
  const [chatInput, setChatInput] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingResumeApplied = useRef(false);
  const promptProcessedRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimize' | 'manual-edit'>('optimize');

  // ATS Analysis state
  const [showATS, setShowATS] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<any>(null);
  const [isAnalyzingATS, setIsAnalyzingATS] = useState(false);
  const [isImprovingATS, setIsImprovingATS] = useState(false);
  const [previousATSScore, setPreviousATSScore] = useState<number | null>(null);
  const [atsChanges, setAtsChanges] = useState<string[]>([]);
  const [atsScoreResult, setAtsScoreResult] = useState<any>(null);
  const [applyingImprovementIndex, setApplyingImprovementIndex] = useState<number | null>(null);
  const [applyingKeyword, setApplyingKeyword] = useState<string | null>(null);
  const [loadingImprovementCount, setLoadingImprovementCount] = useState(0);

  // Template state
  const [template, setTemplate] = useState<TemplateType>('modern');

  // Line-by-line improvements
  const [atsImprovements, setAtsImprovements] = useState<Array<{ section: string; before: string; after: string; impact?: number }>>([]);
  const [appliedImprovementIndices, setAppliedImprovementIndices] = useState<Set<number>>(new Set());
  const [isApplyingImprovement, setIsApplyingImprovement] = useState(false);

  // AI Chat tab - conversation
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: "Hi! I can help optimize your resume. Ask me to improve specific sections, add keywords, or rewrite bullet points." }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const enhanceAndAppend = async (promptText: string, resumeContent: any) => {
    showToast("AI is optimizing and appending your new project/experience...", "info");
    try {
      const res = await fetch('/api/enhance-resume-append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, resume: resumeContent })
      });
      const resData = await res.json();
      if (res.ok && resData.enhanced) {
        const entry = resData.enhanced;
        setExperience(prev => [
          ...prev,
          {
            company: entry.company || 'Current Company',
            role: entry.role || 'New Project',
            duration: entry.duration || 'Current',
            bullets: Array.isArray(entry.bullets) && entry.bullets.length ? entry.bullets : []
          }
        ]);
        showToast("AI successfully optimized and added the project to your experience list!", "success");
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else {
        showToast(resData.message || "Failed to enhance project entry.", "error");
      }
    } catch (err) {
      console.error("Failed to enhance resume:", err);
      showToast("Failed to enhance project entry.", "error");
    }
  };

  useEffect(() => {
    if (initialPrompt !== undefined && !loading && versions.length === 0) {
      setNeedsUpload(true);
    }
  }, [initialPrompt, loading, versions]);

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

          // Read pending JD and auto-analyze
          const pendingJd = localStorage.getItem('lazyme_pending_jd');
          if (pendingJd) {
            localStorage.removeItem('lazyme_pending_jd');
            setJobDescription(pendingJd);
          }
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

      // Step 3: If initialPrompt is provided (create mode), generate a fresh resume
      if (initialPrompt && !promptProcessedRef.current) {
        promptProcessedRef.current = true;
        try {
          const [res, savedResume] = await (async () => {
            const genRes = await fetch('/api/create-resume-from-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: initialPrompt })
            });
            if (!genRes.ok) return [null, null];
            const genData = await genRes.json();
            if (!genData.resume) return [null, null];
            const r = genData.resume;
            try {
              const saveRes = await fetch('/api/resumes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: `Resume ${new Date().toLocaleDateString()}`,
                  content: {
                    name: r.name || '', title: r.title || '',
                    experience: r.experience || [], skills: r.skills || [],
                    email: r.email || '', phone: r.phone || '',
                    location: r.location || '', summary: r.summary || '',
                    education: r.education || []
                  },
                  isDefault: true
                })
              });
              if (saveRes.ok) {
                const saved = await saveRes.json();
                return [r, saved];
              }
            } catch (dbErr) {
              console.error("Failed to auto-save created resume:", dbErr);
            }
            return [r, null];
          })();

          if (res) {
            setUserName(res.name || '');
            setUserRole(res.title || '');
            setExperience(res.experience || []);
            setSkills(normalizeSkills(res.skills));
            setEmail(res.email || '');
            setPhone(res.phone || '');
            setLocation(res.location || '');
            setSummary(res.summary || '');
            setEducation(res.education || []);
            if (savedResume) {
              setResumeId(savedResume.id);
              setVersions([{
                id: savedResume.id, name: savedResume.name,
                timestamp: new Date().toLocaleString(), content: res
              }]);
            }
            const baseline = {
              userName: res.name || '', userRole: res.title || '',
              experience: res.experience || [], skills: normalizeSkills(res.skills),
              email: res.email || '', phone: res.phone || '',
              location: res.location || '', summary: res.summary || '',
              education: res.education || []
            };
            setHistory([baseline]);
            setHistoryIndex(0);
            lastSavedContent.current = JSON.stringify(baseline);
            setLoading(false);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            return;
          }
        } catch (err) {
          console.error("Failed to create resume from prompt:", err);
        }
      }

      // Step 4: No pending resume at all — fetch from DB
      try {
        const res = await fetch('/api/resumes?_t=' + Date.now());
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const primary = data.find((r: any) => r.isDefault) || data[0];
          loadResume(primary);
          setVersions(data.map((r: any) => ({
            id: r.id, name: r.name, timestamp: new Date(r.updatedAt).toLocaleString(), content: r.content
          })));
        } else {
          setNeedsUpload(true);
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
        if (completeness < 50) {
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
          <div className="h-10 bg-surface-container-highest rounded-xl border border-outline-variant w-1/3" />
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="h-8 bg-surface-container-highest rounded-lg w-1/2" />
            <div className="h-4 bg-surface-container-highest rounded-lg w-1/4" />
            <div className="flex gap-4 mt-3">
              <div className="h-4 bg-surface-container-highest rounded-md w-16" />
              <div className="h-4 bg-surface-container-highest rounded-md w-16" />
              <div className="h-4 bg-surface-container-highest rounded-md w-16" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-surface-container-highest rounded-lg w-1/4" />
            <div className="glass rounded-xl p-4 h-24" />
          </div>
          <div className="space-y-3">
            <div className="h-6 bg-surface-container-highest rounded-lg w-1/4" />
            <div className="glass rounded-xl p-4 h-32" />
          </div>
        </div>
        {/* Preview Skeleton */}
        <div className="hidden lg:block w-[600px] bg-background border-l border-outline-variant p-6 space-y-6">
          <div className="h-8 bg-surface-container-highest rounded-lg w-1/2 mx-auto" />
          <div className="h-4 bg-surface-container-highest rounded-lg w-1/3 mx-auto" />
          <div className="border-t border-outline-variant pt-6 space-y-4">
            <div className="h-6 bg-surface-container-highest rounded-lg w-1/4" />
            <div className="h-4 bg-surface-container-highest rounded-lg w-full" />
            <div className="h-4 bg-surface-container-highest rounded-lg w-5/6" />
          </div>
          <div className="border-t border-outline-variant pt-6 space-y-4">
            <div className="h-6 bg-surface-container-highest rounded-lg w-1/4" />
            <div className="h-16 bg-surface-container-highest rounded-lg w-full" />
          </div>
        </div>
      </div>
    );
  }

  const resumeData: TemplateResumeData = {
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
  const latex = resumeToLatex(resumeData, template);

  const handleEnhancePrompt = async () => {
    if (!chatInput.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ollama/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnhancedPrompt(data.enhancedPrompt);
      } else {
        console.error('Enhance error:', data.error);
      }
    } catch (e: any) {
      console.error('Enhance error:', e.message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUpdateResume = async () => {
    if (!enhancedPrompt.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/ollama/update-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhancedPrompt: enhancedPrompt.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.changes) {
        const { summary: newSummary, experience: newExperience, skills: newSkills } = data.changes;
        if (newSummary) setSummary(newSummary);
        if (newExperience) {
          setExperience((prev: any[]) => {
            const merged = [...prev];
            for (const entry of newExperience) {
              const idx = merged.findIndex((e: any) => e.company === entry.company);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...entry };
              } else {
                merged.push(entry);
              }
            }
            return merged;
          });
        }
        if (newSkills) setSkills(newSkills);
        setChatInput('');
        setEnhancedPrompt('');
      }
    } catch (e: any) {
      console.error('Update resume error:', e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAnalyzeATS = async () => {
    if (!jobDescription.trim() || isAnalyzingATS) return;
    setIsAnalyzingATS(true);
    setAtsResult(null);
    setAtsScoreResult(null);
    setAtsChanges([]);
    setAtsImprovements([]);
    setAppliedImprovementIndices(new Set());
    setPreviousATSScore(null);

    try {
      // STEP 1 — Score first
      const scoreRes = await fetch('/api/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: {
            name: userName,
            title: userRole,
            summary,
            skills,
            experience,
            education,
            email,
            phone,
            location
          },
          jobDescription: jobDescription.trim()
        })
      });

      if (!scoreRes.ok) {
        const errData = await scoreRes.json().catch(() => null);
        throw new Error(errData?.error || 'ATS scoring failed');
      }

      const scoreData = await scoreRes.json();
      setAtsScoreResult(scoreData);

      const score = scoreData.overall_score;

      setAtsResult({
        analysis: {
          atsScore: score,
          atsScoreResult: scoreData,
          keywordAnalysis: {
            missingSkills: scoreData.missing_keywords,
            strongSkills: scoreData.found_keywords,
          },
          autoImprovements: [],
        },
        atsScore: score,
      });
      setIsAnalyzingATS(false);

      // STEP 2 — Check if improvement needed
      if (score >= 75) {
        showToast(`ATS Score: ${score}% — Resume is already well-optimized!`, 'success');
        return;
      }

      // STEP 3 — Generate suggestions one weak section at a time.
      const weakSections = Array.isArray(scoreData.weak_sections) && scoreData.weak_sections.length
        ? scoreData.weak_sections.slice(0, 4)
        : ['summary', 'skills', 'experience'];
      setLoadingImprovementCount(weakSections.length);
      setAtsChanges(scoreData.missing_keywords || []);

      for (const section of weakSections) {
        try {
          const optRes = await fetch('/api/optimize-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resume: {
                name: userName,
                title: userRole,
                summary,
                skills,
                experience,
                education,
                email,
                phone,
                location
              },
              jobDescription: jobDescription.trim(),
              currentScore: score,
              missingKeywords: scoreData.missing_keywords,
              weakSections: [section],
              titleInJd: scoreData.title_in_jd || "",
              skipRescore: true,
            })
          });

          if (optRes.ok) {
            const optData = await optRes.json();
            const improvements = (optData.changes || []).map((c: any) => ({
              section: c.section,
              before: c.before,
              after: c.after,
              impact: undefined,
            }));
            setAtsImprovements(prev => [...prev, ...improvements]);
          }
        } finally {
          setLoadingImprovementCount(prev => Math.max(0, prev - 1));
        }
      }

      showToast('Suggestions ready. Apply one or apply all to rescore.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to analyze ATS', 'error');
    } finally {
      setIsAnalyzingATS(false);
      setLoadingImprovementCount(0);
    }
  };

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const applyChanges = (changes: any) => {
        const { summary: newSummary, experience: newExperience, skills: newSkills } = changes;
        if (newSummary) setSummary(newSummary);
        if (newExperience) {
          setExperience((prev: any[]) => {
            const merged = [...prev];
            for (const entry of newExperience) {
              const idx = merged.findIndex((e: any) => e.company === entry.company);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...entry };
              } else {
                merged.push(entry);
              }
            }
            return merged;
          });
        }
        if (newSkills) setSkills(newSkills);
      };

      const shouldChunk = /\b(improve|optimi[sz]e|ats|resume|rewrite)\b/i.test(text);
      const prompts = shouldChunk
        ? [
          `Only improve the professional summary if needed. User request: ${text}`,
          `Only improve skills/keywords if needed. User request: ${text}`,
          `Only improve experience bullets if needed. User request: ${text}`,
        ]
        : [text];

      let appliedAny = false;
      for (let i = 0; i < prompts.length; i++) {
        if (prompts.length > 1) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: `Working on chunk ${i + 1}/${prompts.length}...` }]);
        }
        const res = await fetch('/api/ollama/update-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enhancedPrompt: prompts[i] }),
        });
        const data = await res.json();
        if (res.ok && data.changes) {
          const { summary: newSummary, experience: newExperience, skills: newSkills } = data.changes;
          applyChanges(data.changes);
          appliedAny = appliedAny || Boolean(newSummary || newExperience || newSkills);
        } else if (prompts.length === 1) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.error || "I couldn't process that request. Try being more specific about what you'd like to improve." }]);
        }
      }
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: appliedAny
          ? "I've applied the resume updates in smaller chunks."
          : "I did not find a specific resume change to apply. Try naming the section or bullet you want changed."
      }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const scoreResumeAfterApply = async (resume: any, previousScore?: number | null) => {
    if (!jobDescription.trim()) return;
    const scoreRes = await fetch('/api/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription: jobDescription.trim() })
    });
    if (!scoreRes.ok) {
      const errData = await scoreRes.json().catch(() => null);
      throw new Error(errData?.error || 'ATS rescore failed');
    }
    const scoreData = await scoreRes.json();
    setPreviousATSScore(previousScore ?? atsResult?.atsScore ?? atsScoreResult?.overall_score ?? null);
    setAtsScoreResult(scoreData);
    setAtsResult((prev: any) => ({
      ...(prev || {}),
      atsScore: scoreData.overall_score,
      analysis: {
        ...(prev?.analysis || {}),
        atsScore: scoreData.overall_score,
        keywordAnalysis: {
          missingSkills: scoreData.missing_keywords || [],
          strongSkills: scoreData.found_keywords || [],
        },
        gapAnalysis: `Recalculated ATS score after applying changes: ${scoreData.overall_score}%`,
      }
    }));
    setAtsChanges(scoreData.missing_keywords || []);
    return scoreData;
  };

  const applyImprovementToResume = (resume: TemplateResumeData, improvement: { section: string; before: string; after: string }) => {
    const next = {
      ...resume,
      skills: [...(resume.skills || [])],
      experience: JSON.parse(JSON.stringify(resume.experience || [])),
      education: JSON.parse(JSON.stringify(resume.education || [])),
    };
    const section = improvement.section.toLowerCase();
    const after = typeof improvement.after === 'string' ? improvement.after : String(improvement.after ?? '');
    const before = typeof improvement.before === 'string' ? improvement.before : String(improvement.before ?? '');

    if (section.includes('summary')) {
      next.summary = after;
    } else if (section.includes('skill')) {
      next.skills = after.split(/,|\n/).map(s => s.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
    } else if (section.includes('experience') || section.includes('project')) {
      let replaced = false;
      for (let i = 0; i < next.experience.length; i++) {
        const bullets = next.experience[i].bullets || [];
        const bulletIdx = bullets.findIndex((b: string) =>
          b.trim() === before.trim() || b.includes(before.trim()) || before.includes(b.trim())
        );
        if (bulletIdx >= 0) {
          const afterBullets = after.split('\n').map((s: string) => s.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
          next.experience[i] = {
            ...next.experience[i],
            bullets: [...bullets.slice(0, bulletIdx), afterBullets[0] || after, ...bullets.slice(bulletIdx + 1)],
          };
          replaced = true;
          break;
        }
      }
      if (!replaced && next.experience[0]) {
        const afterBullets = after.split('\n').map((s: string) => s.trim().replace(/^[-•]\s*/, '')).filter(Boolean);
        next.experience[0].bullets = [...(next.experience[0].bullets || []), ...afterBullets];
      }
    }
    return next;
  };

  const commitResumeData = (resume: TemplateResumeData) => {
    setUserName(resume.name || '');
    setUserRole(resume.title || '');
    setSummary(resume.summary || '');
    setSkills(resume.skills || []);
    setExperience(resume.experience || []);
    setEducation(resume.education || []);
    setEmail(resume.email || '');
    setPhone(resume.phone || '');
    setLocation(resume.location || '');
  };

  const handleApplyImprovement = async (index: number) => {
    if (appliedImprovementIndices.has(index)) return;
    const improvement = atsImprovements[index];
    if (!improvement) return;

    setIsApplyingImprovement(true);
    setApplyingImprovementIndex(index);
    try {
      const nextResume = applyImprovementToResume(resumeData, improvement);
      commitResumeData(nextResume);
      setAppliedImprovementIndices(prev => new Set(prev).add(index));
      const scoreData = await scoreResumeAfterApply(nextResume, atsResult?.atsScore);
      showToast(`Applied and recalculated ATS: ${scoreData?.overall_score ?? 'updated'}%`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to apply improvement', 'error');
    } finally {
      setApplyingImprovementIndex(null);
      setIsApplyingImprovement(false);
    }
  };

  const handleApplyAllImprovements = async () => {
    if (isApplyingImprovement) return;
    setIsApplyingImprovement(true);
    try {
      let nextResume = resumeData;
      const nextApplied = new Set(appliedImprovementIndices);
      for (let i = 0; i < atsImprovements.length; i++) {
        if (nextApplied.has(i)) continue;
        setApplyingImprovementIndex(i);
        nextResume = applyImprovementToResume(nextResume, atsImprovements[i]);
        commitResumeData(nextResume);
        nextApplied.add(i);
        setAppliedImprovementIndices(new Set(nextApplied));
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      setApplyingImprovementIndex(null);
      const scoreData = await scoreResumeAfterApply(nextResume, atsResult?.atsScore);
      showToast(`Applied all and recalculated ATS: ${scoreData?.overall_score ?? 'updated'}%`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to apply all improvements', 'error');
    } finally {
      setApplyingImprovementIndex(null);
      setIsApplyingImprovement(false);
    }
  };

  const handleApplyMissingKeyword = async (keyword: string) => {
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword || applyingKeyword) return;
    setApplyingKeyword(cleanKeyword);
    try {
      const hasKeyword = skills.some(skill => skill.toLowerCase() === cleanKeyword.toLowerCase());
      const summaryHasKeyword = (summary || '').toLowerCase().includes(cleanKeyword.toLowerCase());
      const experienceWithKeyword = JSON.parse(JSON.stringify(experience || []));
      const firstExperience = experienceWithKeyword[0];
      if (firstExperience && !JSON.stringify(firstExperience.bullets || []).toLowerCase().includes(cleanKeyword.toLowerCase())) {
        firstExperience.bullets = [
          ...(firstExperience.bullets || []),
          `Applied ${cleanKeyword} in production-focused delivery to improve reliability, scalability, and deployment readiness.`
        ];
      }
      const nextResume = {
        ...resumeData,
        skills: hasKeyword ? skills : [...skills, cleanKeyword],
        summary: summaryHasKeyword
          ? summary
          : `${summary || `${userRole || 'Professional'} with hands-on delivery experience.`} Experienced with ${cleanKeyword} across practical engineering workflows.`,
        experience: experienceWithKeyword,
      };
      commitResumeData(nextResume);
      const scoreData = await scoreResumeAfterApply(nextResume, atsResult?.atsScore);
      setAtsChanges(prev => prev.filter(item => item.toLowerCase() !== cleanKeyword.toLowerCase()));
      showToast(`Added keyword and recalculated ATS: ${scoreData?.overall_score ?? 'updated'}%`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to apply keyword', 'error');
    } finally {
      setApplyingKeyword(null);
    }
  };

  const handleImproveATS = async () => {
    if (!atsResult || isImprovingATS) return;
    setIsImprovingATS(true);
    try {
      const res = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: {
            name: userName,
            title: userRole,
            summary,
            skills,
            experience,
            education,
            email,
            phone,
            location
          },
          jobDescription: jobDescription.trim(),
          currentScore: atsScoreResult?.overall_score || atsResult?.atsScore || 50,
          missingKeywords: atsScoreResult?.missing_keywords || [],
          weakSections: atsScoreResult?.weak_sections || ['experience_keywords', 'skills_keywords', 'summary'],
          titleInJd: atsScoreResult?.title_in_jd || "",
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Optimization failed');
      }

      const data = await res.json();
      setPreviousATSScore(data.oldScore);

      // Apply improvements to resume state
      if (data.improvedResume) {
        if (data.improvedResume.summary) setSummary(data.improvedResume.summary);
        if (data.improvedResume.title) setUserRole(data.improvedResume.title);
        if (data.improvedResume.skills) setSkills(data.improvedResume.skills);
        if (data.improvedResume.experience) setExperience(data.improvedResume.experience);
      }

      // Build improvements list for LineByLine display
      const improvements: Array<{ section: string; before: string; after: string; impact?: number }> =
        (data.changes || []).map((c: any) => ({
          section: c.section,
          before: c.before,
          after: c.after,
          impact: Math.round(((data.newScore || data.oldScore) - data.oldScore) / Math.max(data.changes?.length || 1, 1)),
        }));
      setAtsImprovements(improvements);

      setAtsResult((prev: any) => ({
        ...prev,
        atsScore: data.newScore || prev.atsScore,
        analysis: {
          ...prev?.analysis,
          atsScore: data.newScore || prev?.atsScore,
          gapAnalysis: `Score improved from ${data.oldScore}% to ${data.newScore || data.oldScore}%`,
        }
      }));

      showToast(`Score improved to ${data.newScore || '80+'}!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to improve resume', 'error');
    } finally {
      setIsImprovingATS(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden bg-background">
        <section className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-outline-variant/30 px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-4 w-20 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-surface-container-high rounded-lg animate-pulse" />
                <div className="h-8 w-8 bg-surface-container-high rounded-lg animate-pulse" />
                <div className="h-8 w-8 bg-surface-container-high rounded-lg animate-pulse" />
                <div className="h-8 w-20 bg-surface-container-high rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="glass rounded-xl p-2">
                <div className="h-10 bg-surface-container-high rounded-lg animate-pulse" />
              </div>
              <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
                <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
                <div className="h-4 w-32 bg-surface-container-high rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-3 w-24 bg-surface-container-high rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface-container-high rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface-container-high rounded animate-pulse" />
                </div>
              </div>
              <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
                <div className="h-5 w-24 bg-surface-container-high rounded animate-pulse" />
                <div className="h-16 bg-surface-container-high rounded-lg animate-pulse" />
              </div>
              <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
                <div className="h-5 w-20 bg-surface-container-high rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-12 bg-surface-container-high rounded-lg animate-pulse" />
                  <div className="h-12 bg-surface-container-high rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
                <div className="h-5 w-28 bg-surface-container-high rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-10 bg-surface-container-high rounded-lg animate-pulse" />
                  <div className="h-10 bg-surface-container-high rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
                <div className="h-5 w-16 bg-surface-container-high rounded animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-16 bg-surface-container-high rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-surface-container-high rounded-full animate-pulse" />
                  <div className="h-6 w-14 bg-surface-container-high rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-surface-container-high rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-surface-container-high rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      {/* Main Editor - Takes remaining space */}
      <section className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-background">
        {/* Sticky Action Bar */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-outline-variant/30 px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 max-w-3xl mx-auto">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-on-surface-variant">
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
            <div className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
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
              <button onClick={() => saveCurrentVersion()} className="p-1.5 sm:p-2 hover:bg-surface-container rounded-md text-on-surface-variant hover:text-primary transition-colors" title="Save">
                <Save className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className={cn(
                  "p-1.5 sm:p-2 rounded-md transition-colors",
                  historyIndex > 0 ? "hover:bg-surface-container text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                )}
                title="Undo"
              >
                <Undo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={cn(
                  "p-1.5 sm:p-2 rounded-md transition-colors",
                  historyIndex < history.length - 1 ? "hover:bg-surface-container text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                )}
                title="Redo"
              >
                <Redo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
              <div className="w-px h-4 sm:h-5 bg-outline-variant/30 mx-0.5 sm:mx-1" />
              <Link
                href={parseError ? "#" : "/apply"}
                className={cn(
                  "btn-primary py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium",
                  parseError && "opacity-50 pointer-events-none cursor-not-allowed"
                )}
                onClick={(e) => parseError && e.preventDefault()}
              >
                <Briefcase className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">Apply Now</span>
              </Link>
              <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 sm:p-2 hover:bg-surface-container rounded-md text-on-surface-variant transition-colors">
                {showPreview ? <PanelRightClose className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <PanelLeftClose className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="px-4 pt-2 pb-0 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-1 bg-surface-container-high/50 rounded-xl p-1">
              {([
                { id: 'optimize' as const, label: 'Optimize', icon: Sparkles },
                { id: 'manual-edit' as const, label: 'Manual Edit', icon: Edit3 },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all relative",
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container-higher/50"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-lg -z-0"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Shared: file input (always mounted) */}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif,image/*" />

            {/* Shared: parse error alert */}
            {parseError && (
              <div className="glass rounded-xl p-4 border border-error/30 bg-error/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-error" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-error">Failed to Parse Resume</h4>
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

            {/* ── Optimize Tab (AI Chat + ATS Score merged) ───────────── */}
            {activeTab === 'optimize' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="optimize"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* ── AI Chat Section ── */}
                  <div className="bg-surface-container/30 border border-outline-variant/20 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="text-xs font-bold text-on-surface">AI Chat</h3>
                      <span className="text-[10px] text-on-surface-variant/60">Ask AI to optimize your resume</span>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-3 mb-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3",
                            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                          )}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                            msg.role === 'user'
                              ? 'bg-primary/20 border border-primary/30'
                              : 'bg-surface-container-highest border border-outline-variant'
                          )}>
                            {msg.role === 'user' ? (
                              <User className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Bot className="w-3.5 h-3.5 text-secondary" />
                            )}
                          </div>
                          <div className={cn(
                            "max-w-[80%] overflow-hidden break-words rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                            msg.role === 'user'
                              ? 'bg-primary text-on-primary rounded-tr-md'
                              : 'bg-surface-container border border-outline-variant/50 rounded-tl-md'
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5 text-secondary" />
                          </div>
                          <div className="bg-surface-container border border-outline-variant/50 rounded-2xl rounded-tl-md px-3.5 py-2.5 flex items-center gap-2 text-xs text-on-surface-variant">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggested actions */}
                    {chatMessages.length === 1 && !isChatLoading && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[
                          "Improve my summary for ATS",
                          "Add more keywords from JD",
                          "Rewrite experience bullets",
                          "Suggest skill improvements"
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => { setChatInput(suggestion); }}
                            className="max-w-full text-left text-[10px] px-2.5 py-1.5 bg-surface-container-hover border border-outline-variant/50 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Chat Input */}
                    <div className="flex items-end gap-2 bg-background border border-outline-variant/30 rounded-lg p-2">
                      <textarea
                        rows={1}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); } }}
                        placeholder="Ask AI to optimize your resume..."
                        className="min-w-0 flex-1 bg-transparent text-xs text-on-background placeholder:text-on-surface-variant/40 outline-none resize-none max-h-20"
                      />
                      <button
                        type="button"
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="h-8 px-3 btn-primary rounded-lg flex items-center gap-1.5 font-bold text-[10px] shadow-lg disabled:opacity-50 shrink-0"
                      >
                        {isChatLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 fill-white" />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  </div>

                  {/* ── ATS Score Section ── */}
                  <div className="bg-surface-container/30 border border-outline-variant/20 rounded-xl p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="text-xs font-bold text-on-surface">ATS Score</h3>
                      <span className="text-[10px] text-on-surface-variant/60">Analyze resume against job description</span>
                    </div>

                    {/* JD Input */}
                    <div className="glass rounded-xl p-3 border border-outline-variant/30">
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the full job description here to analyze ATS compatibility..."
                        rows={3}
                        className="w-full bg-background border border-outline-variant rounded-lg p-2.5 text-xs text-on-background placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary resize-none transition-all"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-[10px] text-on-surface-variant">
                        <div className="rounded-lg border border-outline-variant/40 bg-background/60 px-2.5 py-2">
                          <span className="font-bold text-on-surface">{jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0}</span> JD words
                        </div>
                        <div className="rounded-lg border border-outline-variant/40 bg-background/60 px-2.5 py-2">
                          <span className="font-bold text-on-surface">{skills.length}</span> skills listed
                        </div>
                        <div className="rounded-lg border border-outline-variant/40 bg-background/60 px-2.5 py-2">
                          <span className="font-bold text-on-surface">{experience.reduce((count, exp) => count + ((exp.bullets || []).length || 0), 0)}</span> impact bullets
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                        <button
                          onClick={handleAnalyzeATS}
                          disabled={!jobDescription.trim() || isAnalyzingATS}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-primary/20"
                        >
                          {isAnalyzingATS ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
                          {isAnalyzingATS ? 'Analyzing...' : 'Analyze'}
                        </button>
                      </div>
                    </div>

                    {/* ATS Results */}
                    {isAnalyzingATS && (
                      <div className="flex flex-col items-center justify-center py-12 mt-4 bg-surface-container/30 border border-outline-variant/20 rounded-xl">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                        <p className="text-xs text-on-surface-variant">Analyzing resume against job description...</p>
                      </div>
                    )}

                    {atsResult && !isAnalyzingATS && (
                      <div className="mt-4 space-y-4">
                        <ATSScoreCard
                          data={{
                            score: atsResult.atsScore ?? 0,
                            matched: atsResult.analysis?.keywordAnalysis?.strongSkills ?? atsScoreResult?.found_keywords ?? [],
                            missing: atsResult.analysis?.keywordAnalysis?.missingSkills ?? atsScoreResult?.missing_keywords ?? [],
                          }}
                          onApplyKeyword={handleApplyMissingKeyword}
                          applyingKeyword={applyingKeyword}
                          previousScore={previousATSScore}
                          analysis={atsResult.analysis ? {
                            gapAnalysis: atsResult.analysis.gapAnalysis,
                            actionableImprovements: atsResult.analysis.actionableImprovements,
                          } : undefined}
                        />

                        {atsImprovements.length > 0 && (
                          <LineByLineImprovements
                            improvements={atsImprovements}
                            onApply={handleApplyImprovement}
                            onApplyAll={handleApplyAllImprovements}
                            applying={isApplyingImprovement}
                            applyingIndex={applyingImprovementIndex}
                            loadingCount={loadingImprovementCount}
                            appliedIndices={appliedImprovementIndices}
                          />
                        )}
                      </div>
                    )}
                    {!atsImprovements.length && loadingImprovementCount > 0 && (
                      <div className="mt-4">
                        <LineByLineImprovements
                          improvements={atsImprovements}
                          onApply={handleApplyImprovement}
                          onApplyAll={handleApplyAllImprovements}
                          applying={isApplyingImprovement}
                          applyingIndex={applyingImprovementIndex}
                          loadingCount={loadingImprovementCount}
                          appliedIndices={appliedImprovementIndices}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
            {activeTab === 'manual-edit' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="manual-edit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {/* Name & Role Card */}
                  <div className="glass rounded-xl p-4 sm:p-5 group relative">
                    <h1 className="text-xl sm:text-2xl font-bold text-on-surface outline-none focus:text-primary transition-colors" contentEditable suppressContentEditableWarning onBlur={(e) => setUserName(e.currentTarget.innerText)}>{userName || 'Your Name'}</h1>
                    <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-1 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setUserRole(e.currentTarget.innerText)}>{userRole || 'Your Title'}</p>
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-on-surface-variant/70">
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
                              <button onClick={() => setEducation(education.filter((_, idx) => idx !== i))} className="p-1 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
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
                            <button onClick={() => setExperience(experience.filter((_, idx) => idx !== i))} className="p-1 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
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
                        <div key={i} className="glass rounded-full px-3 py-1.5 flex items-center gap-2 group transition-all hover:bg-surface-container-highest">
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
                            className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
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
                </motion.div>
              </AnimatePresence>
            )}

          </div>
        </div>
      </section>

      {/* Preview Panel - Fixed width, sticky */}
      <AnimatePresence>
        {showPreview && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:flex flex-col h-full bg-background border-l border-white/5 overflow-hidden max-w-[600px]"
          >
            {/* Preview Toolbar */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={() => setPreviewMode('desktop')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'desktop' ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface")}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setPreviewMode('mobile')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'mobile' ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface")}><Smartphone className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                {/* Template Selector */}
                <div className="flex items-center gap-0.5 bg-surface-container-high px-1 py-1 rounded-lg border border-outline-variant">
                  {(['classic', 'modern', 'minimalist'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTemplate(t)}
                      className={cn(
                        "px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all",
                        template === t ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-surface-container-high rounded-lg overflow-hidden">
                  <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 text-on-surface-variant hover:text-on-surface"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <span className="text-[10px] font-mono text-on-surface-variant w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(Math.min(120, zoom + 10))} className="p-1.5 text-on-surface-variant hover:text-on-surface"><ZoomIn className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex items-center gap-1 bg-surface-container-high px-1.5 py-1 rounded-lg border border-outline-variant">
                  {['#000000', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setResumeColor(color)}
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border transition-all hover:scale-110",
                        resumeColor === color ? "border-outline scale-110 shadow-sm" : "border-transparent"
                      )}
                      style={{ backgroundColor: color === '#000000' && resumeTheme === 'dark' ? '#ffffff' : color }}
                      title={`Accent Color ${color}`}
                    />
                  ))}
                </div>
                <button onClick={() => setResumeTheme(resumeTheme === 'light' ? 'dark' : 'light')} className="text-[10px] font-semibold text-on-surface-variant uppercase hover:text-on-surface">{resumeTheme}</button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex justify-center bg-background">
              <motion.div
                id="resume-preview"
                className={cn(
                  "rounded-lg shadow-2xl transition-all overflow-visible",
                  previewMode === 'mobile' ? "w-[320px]" : "w-[800px]"
                )}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  minHeight: '1123px',
                }}
              >
                {template === 'classic' && (
                  <ClassicTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                )}
                {template === 'modern' && (
                  <ModernTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                )}
                {template === 'minimalist' && (
                  <MinimalistTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                )}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-80 glass-dark z-50 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center">
                <div className="flex items-center gap-2"><History className="w-5 h-5 text-primary" /><h2 className="text-base font-bold">Timeline</h2></div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-surface-container-highest rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {versions.length === 0 ? <div className="text-center text-on-surface-variant text-sm py-10 opacity-50">No versions</div> : versions.map(v => (
                  <div key={v.id} className="glass rounded-lg p-3 group">
                    <div className="flex justify-between"><div><h4 className="text-sm font-semibold">{v.name}</h4><p className="text-[9px] text-on-surface-variant mt-0.5">{v.timestamp}</p></div>                      <button onClick={async () => { await fetch(`/api/resumes?id=${v.id}`, { method: 'DELETE' }); setVersions(versions.filter(x => x.id !== v.id)); }} className="p-1 opacity-0 group-hover:opacity-100 text-error"><Trash2 className="w-3.5 h-3.5" /></button></div>
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
