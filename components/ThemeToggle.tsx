"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest transition-all"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-primary" />}
    </button>
  );
}
