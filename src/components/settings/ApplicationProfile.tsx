"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Briefcase, Plus, X, Linkedin, Github,
  GraduationCap, Hash, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lazyme_app_profile";

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface AppProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  jobTitle: string;
  totalExperience: string;
  currentCtc: string;
  expectedCtc: string;
  noticePeriod: string;
  skills: string[];
  education: Education[];
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
}

const EMPTY_PROFILE: AppProfile = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  company: "",
  jobTitle: "",
  totalExperience: "",
  currentCtc: "",
  expectedCtc: "",
  noticePeriod: "",
  skills: [],
  education: [],
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
};

function loadProfile(): AppProfile {
  if (typeof window === "undefined") return { ...EMPTY_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {}
  return { ...EMPTY_PROFILE };
}

function saveProfile(profile: AppProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export default function ApplicationProfile() {
  const [profile, setProfile] = useState<AppProfile>(loadProfile);
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const persist = useCallback((next: AppProfile) => {
    setProfile(next);
    setSaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveProfile(next);
      setSaving(false);
    }, 400);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);

  const update = (key: keyof AppProfile, val: any) =>
    persist({ ...profile, [key]: val });

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || profile.skills.includes(s)) return;
    persist({ ...profile, skills: [...profile.skills, s] });
    setSkillInput("");
  };

  const removeSkill = (skill: string) =>
    persist({ ...profile, skills: profile.skills.filter((s) => s !== skill) });

  const addEducation = () =>
    persist({
      ...profile,
      education: [...profile.education, { degree: "", institution: "", year: "" }],
    });

  const removeEducation = (idx: number) =>
    persist({
      ...profile,
      education: profile.education.filter((_, i) => i !== idx),
    });

  const updateEducation = (idx: number, key: keyof Education, val: string) => {
    const next = [...profile.education];
    next[idx] = { ...next[idx], [key]: val };
    persist({ ...profile, education: next });
  };

  const fieldClass =
    "h-10 w-full rounded-md border border-outline-variant/30 bg-background px-3 text-sm text-on-background placeholder:text-on-surface-variant/30 outline-none focus:ring-1 focus:ring-primary transition-all";

  const Section = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className="border border-outline-variant/15 rounded-xl bg-surface-container-low/40 p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm text-on-surface-variant/60">
        <BadgeCheck className="w-4 h-4 text-green-500" />
        {saving ? (
          <span className="text-primary/60">Saving to browser...</span>
        ) : (
          <span>Saved to browser &mdash; Chrome will autofill supported fields</span>
        )}
      </div>

      {/* ── Personal ── */}
      <Section title="Personal Information" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Full Name</label>
            <input
              value={profile.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              autoComplete="name"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Email</label>
            <input
              value={profile.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone</label>
            <input
              value={profile.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">City / Location</label>
            <input
              value={profile.address}
              onChange={(e) => update("address", e.target.value)}
              autoComplete="address-level2"
              className={fieldClass}
            />
          </div>
        </div>
      </Section>

      {/* ── Work ── */}
      <Section title="Work Details" icon={Briefcase}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Company</label>
            <input
              value={profile.company}
              onChange={(e) => update("company", e.target.value)}
              autoComplete="organization"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Job Title</label>
            <input
              value={profile.jobTitle}
              onChange={(e) => update("jobTitle", e.target.value)}
              autoComplete="organization-title"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Total Exp (years)</label>
            <input
              value={profile.totalExperience}
              onChange={(e) => update("totalExperience", e.target.value)}
              className={fieldClass}
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Current CTC</label>
            <input
              value={profile.currentCtc}
              onChange={(e) => update("currentCtc", e.target.value)}
              className={fieldClass}
              placeholder="e.g. 12 LPA"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Expected CTC</label>
            <input
              value={profile.expectedCtc}
              onChange={(e) => update("expectedCtc", e.target.value)}
              className={fieldClass}
              placeholder="e.g. 18 LPA"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Notice Period</label>
            <input
              value={profile.noticePeriod}
              onChange={(e) => update("noticePeriod", e.target.value)}
              className={fieldClass}
              placeholder="e.g. 30 days"
            />
          </div>
        </div>
      </Section>

      {/* ── Skills ── */}
      <Section title="Skills" icon={Hash}>
        <div className="flex flex-wrap gap-2 mb-3">
          {profile.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="hover:text-error transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            className={cn(fieldClass, "flex-1")}
            placeholder="Type a skill and press Enter"
          />
          <button
            type="button"
            onClick={addSkill}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {/* ── Education ── */}
      <Section title="Education" icon={GraduationCap}>
        <div className="space-y-3">
          {profile.education.map((edu, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end"
            >
              <div>
                <label className="block text-xs text-on-surface-variant mb-0.5">Degree</label>
                <input
                  value={edu.degree}
                  onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                  className={fieldClass}
                  placeholder="B.Tech"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-0.5">Institution</label>
                <input
                  value={edu.institution}
                  onChange={(e) => updateEducation(idx, "institution", e.target.value)}
                  className={fieldClass}
                  placeholder="VIT"
                />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-0.5">Year</label>
                <input
                  value={edu.year}
                  onChange={(e) => updateEducation(idx, "year", e.target.value)}
                  className={fieldClass}
                  placeholder="2022"
                />
              </div>
              <button
                type="button"
                onClick={() => removeEducation(idx)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEducation}
            className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Education
          </button>
        </div>
      </Section>

      {/* ── Links ── */}
      <Section title="Profile Links" icon={Linkedin}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">LinkedIn</label>
            <input
              value={profile.linkedinUrl}
              onChange={(e) => update("linkedinUrl", e.target.value)}
              className={fieldClass}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">GitHub</label>
            <input
              value={profile.githubUrl}
              onChange={(e) => update("githubUrl", e.target.value)}
              className={fieldClass}
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Portfolio</label>
            <input
              value={profile.portfolioUrl}
              onChange={(e) => update("portfolioUrl", e.target.value)}
              className={fieldClass}
              placeholder="https://..."
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
