"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  MessageSquare,
  HelpCircle,
  LogOut,
  Sparkles,
  ChevronLeft,
  Brain,
  Settings,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions';

const SIDEBAR_WIDTH = 240;
const COLLAPSED_WIDTH = 72;

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'resume', label: 'Resume Builder', icon: FileText, href: '/resume' },
    { id: 'jobs', label: 'Job Search', icon: Search, href: '/apply' },
    { id: 'interview-prep', label: 'Interview Prep', icon: Brain, href: '/interview-prep' },
  ];

  const bottomItems: Array<{
    id: string;
    label: string;
    icon: any;
    href?: string;
    action?: () => void;
  }> = [
    { id: 'support', label: 'Support', icon: HelpCircle, action: () => { } },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-16 left-0 h-[calc(100vh-64px)] z-40",
          "hidden lg:flex flex-col",
          "transition-all duration-300 ease-out",
          "glass-dark",
          "border-r",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-primary/10 before:to-transparent before:pointer-events-none"
        )}
        style={{
          width: isExpanded ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo Section */}
        <div className="relative h-16 flex items-center px-5 border-b border-outline-variant/30">
          <motion.div
            className="flex items-center gap-3 overflow-hidden"
            animate={{ opacity: 1 }}
          >
            <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="LazyMe Logo" className="w-full h-full object-contain" />
            </div>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="font-bold text-on-surface text-xl tracking-tight whitespace-nowrap">LazyMe</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"
                )}
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className={cn(
                  "shrink-0 w-5 h-5 flex items-center justify-center",
                  isActive ? "text-primary" : "text-on-surface-variant group-hover:text-primary transition-colors"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>

                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-semibold whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                <AnimatePresence>
                  {!isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -10, scale: 0.95 }}
                      className="absolute left-full ml-3 px-3 py-1.5 bg-surface-container-highest border border-outline-variant rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50"
                    >
                      <span className="text-xs font-semibold text-on-surface">{item.label}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="py-4 px-3 space-y-1.5 border-t border-outline-variant/30">
          {bottomItems.map((item) => {
            if (item.href) {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"
                  )}
                >
                  <div className="shrink-0 w-5 h-5 flex items-center justify-center group-hover:text-primary transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-semibold whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all duration-200 group"
              >
                <div className="shrink-0 w-5 h-5 flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-semibold whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}

          {/* Credit Balance Indicator */}
          <CreditBalanceBadge isExpanded={isExpanded} />

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-error/10 hover:text-error transition-all duration-200 group"
            >
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-semibold whitespace-nowrap"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>
        </div>

        {/* Collapse Indicator */}
        <div className="absolute -right-3 top-20 opacity-0 group-hover:opacity-100 transition-opacity hidden">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant shadow-md flex items-center justify-center">
            <ChevronLeft className={cn("w-4 h-4 text-on-surface-variant transition-transform", isExpanded && "rotate-180")} />
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -SIDEBAR_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_WIDTH }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed top-0 left-0 h-screen w-[240px] z-50",
              "flex flex-col",
              "glass-dark",
              "border-r",
              "lg:hidden"
            )}
          >
            <div className="h-16 flex items-center px-5 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/logo.png" alt="LazyMe Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-on-surface text-xl tracking-tight">LazyMe</span>
              </div>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"
                      />
                    )}
                    <div className={cn("shrink-0 w-5 h-5", isActive ? "text-primary" : "")}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="py-4 px-3 space-y-1.5 border-t border-outline-variant/30">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high">
                <HelpCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Support</span>
              </button>
              <Link
                href="/settings"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  pathname === '/settings'
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-semibold">Settings</span>
              </Link>
              <CreditBalanceBadge isExpanded={true} />
              <form action={signOutAction}>
                <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-on-surface-variant hover:bg-error/10 hover:text-error">
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-semibold">Logout</span>
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-6 left-6 z-30 lg:hidden w-12 h-12 rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    </>
  );
}

// ── Credit Balance Badge ──────────────────────────────────────

function CreditBalanceBadge({
  isExpanded,
}: {
  isExpanded: boolean;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/user/credits");
      if (!res.ok) return;
      const data = await res.json();
      setBalance(data.balance ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading) return null;
  if (balance === null) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
      isExpanded ? "" : "justify-center"
    )}>
      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        <Coins className={cn(
          "w-4 h-4",
          (balance ?? 0) < 10 ? "text-error" : "text-primary"
        )} />
      </div>
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={cn(
              "text-sm font-semibold whitespace-nowrap",
              (balance ?? 0) < 10 ? "text-error" : "text-on-surface-variant"
            )}
          >
            {balance} credits
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}