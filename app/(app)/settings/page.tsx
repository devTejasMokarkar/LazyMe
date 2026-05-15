"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Construction, Shield, User, Bell } from 'lucide-react';

export default function SettingsPage() {
  const sections = [
    { label: 'Profile', icon: User, desc: 'Manage your professional data' },
    { label: 'Security', icon: Shield, desc: 'API keys & Auth settings' },
    { label: 'Notifications', icon: Bell, desc: 'Interview & Match alerts' },
  ];

  return (
    <div className="flex-1 p-12 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-6 mb-12">
        <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center border border-outline-variant shadow-xl">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-on-surface-variant font-medium">Configure your LazyMe experience.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section) => (
          <div key={section.label} className="group bg-surface border border-outline-variant rounded-3xl p-8 hover:bg-surface-container-low transition-all cursor-pointer opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <section.icon className="w-6 h-6 text-on-surface-variant" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{section.label}</h3>
                  <p className="text-on-surface-variant font-medium">{section.desc}</p>
                </div>
              </div>
              <Construction className="w-5 h-5 text-outline-variant" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] flex flex-col items-center text-center opacity-40">
        <Construction className="w-10 h-10 mb-4" />
        <h4 className="text-lg font-bold">Preferences Under Construction</h4>
        <p className="text-sm font-medium max-w-xs">Custom AI agents and deep-integration settings are being finalized.</p>
      </div>
    </div>
  );
}
