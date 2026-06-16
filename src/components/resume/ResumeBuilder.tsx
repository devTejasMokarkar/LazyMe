"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud, Undo2, Redo2, Mail, Phone, MapPin, Sparkles, PlusCircle, X,
  Download, ZoomIn, ZoomOut, Upload, FileType, CheckCircle2, History,
  RotateCcw, Save, Trash2, Eye, Loader2, PanelLeftClose, PanelRightClose,
  Monitor, Smartphone, Briefcase, Palette, Code, Send,
  FileText, AlertCircle, Target, ChevronDown, Edit3, MessageSquare, Bot, User,
  Sun, Moon
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
import type { TemplateType, ResumeData as TemplateResumeData, ResumeWordedData } from '@/components/resume/templates/index';
import { ResumeWordedTemplate } from '@/components/resume/templates/ResumeWordedTemplate';
import { resumeToLatex } from '@/features/ai/latex.service';
import { downloadPDF } from '@/features/ai/pdf.service';

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
    const catKeys = ['technicalSkills', 'frameworks', 'databases', 'cloudDevOps', 'industryKnowledge', 'technical', 'soft', 'tools', 'languages'];
    const result: string[] = [];
    for (const key of catKeys) {
      if (Array.isArray(skills[key])) {
        result.push(...skills[key]);
      }
    }
    return result;
  }
  return [];
}

// Helper to normalize projects from API format { name, description, techStack[] }
// into template format { name, date?, bullets[] }
function normalizeProjects(projects: any): Array<{ name: string; date?: string; bullets: string[] }> {
  if (!Array.isArray(projects)) return [];
  return projects.map((p: any) => {
    const bullets: string[] = [];
    if (p.description) bullets.push(p.description);
    if (Array.isArray(p.techStack) && p.techStack.length) {
      bullets.push(`Technologies: ${p.techStack.join(', ')}`);
    }
    // If bullets already provided (from worded-data edits), use them directly
    if (Array.isArray(p.bullets) && p.bullets.length) {
      return { name: p.name || '', date: p.date, bullets: p.bullets };
    }
    return { name: p.name || '', date: p.date, bullets };
  });
}

// sessionStorage sentinel keys for "this prompt was already processed in
// this session". Survives React Strict Mode's double-mount and short
// remounts, but resets on a real page reload so the user can re-generate.
const PROMPT_SESSION_PREFIX = "lazyme_prompt_applied_";

function promptSessionKey(prompt: string): string {
  // Tiny FNV-1a-ish hash; collisions are fine for a dedup key.
  let h = 2166136261;
  for (let i = 0; i < prompt.length; i++) {
    h ^= prompt.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return PROMPT_SESSION_PREFIX + h.toString(36);
}

function markPromptApplied(prompt: string) {
  try {
    sessionStorage.setItem(promptSessionKey(prompt), "1");
  } catch { /* sessionStorage may be unavailable */ }
}

function isPromptApplied(prompt: string): boolean {
  try {
    return sessionStorage.getItem(promptSessionKey(prompt)) === "1";
  } catch {
    return false;
  }
}

function clearPromptApplied(prompt: string) {
  try {
    sessionStorage.removeItem(promptSessionKey(prompt));
  } catch { /* noop */ }
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
  const [resumeProjects, setResumeProjects] = useState<Array<{ name: string; date?: string; bullets: string[] }>>([]);

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimize' | 'manual-edit'>('optimize');

  // Handle Ctrl+P for perfect resume printing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        downloadPDF('resume-preview', `resume_${userName.replace(/\s+/g, '_').toLowerCase() || 'download'}.pdf`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userName]);

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
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [estimatedScore, setEstimatedScore] = useState<number | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [appliedChangesLog, setAppliedChangesLog] = useState<string[]>([]);
  const [scoreIsDirty, setScoreIsDirty] = useState(false);

  // Calculate estimated score based on missing keywords
  const calculateEstimatedScore = () => {
    if (!atsResult) return null;
    const currentScore = atsResult.atsScore ?? 0;
    const missingKeywords = atsResult.analysis?.keywordAnalysis?.missingSkills ?? atsScoreResult?.missing_keywords ?? [];
    const actionableCount = atsResult.analysis?.actionableImprovements?.length ?? 0;
    
    // Estimate: each missing keyword adds ~3-5% if added, each actionable improvement adds ~2-4%
    const keywordImprovement = Math.min(missingKeywords.length * 4, 20); // Max 20% from keywords
    const actionImprovement = Math.min(actionableCount * 3, 15); // Max 15% from actions
    const estimated = Math.min(currentScore + keywordImprovement + actionImprovement, 95); // Cap at 95%
    
    return estimated > currentScore ? estimated : null;
  };

  // Update estimated score when ATS result changes
  useEffect(() => {
    if (atsResult) {
      setEstimatedScore(calculateEstimatedScore());
    }
  }, [atsResult, atsScoreResult]);

  // ATS step indicator
  const ATS_STEPS = [
    { key: 'parsing', label: 'Parsing resume & extracting job requirements' },
    { key: 'matching', label: 'Matching keywords across all sections' },
    { key: 'scoring', label: 'Computing section scores' },
    { key: 'optimizing', label: 'Generating targeted improvement suggestions' },
  ] as const;
  type AtsStepKey = (typeof ATS_STEPS)[number]['key'];
  const [atsCurrentStep, setAtsCurrentStep] = useState<AtsStepKey | null>(null);

  // Template state
  const [template, setTemplate] = useState<TemplateType>('resumeworded');

  // ResumeWorded data state
  const [wordedContact, setWordedContact] = useState({ location: '', phone: '', email: '', linkedin: '' });
  const [wordedSkills, setWordedSkills] = useState({
    technicalSkills: [] as string[],
    frameworks: [] as string[],
    databases: [] as string[],
    cloudDevOps: [] as string[],
    industryKnowledge: [] as string[],
  });
  const [wordedExperience, setWordedExperience] = useState<Array<{
    company: string; dates: string; title: string; companyDescription?: string; bullets: string[];
  }>>([]);
  const [wordedEducation, setWordedEducation] = useState<Array<{
    institution: string; degree: string; graduationDate: string;
  }>>([]);
  const [wordedName, setWordedName] = useState('');
  const [wordedTitle, setWordedTitle] = useState('');

  // ---------------------------------------------------------------
  // WORDED STATE SYNC HELPER
  // Called every time a resume is uploaded, loaded from DB, or created
  // from a prompt so the ResumeWordedTemplate always shows fresh data.
  // ---------------------------------------------------------------
  function applyWordedData(r: any) {
    const cats = r.skillsCategories || {};
    const allSkills: string[] = normalizeSkills(r.skills);

    // Categorise skills: use API-returned categories when available,
    // otherwise fall back to regex bucketing of the flat list.
    const technical: string[] = Array.from(new Set((cats.technical && cats.technical.length > 0)
      ? cats.technical
      : allSkills.filter((s: string) => /^(python|javascript|typescript|java|rust|go|c\+\+|c#|php|ruby|swift|kotlin|scala|html|css)$/i.test(s))));
    const frameworks: string[] = Array.from(new Set((cats.frameworks && cats.frameworks.length > 0)
      ? cats.frameworks
      : allSkills.filter((s: string) => /^(react|vue|angular|svelte|next|nuxt|express|django|flask|spring|rails|node|tensorflow|pytorch|langchain)$/i.test(s))));
    const databases: string[] = Array.from(new Set((cats.databases && cats.databases.length > 0)
      ? cats.databases
      : allSkills.filter((s: string) => /^(sql|nosql|mongodb|postgresql|mysql|sqlite|redis|elasticsearch|dynamodb|cosmos)/i.test(s))));
    const cloudDevOps: string[] = Array.from(new Set((cats.cloudDevOps && cats.cloudDevOps.length > 0)
      ? cats.cloudDevOps
      : allSkills.filter((s: string) => /^(aws|azure|gcp|docker|kubernetes|terraform|ansible|jenkins|ci\/cd)/i.test(s))));
    const industryKnowledge: string[] = Array.from(new Set((cats.industryKnowledge && cats.industryKnowledge.length > 0)
      ? cats.industryKnowledge
      : allSkills.filter((s: string) => !technical.includes(s) && !frameworks.includes(s) && !databases.includes(s) && !cloudDevOps.includes(s))));

    setWordedName(r.name || '');
    setWordedTitle(r.title || '');
    setWordedContact({
      location: r.location || '',
      phone: r.phone || '',
      email: r.email || '',
      linkedin: (r.links || []).find((l: string) => l.includes('linkedin')) || '',
    });
    setWordedSkills({ technicalSkills: technical, frameworks, databases, cloudDevOps, industryKnowledge });
    setWordedExperience(
      (r.experience || []).map((e: any) => ({
        company: e.company || '',
        dates: e.duration || e.dates || '',
        title: e.role || e.title || '',
        companyDescription: e.companyDescription || '',
        bullets: Array.isArray(e.bullets) ? e.bullets : [],
      }))
    );
    setWordedEducation(
      (r.education || []).map((e: any) => ({
        institution: e.institution || e.school || '',
        degree: e.degree || '',
        graduationDate: e.graduationDate || e.year || '',
      }))
    );
  }

  // Sync worded data back to flat state for ATS compatibility
  useEffect(() => {
    if (wordedContact.email) setEmail(wordedContact.email);
    if (wordedContact.phone) setPhone(wordedContact.phone);
    if (wordedContact.location) setLocation(wordedContact.location);
  }, [wordedContact]);

  useEffect(() => {
    if (wordedName) setUserName(wordedName);
    if (wordedTitle) setUserRole(wordedTitle);
  }, [wordedName, wordedTitle]);

  useEffect(() => {
    if (wordedSkills.technicalSkills.length > 0 || wordedSkills.frameworks.length > 0) {
      const all = [
        ...wordedSkills.technicalSkills,
        ...wordedSkills.frameworks,
        ...wordedSkills.databases,
        ...wordedSkills.cloudDevOps,
        ...wordedSkills.industryKnowledge,
      ];
      if (all.length > 0) setSkills(all);
    }
  }, [wordedSkills]);

  useEffect(() => {
    if (wordedExperience.length > 0) {
      setExperience(wordedExperience.map(e => ({
        company: e.company,
        role: e.title,
        duration: e.dates,
        bullets: e.bullets,
        companyDescription: e.companyDescription,
      })));
    }
  }, [wordedExperience]);

  useEffect(() => {
    if (wordedEducation.length > 0) {
      setEducation(wordedEducation.map(e => ({
        school: e.institution,
        degree: e.degree,
        year: e.graduationDate,
      })));
    }
  }, [wordedEducation]);

  function toWordedData(): ResumeWordedData {
    return {
      name: wordedName || userName,
      title: wordedTitle || userRole,
      contact: wordedContact,
      experience: wordedExperience.length > 0 ? wordedExperience : experience.map(e => ({
        company: e.company,
        dates: e.duration,
        title: e.role,
        bullets: e.bullets || [],
      })),
      education: wordedEducation.length > 0 ? wordedEducation : education.map(e => ({
        institution: e.school,
        degree: e.degree,
        graduationDate: e.year,
      })),
      skills: wordedSkills,
    };
  }

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

  // Helper to apply API result to component state
  function applyResumeData(r: any, savedResume?: any) {
    setUserName(r.name || '');
    setUserRole(r.title || '');
    setExperience(r.experience || []);
    setSkills(normalizeSkills(r.skills));
    setEmail(r.email || '');
    setPhone(r.phone || '');
    setLocation(r.location || '');
    setSummary(r.summary || '');
    setEducation(r.education || []);
    setResumeProjects(normalizeProjects(r.projects || []));
    applyWordedData(r); // keep worded template in sync

    if (savedResume) {
      setResumeId(savedResume.id);
      setVersions([{
        id: savedResume.id, name: savedResume.name,
        timestamp: new Date().toLocaleString(), content: r
      }]);
    }

    const baseline = {
      userName: r.name || '', userRole: r.title || '',
      experience: r.experience || [], skills: normalizeSkills(r.skills),
      email: r.email || '', phone: r.phone || '',
      location: r.location || '', summary: r.summary || '',
      education: r.education || []
    };
    setHistory([baseline]);
    setHistoryIndex(0);
    lastSavedContent.current = JSON.stringify(baseline);
  }

  useEffect(() => {
    let cancelled = false;

    async function initResume() {
      // ============================================================
      // RACE-FREE INITIALIZATION
      // ============================================================
      // The previous version used `promptProcessedRef` (a useRef) to dedup
      // prompt processing. That broke under React 18 Strict Mode: the first
      // mount set the ref to true and started the API call, the cleanup
      // ran, the second mount saw the ref as true and skipped — but the
      // first mount's `cancelled = true` could also drop the result,
      // letting the fall-through DB fetch (old Jane Smith) win.
      //
      // Fix: use sessionStorage (survives Strict Mode double-mount and
      // short remounts) as the source of truth, set it BEFORE the await
      // (atomic dedup), strip the ?prompt=… URL atomically, and guard
      // Step 4 (DB fetch) so it never overwrites a freshly-applied prompt.
      // ============================================================

      // ---- PHASE 1: initialPrompt (create from URL ?prompt=…) ----
      // Also check localStorage fallback set by landing page before OAuth
      let promptToProcess = initialPrompt;
      if (!promptToProcess) {
        const stored = localStorage.getItem('lazyme_pending_prompt');
        if (stored) {
          promptToProcess = stored;
          localStorage.removeItem('lazyme_pending_prompt');
        }
      }

      if (promptToProcess) {
        if (isPromptApplied(promptToProcess)) {
          // Strict Mode double-mount: first mount owns the API call.
          // Check if it cached the result in sessionStorage.
          const cacheKey = `lazyme_prompt_result_${promptSessionKey(promptToProcess)}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            try {
              const r = JSON.parse(cached);
              sessionStorage.removeItem(cacheKey);
              applyResumeData(r);
              setLoading(false);
              return;
            } catch { /* stale cache — fall through */ }
          }
          // First mount hasn't finished yet — don't bail, let this mount
          // process the prompt too (cancelled is per-mount, so this one
          // won't be cancelled).
          // Fall through to the processing below.
        } else {
          markPromptApplied(promptToProcess);
        }

        // Stale data from a previous chat Save & Edit must NOT win.
        localStorage.removeItem('lazyme_pending_resume');
        sessionStorage.removeItem('pendingResume');

        // Strip the ?prompt=… from the URL atomically so a refresh
        // or remount doesn't re-trigger generation. Done BEFORE await
        // so a concurrent mount sees a clean URL.
        if (typeof window !== 'undefined' && window.location.search.includes('prompt=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }

        try {
          const genRes = await fetch('/api/create-resume-from-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: promptToProcess })
          });
          if (cancelled) {
            // Strict Mode double-mount: this mount's response is stale.
            // The re-mount will process the prompt instead. Don't
            // fall through to Phase 2/3 — the re-mount owns it now.
            return;
          }
          if (!genRes.ok) {
            console.error('create-resume-from-chat failed:', genRes.status);
          } else {
            const genData = await genRes.json();
            if (cancelled) return;
            if (!genData.resume) {
              console.error('create-resume-from-chat returned no resume');
            } else {
              const r = genData.resume;

              // Cache in sessionStorage so a concurrent mount (Strict Mode
              // re-mount) can pick up the result without re-calling the API.
              try {
                sessionStorage.setItem(
                  `lazyme_prompt_result_${promptSessionKey(promptToProcess)}`,
                  JSON.stringify(r)
                );
              } catch { /* quota — non-fatal */ }

              // Auto-save to DB (server unsets other isDefault rows).
              let savedResume: any = null;
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
                if (cancelled) return;
                if (saveRes.ok) {
                  savedResume = await saveRes.json();
                } else {
                  console.error('Failed to auto-save created resume:', saveRes.status);
                }
              } catch (dbErr) {
                console.error('Failed to auto-save created resume:', dbErr);
              }

              if (cancelled) return;

              applyResumeData(r, savedResume);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Failed to create resume from prompt:', err);
        }
        // If we got here, prompt processing failed — fall through to
        // localStorage / DB so the user at least sees something rather
        // than a blank screen.
      }

      // ---- PHASE 2: localStorage / sessionStorage pending resume ----
      // (used by the /chat "Save & Edit" flow and the upload flow)
      // Check all known pending-resume keys (different flows use different keys)
      const pending =
        localStorage.getItem('lazyme_pending_resume') ||
        sessionStorage.getItem('lazyme_pending_resume') ||
        sessionStorage.getItem('pendingResume');

      if (pending) {
        // IMMEDIATELY clear storage so no other mount/call can re-read stale data
        sessionStorage.removeItem('pendingResume');
        sessionStorage.removeItem('lazyme_pending_resume');
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
          applyWordedData(parsed); // keep worded template in sync
          setUploadSuccess(true);

          // Restore resume ID if the API already persisted it
          if (parsed.id) setResumeId(parsed.id);

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
                    education: parsed.education,
                    skillsCategories: parsed.skillsCategories || {},
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

      // ---- PHASE 3: DB fetch (default behaviour) ----
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
  }, [initialPrompt]);

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
    setResumeProjects(normalizeProjects(c.projects || []));
    applyWordedData(c); // keep worded template in sync

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
    const content = { name: userName, title: userRole, experience, skills, email, phone, location, summary, education, projects: resumeProjects };
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
        setResumeProjects(normalizeProjects(data.projects || []));
        applyWordedData(data); // keep worded template in sync
        setUploadSuccess(true);
        setNeedsUpload(false);
        setParsingFeedback([
          { name: 'Identity', status: 'success', confidence: 98 },
          { name: 'Experience', status: 'success', confidence: 94 },
          { name: 'Skills', status: 'success', confidence: 91 },
          { name: 'Education', status: 'success', confidence: 88 }
        ]);

        // Persist parsed data to sessionStorage so it survives an OAuth
        // redirect / page reload. initResume Phase 2 will pick this up.
        try {
          sessionStorage.setItem('lazyme_pending_resume', JSON.stringify({
            ...data,
            skillsCategories: data.skillsCategories || {},
            id: data.id || null,
          }));
        } catch { /* quota — non-fatal */ }

        // The parse-resume API already auto-saved to DB and returned data.id.
        // Reuse that ID instead of creating a duplicate row. If data.id is
        // missing (unauthenticated parse), save now.
        if (data.id) {
          setResumeId(data.id);
          // Update the existing row to mark as default and include skillsCategories
          await fetch('/api/resumes', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.id,
              isDefault: true,
              content: {
                name: data.name, title: data.title,
                experience: data.experience, skills: data.skills,
                email: data.email, phone: data.phone,
                location: data.location, summary: data.summary,
                education: data.education,
                projects: data.projects || [],
                skillsCategories: data.skillsCategories || {},
              },
            }),
          }).catch(() => {}); // non-fatal
        } else {
          // Not authenticated during parse — save now that we have a session
          const saveRes = await fetch('/api/resumes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Resume ${new Date().toLocaleDateString()}`,
              content: {
                name: data.name, title: data.title,
                experience: data.experience, skills: data.skills,
                email: data.email, phone: data.phone,
                location: data.location, summary: data.summary,
                education: data.education,
                projects: data.projects || [],
                skillsCategories: data.skillsCategories || {},
              },
              isDefault: true,
            }),
          });
          if (saveRes.ok) {
            const newResume = await saveRes.json();
            setResumeId(newResume.id);
          }
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
        const trimmed = [...newHistory, stateToSave];
        if (trimmed.length > 10) trimmed.splice(0, trimmed.length - 10);
        setHistory(trimmed);
        setHistoryIndex(trimmed.length - 1);
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
        education,
        projects: resumeProjects
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
  }, [userName, userRole, experience, skills, email, phone, location, summary, education, resumeProjects, resumeId, loading]);

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
    education,
    projects: resumeProjects,
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

  const setStep = (key: AtsStepKey) => {
    setAtsCurrentStep(key);
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
    setAtsCurrentStep('parsing');

    try {
      // Quick client-side pre-score (instant, before API call)
      const jdWords = jobDescription.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
      const resumeWords = new Set([
        ...(userRole || '').toLowerCase().split(/\s+/),
        ...(summary || '').toLowerCase().split(/\s+/),
        ...skills.flatMap(s => s.toLowerCase().split(/\s+/)),
      ]);
      const quickMatchCount = jdWords.filter(w => resumeWords.has(w)).length;
      const quickScore = jdWords.length > 0 ? Math.round((quickMatchCount / jdWords.length) * 100) : 0;

      await new Promise(r => setTimeout(r, 300));
      setStep('matching');

      let scoreRes: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        scoreRes = await fetch('/api/ats-score', {
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
        if (scoreRes.status !== 429) break;
        const wait = parseInt(scoreRes.headers.get('retry-after') || '0', 10) * 1000 || 4000;
        await new Promise(r => setTimeout(r, wait));
      }

      setStep('scoring');
      await new Promise(r => setTimeout(r, 200));

      if (!scoreRes || !scoreRes.ok) {
        const errData = scoreRes ? await scoreRes.json().catch(() => null) : null;
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

      // STEP 2 — Check if improvement needed
      if (score >= 95) {
        setAtsCurrentStep(null);
        showToast(`ATS Score: ${score}% — Resume is highly optimized!`, 'success');
        return;
      }

      // STEP 3 — Generate suggestions one weak section at a time.
      setStep('optimizing');
      const weakSections: string[] = Array.isArray(scoreData.weak_sections) && scoreData.weak_sections.length
        ? scoreData.weak_sections.slice(0, 4)
        : ['summary', 'skills', 'experience'];
      setLoadingImprovementCount(weakSections.length);
      setAtsChanges(scoreData.missing_keywords || []);

      // Sequential with retry to avoid hammering the AI rate limit.
      for (const section of weakSections) {
        try {
          let optRes: Response | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            optRes = await fetch('/api/optimize-resume', {
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
            if (optRes.status !== 429) break;
            const wait = parseInt(optRes.headers.get('retry-after') || '0', 10) * 1000 || 4000;
            await new Promise(r => setTimeout(r, wait));
          }

          if (optRes && optRes.ok) {
            const optData = await optRes.json();
            const improvements = (optData.changes || []).map((c: any) => ({
              section: c.section,
              before: c.before,
              after: c.after,
              impact: undefined,
            }));
            setAtsImprovements(prev => {
              const next = [...prev];
              for (const imp of improvements) {
                const isDuplicate = next.some(
                  (existing) =>
                    existing.section === imp.section &&
                    JSON.stringify(existing.before) === JSON.stringify(imp.before) &&
                    JSON.stringify(existing.after) === JSON.stringify(imp.after)
                );
                if (!isDuplicate) next.push(imp);
              }
              return next;
            });
          }
        } catch (e) {
          console.error("Section optimization failed:", section, e);
        } finally {
          setLoadingImprovementCount(prev => Math.max(0, prev - 1));
        }
        // Stagger requests to stay under RPM limits.
        await new Promise(r => setTimeout(r, 1500));
      }

      setAtsCurrentStep(null);
      showToast('Suggestions ready. Apply one or apply all to rescore.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to analyze ATS', 'error');
    } finally {
      setIsAnalyzingATS(false);
      setAtsCurrentStep(null);
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
      setAppliedChangesLog(prev => [...prev, `Improved ${improvement.section} section`]);
      setScoreIsDirty(true);
      showToast(`Applied ${improvement.section} improvement. Click "Recalculate" when ready.`, 'success');
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
      const newLogs: string[] = [];
      for (let i = 0; i < atsImprovements.length; i++) {
        if (nextApplied.has(i)) continue;
        setApplyingImprovementIndex(i);
        nextResume = applyImprovementToResume(nextResume, atsImprovements[i]);
        commitResumeData(nextResume);
        nextApplied.add(i);
        setAppliedImprovementIndices(new Set(nextApplied));
        newLogs.push(`Improved ${atsImprovements[i].section} section`);
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      setApplyingImprovementIndex(null);
      setAppliedChangesLog(prev => [...prev, ...newLogs]);
      setScoreIsDirty(true);
      showToast(`Applied all improvements. Click "Recalculate" to see new score.`, 'success');
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
      setAtsChanges(prev => prev.filter(item => item.toLowerCase() !== cleanKeyword.toLowerCase()));
      setAppliedChangesLog(prev => [...prev, `Added missing keyword: ${cleanKeyword}`]);
      setScoreIsDirty(true);
      showToast(`Added "${cleanKeyword}" to resume. Click "Recalculate" when ready.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to apply keyword', 'error');
    } finally {
      setApplyingKeyword(null);
    }
  };

  const handleRecalculateScore = async () => {
    if (isRecalculating || !jobDescription.trim()) return;
    setIsRecalculating(true);
    const oldScore = atsResult?.atsScore ?? atsScoreResult?.overall_score ?? 0;
    try {
      const currentResume = {
        name: userName, title: userRole, summary, skills, experience, education, email, phone, location
      };
      const scoreRes = await fetch('/api/ats-rescore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: currentResume, jobDescription: jobDescription.trim() })
      });
      if (!scoreRes.ok) throw new Error('ATS rescore failed');
      const scoreData = await scoreRes.json();
      const newScore = scoreData.overall_score;

      // Score guard: prevent regression
      if (newScore < oldScore) {
        showToast(`Score maintained at ${oldScore}%. Changes preserved.`, 'info');
        setScoreIsDirty(false);
        return;
      }

      setPreviousATSScore(oldScore);
      setAtsScoreResult(scoreData);
      setAtsResult((prev: any) => ({
        ...(prev || {}),
        atsScore: newScore,
        analysis: {
          ...(prev?.analysis || {}),
          atsScore: newScore,
          keywordAnalysis: {
            missingSkills: scoreData.missing_keywords || [],
            strongSkills: scoreData.found_keywords || [],
          },
        }
      }));
      setAtsChanges(scoreData.missing_keywords || []);
      setScoreIsDirty(false);
      const improvement = newScore - oldScore;
      const reasons = appliedChangesLog.length > 0 
        ? appliedChangesLog.join(', ') 
        : 'Applied changes';
      showToast(
        improvement > 0 
          ? `Score: ${oldScore}% → ${newScore}% (+${improvement}%) — ${reasons}` 
          : `Score recalculated: ${newScore}%`, 
        improvement > 0 ? 'success' : 'info'
      );
      setAppliedChangesLog([]);
    } catch (e: any) {
      showToast(e.message || 'Failed to recalculate', 'error');
    } finally {
      setIsRecalculating(false);
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
      setEstimatedScore(null);

      showToast(`Score improved to ${data.newScore || '80+'}!`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to improve resume', 'error');
    } finally {
      setIsImprovingATS(false);
    }
  };

  const handleAutoFix = async () => {
    if (!atsResult || isAutoFixing) return;
    setIsAutoFixing(true);
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
      setEstimatedScore(null);

      showToast(`Resume auto-fixed! Score improved to ${data.newScore || '80+'}%`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to auto-fix resume', 'error');
    } finally {
      setIsAutoFixing(false);
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-3xl mx-auto w-full">
            
            {/* Left side: Status & Tabs */}
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {/* Status */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 text-on-surface-variant bg-surface-container-high/40 px-2 py-1 rounded-md">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Synced</span>
                </div>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-high/40 rounded-md hover:bg-surface-container-high text-on-surface-variant transition-all"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">{versions.length}</span>
                </button>
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-outline-variant/30 hidden sm:block shrink-0" />

              {/* Tabs inline with status */}
              <div className="flex items-center bg-surface-container-high/30 rounded-lg p-0.5 shrink-0 border border-outline-variant/10">
                {([
                  { id: 'optimize' as const, label: 'Optimize', icon: Sparkles },
                  { id: 'manual-edit' as const, label: 'Manual Edit', icon: Edit3 },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all relative",
                      activeTab === tab.id
                        ? "text-primary"
                        : "text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container-higher/50"
                    )}
                  >
                    <tab.icon className="w-3 h-3 z-10" />
                    <span className="z-10">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabHeader"
                        className="absolute inset-0 bg-primary/10 rounded-md shadow-sm border border-primary/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Action groups */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Group 1: Edit History */}
              <div className="flex items-center bg-surface-container-high/30 rounded-lg p-0.5 border border-outline-variant/10">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    historyIndex > 0 ? "hover:bg-surface-container hover:text-primary text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                  )}
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    historyIndex < history.length - 1 ? "hover:bg-surface-container hover:text-primary text-on-surface-variant cursor-pointer" : "text-on-surface-variant/30 cursor-not-allowed"
                  )}
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group 2: File Actions */}
              <div className="flex items-center bg-surface-container-high/30 rounded-lg p-0.5 border border-outline-variant/10">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    isRefreshing ? "text-on-surface-variant/30 cursor-not-allowed" : "hover:bg-surface-container text-on-surface-variant hover:text-primary"
                  )}
                  title="Refresh Resume"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                </button>
                <button onClick={() => saveCurrentVersion()} className="p-1.5 hover:bg-surface-container rounded-md text-on-surface-variant hover:text-primary transition-colors" title="Save">
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group 3: Primary Actions */}
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 hover:bg-surface-container-high/50 bg-surface-container-high/30 rounded-lg text-on-surface-variant transition-colors shadow-sm border border-outline-variant/20" title="Toggle Preview">
                  {showPreview ? <PanelRightClose className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
                <Link
                  href={parseError ? "#" : "/apply"}
                  className={cn(
                    "btn-primary px-3 py-1.5 text-[11px] font-bold shadow-md hover:shadow-lg transition-all rounded-lg",
                    parseError && "opacity-50 pointer-events-none cursor-not-allowed"
                  )}
                  onClick={(e) => parseError && e.preventDefault()}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Apply</span>
                </Link>
              </div>

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
                  <div className="glass rounded-xl p-5 ai-indicator overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-inner border border-primary/10">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">AI Chat</h3>
                        <p className="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-widest mt-0.5">Optimize your resume</p>
                      </div>
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
                            className="text-[10px] px-3 py-1.5 bg-primary/5 hover:bg-primary/15 text-primary font-medium border border-primary/20 rounded-full transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Chat Input */}
                    <div className="flex items-end gap-2 bg-background border border-outline-variant/30 rounded-xl p-2.5 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
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
                  <div className="glass rounded-xl p-5 ai-indicator overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-inner border border-primary/10">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">ATS Score</h3>
                        <p className="text-[10px] font-medium text-on-surface-variant/70 uppercase tracking-widest mt-0.5">Analyze compatibility</p>
                      </div>
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
                          <span className="font-bold text-on-surface">{jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0}</span> words in JD
                        </div>
                        <div className="rounded-lg border border-outline-variant/40 bg-background/60 px-2.5 py-2">
                          <span className="font-bold text-on-surface">{skills.length}</span> resume skills
                        </div>
                        <div className="rounded-lg border border-outline-variant/40 bg-background/60 px-2.5 py-2">
                          <span className="font-bold text-on-surface">{experience.reduce((count, exp) => count + ((exp.bullets || []).length || 0), 0)}</span> resume bullets
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

                    {/* ATS Step Indicator */}
                    {isAnalyzingATS && (
                      <div className="mt-4 bg-surface-container/30 border border-outline-variant/20 rounded-xl p-5 space-y-3">
                        <div className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Analyzing Resume</div>
                        {ATS_STEPS.map((step, i) => {
                          const stepKeys = ATS_STEPS.map(s => s.key);
                          const currentIdx = atsCurrentStep ? stepKeys.indexOf(atsCurrentStep) : -1;
                          const stepIdx = stepKeys.indexOf(step.key);
                          const isDone = currentIdx > stepIdx;
                          const isActive = stepKeys.indexOf(step.key) === currentIdx;
                          return (
                            <div key={step.key} className="flex items-center gap-3">
                              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                ) : isActive ? (
                                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-outline-variant/40" />
                                )}
                              </div>
                              <span className={cn(
                                "text-xs transition-all",
                                isDone && "text-success line-through decoration-success/40",
                                isActive && "text-primary font-medium",
                                !isDone && !isActive && "text-outline-variant/60"
                              )}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
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
                          estimatedScore={estimatedScore}
                          onAutoFix={handleAutoFix}
                          autoFixing={isAutoFixing}
                          onRecalculate={handleRecalculateScore}
                          isRecalculating={isRecalculating}
                          scoreIsDirty={scoreIsDirty}
                          appliedChangesLog={appliedChangesLog}
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
                  {/* Header - Name, Title, Contact */}
                  <div className="glass rounded-xl p-4 sm:p-5">
                    <h1 className="text-xl sm:text-2xl font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { setWordedName(e.currentTarget.innerText); setUserName(e.currentTarget.innerText); }}>
                      {wordedName || userName || 'Your Name'}
                    </h1>
                    <p className="text-on-surface-variant text-xs sm:text-sm font-medium mt-1 outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { setWordedTitle(e.currentTarget.innerText); setUserRole(e.currentTarget.innerText); }}>
                      {wordedTitle || userRole || 'Professional Title'}
                    </p>
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-on-surface-variant/70">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />
                        <span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { setWordedContact(c => ({ ...c, location: e.currentTarget.innerText })); setLocation(e.currentTarget.innerText); }}>
                          {wordedContact.location || location || 'Location'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />
                        <span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { setWordedContact(c => ({ ...c, phone: e.currentTarget.innerText })); setPhone(e.currentTarget.innerText); }}>
                          {wordedContact.phone || phone || 'Phone'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />
                        <span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => { setWordedContact(c => ({ ...c, email: e.currentTarget.innerText })); setEmail(e.currentTarget.innerText); }}>
                          {wordedContact.email || email || 'Email'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />
                        <span className="outline-none" contentEditable suppressContentEditableWarning onBlur={(e) => setWordedContact(c => ({ ...c, linkedin: e.currentTarget.innerText }))}>
                          {wordedContact.linkedin || 'LinkedIn'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* WORK EXPERIENCE - First section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Work Experience</h3>
                      <button onClick={() => {
                        setWordedExperience([...wordedExperience, { company: 'Company Name', dates: 'Jun 2020 - Present', title: 'Job Title', bullets: ['Achievement with measurable results'] }]);
                      }} className="p-1 text-on-surface-variant hover:text-primary transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                    {(wordedExperience.length > 0 ? wordedExperience : experience).map((exp, i) => (
                      <div key={i} className="glass rounded-xl p-4 group hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning
                              onBlur={(e) => {
                                const n = [...wordedExperience]; if (!n[i]) return;
                                n[i].company = e.currentTarget.innerText; setWordedExperience(n);
                              }}>
                              {exp.company}
                            </h4>
                            <p className="text-xs font-semibold text-on-surface-variant mt-0.5 outline-none" contentEditable suppressContentEditableWarning
                              onBlur={(e) => {
                                const n = [...wordedExperience]; if (!n[i]) return;
                                n[i].title = e.currentTarget.innerText; setWordedExperience(n);
                              }}>
                              {exp.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-mono text-on-surface-variant/60 outline-none" contentEditable suppressContentEditableWarning
                              onBlur={(e) => {
                                const n = [...wordedExperience]; if (!n[i]) return;
                                n[i].dates = e.currentTarget.innerText; setWordedExperience(n);
                              }}>
                              {exp.dates}
                            </span>
                            <button onClick={() => setWordedExperience(wordedExperience.filter((_, idx) => idx !== i))}
                              className="p-1 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {exp.companyDescription !== undefined && (
                          <div className="text-[10px] italic text-on-surface-variant/60 outline-none mb-1" contentEditable suppressContentEditableWarning
                            onBlur={(e) => {
                              const n = [...wordedExperience]; if (!n[i]) return;
                              n[i].companyDescription = e.currentTarget.innerText; setWordedExperience(n);
                            }}>
                            {exp.companyDescription || 'Company description (optional)'}
                          </div>
                        )}
                        <ul className="list-disc ml-4 text-xs text-on-surface-variant space-y-1.5">
                          {(exp.bullets || []).map((b: string, j: number) => (
                            <li key={j} className="outline-none leading-relaxed" contentEditable suppressContentEditableWarning
                              onBlur={(e) => {
                                const n = [...wordedExperience]; if (!n[i]) return;
                                n[i].bullets[j] = e.currentTarget.innerText; setWordedExperience(n);
                              }}>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* EDUCATION - Second section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Education</h3>
                      <button onClick={() => {
                        setWordedEducation([...wordedEducation, { institution: 'University Name', degree: 'Bachelor of Science in Computer Science', graduationDate: 'May 2020' }]);
                      }} className="p-1 text-on-surface-variant hover:text-primary transition-colors">
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </div>
                    {(wordedEducation.length > 0 ? wordedEducation : education).length === 0 ? (
                      <div className="glass rounded-xl p-4 text-center text-on-surface-variant text-sm">
                        No education added yet
                      </div>
                    ) : (
                      (wordedEducation.length > 0 ? wordedEducation : education).map((edu: any, i: number) => (
                        <div key={i} className="glass rounded-xl p-4 group hover:border-primary/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-on-surface outline-none" contentEditable suppressContentEditableWarning
                                onBlur={(e) => {
                                  const n = [...wordedEducation]; n[i].institution = e.currentTarget.innerText; setWordedEducation(n);
                                }}>
                                {edu.institution || edu.school}
                              </h4>
                              <p className="text-xs text-on-surface-variant mt-0.5 outline-none" contentEditable suppressContentEditableWarning
                                onBlur={(e) => {
                                  const n = [...wordedEducation]; n[i].degree = e.currentTarget.innerText; setWordedEducation(n);
                                }}>
                                {edu.degree}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] font-mono text-on-surface-variant/60 outline-none" contentEditable suppressContentEditableWarning
                                onBlur={(e) => {
                                  const n = [...wordedEducation]; n[i].graduationDate = e.currentTarget.innerText; setWordedEducation(n);
                                }}>
                                {edu.graduationDate || edu.year}
                              </span>
                              <button onClick={() => setWordedEducation(wordedEducation.filter((_, idx) => idx !== i))}
                                className="p-1 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* SKILLS - Third section, categorized */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">Skills</h3>
                    </div>
                    {[
                      { key: 'technicalSkills', label: 'Technical Skills' },
                      { key: 'frameworks', label: 'Frameworks' },
                      { key: 'databases', label: 'Databases' },
                      { key: 'cloudDevOps', label: 'Cloud & DevOps' },
                      { key: 'industryKnowledge', label: 'Industry Knowledge' },
                    ].map((cat) => {
                      const items = (wordedSkills as any)[cat.key] as string[];
                      return (
                        <div key={cat.key} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">{cat.label}</h4>
                            <button
                              onClick={() => {
                                setWordedSkills(s => ({
                                  ...s,
                                  [cat.key]: [...(s as any)[cat.key], 'New Skill'],
                                }));
                              }}
                              className="text-[10px] text-primary hover:text-primary/80 font-medium"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {items.map((skill, i) => (
                              <div key={i} className="glass rounded-full px-3 py-1.5 flex items-center gap-2 group transition-all hover:bg-surface-container-highest">
                                <span
                                  className="text-xs font-semibold text-on-surface outline-none min-w-[40px] cursor-text"
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const val = e.currentTarget.innerText.trim();
                                    if (val) {
                                      setWordedSkills(s => ({
                                        ...s,
                                        [cat.key]: (s as any)[cat.key].map((x: string, idx: number) => idx === i ? val : x),
                                      }));
                                    } else {
                                      setWordedSkills(s => ({
                                        ...s,
                                        [cat.key]: (s as any)[cat.key].filter((_: string, idx: number) => idx !== i),
                                      }));
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                                  }}
                                >
                                  {skill}
                                </span>
                                <button
                                  onClick={() => {
                                    setWordedSkills(s => ({
                                      ...s,
                                      [cat.key]: (s as any)[cat.key].filter((_: string, idx: number) => idx !== i),
                                    }));
                                  }}
                                  className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
            <div className="h-16 px-4 flex items-center justify-between border-b border-outline-variant/30 bg-surface/50 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-1.5 glass rounded-lg p-1">
                <button onClick={() => setPreviewMode('desktop')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'desktop' ? "bg-surface-container-high text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50")}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setPreviewMode('mobile')} className={cn("p-1.5 rounded-md transition-colors", previewMode === 'mobile' ? "bg-surface-container-high text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50")}><Smartphone className="w-4 h-4" /></button>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Template Dropdown */}
                <div className="hidden sm:flex items-center glass rounded-lg px-2">
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as any)}
                    className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-on-surface py-2 border-none outline-none cursor-pointer appearance-none pr-4"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23454555%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="resumeworded">ResumeWorded</option>
                    <option value="classic">Classic</option>
                    <option value="modern">Modern</option>
                    <option value="minimalist">Minimalist</option>
                  </select>
                </div>
                
                <div className="flex items-center glass rounded-lg p-0.5">
                  <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container/50 rounded-md transition-colors"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-[11px] font-mono font-bold text-on-surface w-12 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(Math.min(120, zoom + 10))} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container/50 rounded-md transition-colors"><ZoomIn className="w-4 h-4" /></button>
                </div>
                
                <div className="hidden lg:flex items-center gap-1.5 glass rounded-lg p-1.5">
                  {['#000000', '#6367FF', '#10b981', '#8b5cf6', '#ef4444'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setResumeColor(color)}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 transition-all hover:scale-110",
                        resumeColor === color ? "border-primary scale-110 shadow-md" : "border-transparent shadow-sm"
                      )}
                      style={{ backgroundColor: color === '#000000' && resumeTheme === 'dark' ? '#ffffff' : color }}
                      title={`Accent Color ${color}`}
                    />
                  ))}
                  
                  {/* Theme Toggle */}
                  <div className="w-px h-4 bg-outline-variant/30 mx-1" />
                  <button 
                    onClick={() => setResumeTheme(resumeTheme === 'light' ? 'dark' : 'light')} 
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-md"
                    title={`Switch to ${resumeTheme === 'light' ? 'dark' : 'light'} mode`}
                  >
                    {resumeTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>
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
                {template === 'resumeworded' ? (
                  <div style={{ background: '#ffffff', borderRadius: 8, overflow: 'hidden' }}>
                    <ResumeWordedTemplate data={toWordedData()} />
                  </div>
                ) : template === 'classic' ? (
                  <ClassicTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                ) : template === 'modern' ? (
                  <ModernTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                ) : template === 'minimalist' ? (
                  <MinimalistTemplate data={resumeData} color={resumeColor} theme={resumeTheme} />
                ) : null}
              </motion.div>
            </div>

            {/* Download Action */}
            <div className="p-4 border-t border-white/5 glass-dark flex justify-center">
              <DownloadDropdown resumeData={resumeData} latex={latex} resumePreviewId="resume-preview" wordedData={toWordedData()} />
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
