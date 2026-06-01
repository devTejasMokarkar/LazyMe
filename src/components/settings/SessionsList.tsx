"use client";

import { useState, useEffect } from "react";
import { Mail, Clock, ChevronDown, Loader2, User } from "lucide-react";

interface LoginEntry {
  id: string;
  createdAt: string;
}

interface UserInfo {
  name: string | null;
  email: string | null;
  image: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function SessionsList() {
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/auth/sessions")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.activities || []);
        setUserInfo(d.user || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const display = showAll ? entries : entries.slice(0, 5);

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low overflow-hidden">
      {/* Current user card */}
      {userInfo && (
        <div className="flex items-center gap-4 px-6 py-5 border-b border-outline-variant/10">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-primary/20">
            {userInfo.image ? (
              <img src={userInfo.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-background truncate">
                {userInfo.name || "User"}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700 shrink-0">
                Active
              </span>
            </div>
            <p className="text-xs text-on-surface-variant truncate">{userInfo.email}</p>
          </div>
        </div>
      )}

      {/* Login history */}
      <div className="px-6 py-3 border-b border-outline-variant/10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
          Login History
        </h3>
      </div>

      {entries.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Mail className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/30" />
          <p className="text-sm text-on-surface-variant">No login history yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/10">
          {display.map((entry, idx) => (
            <div key={entry.id} className="flex items-center gap-3 px-6 py-3">
              <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-background truncate">
                  {userInfo?.email || "Signed in"}
                </p>
                <p className="text-xs text-on-surface-variant/60">
                  {idx === 0 ? "Current session" : "Previous sign-in"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/50 shrink-0">
                <Clock className="w-3 h-3" />
                {timeAgo(entry.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1.5 px-6 py-3 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors border-t border-outline-variant/10"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Show less" : `Show all (${entries.length})`}
        </button>
      )}
    </div>
  );
}
