"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Construction } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full bg-dot-grid">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <div className="w-20 h-20 bg-primary-container/20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-xl">
          <BarChart3 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">AI Analytics</h1>
        <p className="text-on-surface-variant font-medium mb-8 leading-relaxed">
          We're training our models to provide deep insights into your market value and application performance. Check back soon.
        </p>
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant text-xs font-bold uppercase tracking-widest">
          <Construction className="w-4 h-4" />
          Feature in development
        </div>
      </motion.div>
    </div>
  );
}
