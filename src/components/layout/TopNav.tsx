"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { Menu, Sun, Moon, Sparkles, X } from 'lucide-react';
import { signInAction } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopNav() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-40 flex justify-between items-center px-4 lg:pl-20 glass-dark border-b">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="font-bold text-lg text-primary flex items-center gap-2 cursor-pointer hover:text-primary/80 transition-colors -ml-4"
        >
          <img src={mounted && theme === 'dark' ? "/LazyMeMoon.png" : "/LazyMe.png"} alt="LazyMe Logo" className="w-32 h-32 object-contain" />
          {/* <span className="hidden sm:inline text-xl font-bold">LazyMe</span> */}
        </Link>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Theme Toggle - Cleaner Design */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-all"
          title="Toggle Theme"
        >
          <AnimatePresence mode="wait">
            {mounted && (
              <motion.div
                key={theme === 'dark' ? 'moon' : 'sun'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4.5 h-4.5" />
                ) : (
                  <Moon className="w-4.5 h-4.5" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {(status === "authenticated" && session) ? (
          <>
            {/* User Avatar */}
            <div className="h-8 w-8 rounded-lg glass border border-outline-variant overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session?.user?.name || "User"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary bg-primary-container/30">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <form action={signInAction}>
              <button type="submit" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
                Sign in
              </button>
            </form>

          </div>
        )}

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-all"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 lg:hidden glass-dark border-b p-4 shadow-xl"
          >
            <div className="flex flex-col gap-2">
              <Link href="/resume" className="px-4 py-3 rounded-lg text-on-background hover:bg-surface-container-high font-medium">
                Resume Builder
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
