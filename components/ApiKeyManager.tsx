"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Shield, Trash2, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  provider: string;
  isActive: boolean;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.5 Flash — Fast & free tier available",
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "✦",
    placeholder: "AIzaSy...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access 100+ models with one key",
    color: "from-purple-500 to-pink-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    icon: "⚡",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o Mini — Reliable & fast",
    color: "from-emerald-500 to-green-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: "◈",
    placeholder: "sk-proj-...",
  },
];

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/user/api-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function saveKey(provider: string) {
    if (!newKeyValue.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: newKeyValue.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`${provider} key added successfully!`);
      setAddingProvider(null);
      setNewKeyValue("");
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || "Failed to save key");
    } finally {
      setSaving(false);
    }
  }

  async function deleteKey(provider: string) {
    setDeleting(provider);
    try {
      await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      setSuccess(`${provider} key removed`);
      await fetchKeys();
    } catch {
      setError("Failed to remove key");
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-on-surface">Bring Your Own Key (BYOK)</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Add your own API keys to use AI features for free — no credits deducted. Keys are encrypted and never shared.
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-error/10 border border-error/30 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span className="text-sm text-error">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-error/60 hover:text-error text-xs">✕</button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-sm text-green-500">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider Cards */}
      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const existingKey = keys.find((k) => k.provider === provider.id);
          const isAdding = addingProvider === provider.id;

          return (
            <motion.div
              key={provider.id}
              layout
              className={cn(
                "rounded-2xl border overflow-hidden transition-all duration-300",
                existingKey
                  ? `${provider.borderColor} ${provider.bgColor}`
                  : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
              )}
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
                      existingKey
                        ? `bg-gradient-to-br ${provider.color} text-white shadow-lg`
                        : "bg-surface-container-highest text-on-surface-variant"
                    )}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface flex items-center gap-2">
                      {provider.name}
                      {existingKey && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">{provider.description}</p>
                    {existingKey?.lastUsedAt && (
                      <p className="text-xs text-on-surface-variant/60 mt-0.5">
                        Last used: {new Date(existingKey.lastUsedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {existingKey ? (
                    <button
                      onClick={() => deleteKey(provider.id)}
                      disabled={deleting === provider.id}
                      className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                    >
                      {deleting === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingProvider(isAdding ? null : provider.id);
                        setNewKeyValue("");
                        setError(null);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                        isAdding
                          ? "bg-surface-container-highest text-on-surface-variant"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isAdding ? "Cancel" : "Add Key"}
                    </button>
                  )}
                </div>
              </div>

              {/* Add Key Form */}
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-2 border-t border-outline-variant/20">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showKey ? "text" : "password"}
                            value={newKeyValue}
                            onChange={(e) => setNewKeyValue(e.target.value)}
                            placeholder={provider.placeholder}
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface-container-highest border border-outline-variant/30 text-on-surface text-sm font-mono placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                            onKeyDown={(e) => e.key === "Enter" && saveKey(provider.id)}
                          />
                          <button
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface-variant"
                          >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={() => saveKey(provider.id)}
                          disabled={saving || !newKeyValue.trim()}
                          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Validating...
                            </>
                          ) : (
                            <>
                              <Key className="w-4 h-4" /> Save
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-on-surface-variant/60 mt-2">
                        Key will be validated with a test call before saving. Encrypted at rest.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
