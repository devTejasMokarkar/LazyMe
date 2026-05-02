"use client";

import { Target, Check, X } from "lucide-react";

interface ATSScoreCardProps {
  score: number;
  matched: string[];
  missing: string[];
}

export function ATSScoreCard({ score, matched, missing }: ATSScoreCardProps) {
  const getColor = () => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const getBg = () => {
    if (score >= 80) return "bg-green-500/10 border-green-500/30";
    if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className={`card ${getBg()}`}>
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-bold">ATS Score</h3>
        <span className={`text-2xl font-bold ml-auto ${getColor()}`}>{score}%</span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            score >= 80 ? "bg-green-400" : score >= 60 ? "bg-amber-400" : "bg-red-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {matched.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
            <Check className="w-4 h-4" /> Matched ({matched.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map(k => (
              <span key={k} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-md">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
            <X className="w-4 h-4" /> Missing ({missing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 8).map(k => (
              <span key={k} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-md">
                {k}
              </span>
            ))}
            {missing.length > 8 && (
              <span className="px-2 py-0.5 text-slate-400 text-xs">+{missing.length - 8} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
