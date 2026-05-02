"use client";

import { useEffect, useState } from "react";
import { Sparkles, Brain, Search, CheckCircle2 } from "lucide-react";

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = [
    { text: "Analyzing your profile...", icon: <Search className="w-5 h-5" /> },
    { text: "Crafting professional experience...", icon: <Brain className="w-5 h-5" /> },
    { text: "Finalizing LaTeX layout...", icon: <CheckCircle2 className="w-5 h-5" /> },
    { text: "Almost ready...", icon: <Sparkles className="w-5 h-5" /> }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[100] animate-in fade-in duration-500">
      <div className="relative">
        {/* Animated Rings */}
        <div className="absolute inset-0 w-32 h-32 border-4 border-primary/20 rounded-full animate-ping"></div>
        <div className="absolute inset-0 w-32 h-32 border-4 border-primary/10 rounded-full animate-pulse"></div>
        
        {/* Main Spinner */}
        <div className="w-32 h-32 border-t-4 border-l-4 border-primary border-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
        
        {/* Icon in Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          LazyMe AI is working...
        </h2>
        <div className="flex items-center justify-center gap-3 text-slate-400 h-8">
          <span className="text-primary animate-bounce">
            {messages[messageIndex].icon}
          </span>
          <p className="text-lg font-medium transition-all duration-500">
            {messages[messageIndex].text}
          </p>
        </div>
      </div>

      {/* Progress bar simulation */}
      <div className="mt-8 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${((messageIndex + 1) / messages.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
