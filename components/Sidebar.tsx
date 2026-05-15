"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3, FileText, MessageSquare, Settings, HelpCircle, LogOut, Kanban, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions';

export default function Sidebar() {
  const pathname = usePathname();

  const items = [
    { id: 'dashboard', label: 'Discovery', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'board', label: 'Kanban Board', icon: Kanban, href: '/board' },
    { id: 'resume', label: 'Resume Builder', icon: FileText, href: '/resume' },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, href: '/chat' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <aside className="bg-surface-container-low border-r border-outline-variant fixed left-0 top-16 h-[calc(100vh-64px)] w-[240px] hidden md:flex flex-col py-8 gap-10 z-40 shadow-2xl">
      <div className="px-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-on-surface font-black text-2xl tracking-tighter">LazyMe</h2>
          <div className="px-2 py-0.5 bg-primary/10 rounded-md">
            <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" />
          </div>
        </div>
        <p className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">Operations Center</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "w-full px-5 py-3 rounded-2xl flex items-center gap-4 transition-all group relative overflow-hidden",
              pathname === item.href 
                ? "bg-primary text-on-primary font-bold shadow-xl shadow-primary/20" 
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform group-hover:scale-110",
              pathname === item.href ? "text-on-primary" : "text-on-surface-variant group-hover:text-primary"
            )} />
            <span className="text-[11px] uppercase font-bold tracking-widest">{item.label}</span>
            {pathname === item.href && (
              <motion.div 
                layoutId="active-pill"
                className="absolute left-0 w-1 h-6 bg-white rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-auto px-4 pb-8 space-y-2">
        <button className="w-full px-5 py-3 flex items-center gap-4 text-on-surface-variant hover:bg-surface-container-high rounded-2xl transition-all group">
          <HelpCircle className="w-5 h-5 group-hover:text-primary transition-colors" />
          <span className="text-[11px] uppercase font-bold tracking-widest">Support</span>
        </button>
        <form action={signOutAction} className="w-full">
          <button type="submit" className="w-full px-5 py-3 flex items-center gap-4 text-on-surface-variant hover:bg-red-400/10 hover:text-red-400 rounded-2xl transition-all group">
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[11px] uppercase font-bold tracking-widest">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
