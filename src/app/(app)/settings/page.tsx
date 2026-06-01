"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Key,
  Coins,
  User,
  Sparkles,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/layout/ToastProvider";
import ApiKeyManager from "@/components/settings/ApiKeyManager";
import CreditsDashboard from "@/components/settings/CreditsDashboard";
import ApplicationProfile from "@/components/settings/ApplicationProfile";
import SessionsList from "@/components/settings/SessionsList";
import PaymentModal from "@/components/settings/PaymentModal";

const TABS = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "credits", label: "Credits", icon: Coins },
  { id: "profile", label: "Profile", icon: User },
  { id: "sessions", label: "Sessions", icon: Monitor },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showPayment, setShowPayment] = useState(false);
  const [creditsRefetchTrigger, setCreditsRefetchTrigger] = useState(0);

  const { showToast } = useToast();

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
              <ApplicationProfile />
            )}
            {activeTab === "sessions" && (
              <SessionsList />
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


