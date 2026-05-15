import React, { useState, useEffect } from 'react';
import { Sparkles, Bell, Settings, Menu, Sun, Moon } from 'lucide-react';
import { View } from './Sidebar';

interface TopNavProps {
  currentView: View;
  setView: (view: View) => void;
}

export default function TopNav({ currentView, setView }: TopNavProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="bg-background/80 backdrop-blur-md border-b hairline-border fixed top-0 left-0 right-0 h-16 z-50 flex justify-between items-center px-6">
      <div 
        className="font-bold text-xl text-on-background flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        onClick={() => setView('landing')}
      >
        <div className="w-3 h-3 rounded-full bg-[#E31E24]"></div>
        <span>LazyMe AI</span>
      </div>

      {currentView !== 'landing' && (
        <nav className="hidden md:flex items-center gap-8">
          {['Applications', 'Analytics', 'Network'].map((item) => (
            <a 
              key={item} 
              href="#" 
              className="text-on-surface-variant hover:text-primary text-[14px] font-bold transition-all uppercase tracking-wider"
            >
              {item}
            </a>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container-high active:scale-90"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {currentView !== 'landing' ? (
          <>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-4 w-[0.5px] bg-outline-variant mx-2"></div>
            <div className="w-8 h-8 rounded-full bg-surface-container-highest hairline-border overflow-hidden cursor-pointer">
               <img 
                 src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" 
                 alt="User" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
               />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant font-bold text-[14px] hover:text-primary transition-all">Sign in</button>
            <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-bold text-[14px] hover:brightness-110 active:scale-95 transition-all">
              Get started free
            </button>
          </div>
        )}
        <button className="md:hidden text-on-surface-variant">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
