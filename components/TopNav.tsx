"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';
import { Bell, Menu, Sun, Moon, LayoutDashboard, BarChart3, Users } from 'lucide-react';
import { signInAction } from '@/app/actions';

export default function TopNav() {
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: 'Applications', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Network', href: '#', icon: Users },
  ];

  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-outline-variant fixed top-0 left-0 right-0 h-16 z-50 flex justify-between items-center px-6">
      <Link 
        href="/"
        className="font-bold text-xl text-on-background flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
      >
        <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(255,178,186,0.6)]"></div>
        <span>LazyMe AI</span>
      </Link>

      {status === "authenticated" && (
        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <Link 
              key={item.label} 
              href={item.href} 
              className="text-on-surface-variant hover:text-primary text-[11px] font-bold transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
            >
              <item.icon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container-high active:scale-90"
          title="Toggle Theme"
        >
          {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
          {!mounted && <div className="w-5 h-5" />}
        </button>

        {status === "authenticated" ? (
          <>
            <button className="p-2.5 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container-high">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-4 w-[1px] bg-outline-variant mx-2 opacity-50"></div>
            <div className="w-9 h-9 rounded-xl bg-surface-container-highest border border-outline-variant overflow-hidden cursor-pointer shadow-lg hover:ring-2 hover:ring-primary/20 transition-all">
               {session.user?.image ? (
                 <img 
                   src={session.user.image} 
                   alt={session.user.name || "User"} 
                   className="w-full h-full object-cover" 
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary bg-primary-container/20">
                   {session.user?.name?.charAt(0) || 'U'}
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <form action={signInAction}>
              <button type="submit" className="text-on-surface-variant font-bold text-[11px] uppercase tracking-widest hover:text-primary transition-all">Sign in</button>
            </form>
            <form action={signInAction}>
              <button type="submit" className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20">
                Get started free
              </button>
            </form>
          </div>
        )}
        <button className="md:hidden p-2 text-on-surface-variant">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
