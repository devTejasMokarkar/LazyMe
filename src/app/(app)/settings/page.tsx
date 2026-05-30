"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Key,
  Coins,
  User,
  Sparkles,
  Linkedin,
  Github,
  Globe,
  Save,
  Loader2,
  Briefcase,
  Quote,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/layout/ToastProvider";
import ApiKeyManager from "@/components/settings/ApiKeyManager";
import CreditsDashboard from "@/components/settings/CreditsDashboard";
import PaymentModal from "@/components/settings/PaymentModal";

const TABS = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "credits", label: "Credits", icon: Coins },
  { id: "profile", label: "Profile", icon: User },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showPayment, setShowPayment] = useState(false);
  const [creditsRefetchTrigger, setCreditsRefetchTrigger] = useState(0);

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (activeTab !== "profile" || profile) return;
    setProfileLoading(true);
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (d.profile) setProfile(d.profile); })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [activeTab, profile]);

  function handleBuyCredits() {
    setShowPayment(true);
  }

  function handlePaymentSuccess(credits: number) {
    setCreditsRefetchTrigger((p) => p + 1);
  }

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 shadow-lg">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-on-surface-variant font-medium">Configure your API keys, credits, and profile</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/20 w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "text-on-surface bg-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-tab-bg"
                    className="absolute inset-0 rounded-xl bg-surface shadow-sm border border-outline-variant/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "api-keys" && <ApiKeyManager />}
            {activeTab === "credits" && (
              <CreditsDashboard
                key={creditsRefetchTrigger}
                onBuyCredits={handleBuyCredits}
              />
            )}
            {activeTab === "profile" && (
              <ProfileForm
                profile={profile}
                setProfile={setProfile}
                loading={profileLoading}
                saving={profileSaving}
                setSaving={setProfileSaving}
                showToast={showToast}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

function ProfileForm({
  profile, setProfile, loading, saving, setSaving, showToast,
}: {
  profile: any;
  setProfile: (p: any) => void;
  loading: boolean;
  saving: boolean;
  setSaving: (s: boolean) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: profile.bio,
          jobTitle: profile.jobTitle,
          preferredName: profile.preferredName,
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          portfolioUrl: profile.portfolioUrl,
        }),
      });
      if (res.ok) {
        showToast("Profile saved", "success");
      } else {
        showToast("Failed to save profile", "error");
      }
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, val: string) =>
    setProfile({ ...profile, [key]: val });

  const fields = [
    { key: "preferredName", label: "Preferred Name", icon: AtSign, placeholder: "How should we call you?" },
    { key: "jobTitle", label: "Job Title / Role", icon: Briefcase, placeholder: "e.g. Senior Software Engineer" },
    { key: "bio", label: "Bio / Tagline", icon: Quote, placeholder: "A short bio or tagline...", textarea: true },
    { key: "linkedinUrl", label: "LinkedIn URL", icon: Linkedin, placeholder: "https://linkedin.com/in/..." },
    { key: "githubUrl", label: "GitHub URL", icon: Github, placeholder: "https://github.com/..." },
    { key: "portfolioUrl", label: "Portfolio URL", icon: Globe, placeholder: "https://..." },
  ];

  if (loading) {
    return (
      <div className="p-8 rounded-2xl border border-outline-variant/20 bg-surface-container-low flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-outline-variant/10">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0 overflow-hidden">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold truncate">{profile?.fullName || "User"}</h3>
          <p className="text-sm text-on-surface-variant truncate">{profile?.email}</p>
          <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
            Name, email, and avatar sync from your Google account
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {fields.map((f) => {
          const value = profile?.[f.key] || "";
          const hasValue = !!profile?.[f.key];
          return (
            <div key={f.key} className={cn(!hasValue && "opacity-40 hover:opacity-100 transition-opacity")}>
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </label>
              {f.textarea ? (
                <textarea
                  value={value}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full bg-background border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-background placeholder:text-on-surface-variant/30 outline-none focus:ring-1 focus:ring-primary resize-none transition-all"
                />
              ) : (
                <input
                  type="url"
                  value={value}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder + (hasValue ? "" : " (empty — click to add)")}
                  className="w-full bg-background border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-background placeholder:text-on-surface-variant/30 outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-outline-variant/10 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
