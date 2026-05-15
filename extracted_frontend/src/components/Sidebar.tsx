import React from 'react';
import { LayoutDashboard, BarChart3, FileText, MessageSquare, Settings, HelpCircle, LogOut } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type View = 'dashboard' | 'resume' | 'board' | 'chat' | 'landing';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const items = [
    { id: 'dashboard', label: 'Applications', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resume', label: 'Resume Builder', icon: FileText },
    { id: 'chat', label: 'Discovery Chat', icon: MessageSquare },
    { id: 'board', label: 'Kanban Board', icon: LayoutDashboard }, // Using same for board in demo
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="bg-surface-container-low border-r hairline-border fixed left-0 top-16 h-[calc(100vh-64px)] w-[240px] hidden md:flex flex-col py-6 gap-6 z-40">
      <div className="px-6 mb-4">
        <h2 className="text-primary font-bold text-xl uppercase tracking-tight">Dashboard</h2>
        <p className="text-on-surface-variant text-[11px] uppercase tracking-widest font-medium opacity-70">Application Engine</p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "w-[calc(100%-16px)] mx-2 px-4 py-2 rounded-lg flex items-center gap-3 transition-all",
              currentView === item.id
                ? "bg-primary-container text-on-primary-container font-bold shadow-lg"
                : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[11px] uppercase font-bold tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t hairline-border">
        <button className="w-[calc(100%-16px)] mx-2 px-4 py-2 flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
          <HelpCircle className="w-5 h-5" />
          <span className="text-[11px] uppercase font-bold tracking-wider">Help</span>
        </button>
        <button className="w-[calc(100%-16px)] mx-2 px-4 py-2 flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-[11px] uppercase font-bold tracking-wider">Logout</span>
        </button>
      </div>
    </aside>
  );
}
