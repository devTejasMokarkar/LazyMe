import { CheckCircle, XCircle } from "lucide-react";

interface ATSScoreCardProps {
  data: {
    score: number;
    matched: string[];
    missing: string[];
  };
}

export function ATSScoreCard({ data }: ATSScoreCardProps) {
  return (
    <div className="bg-[#1e293b]/50 border border-slate-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-primary" /> ATS Compatibility
      </h3>
      <div className="flex items-center gap-4">
        <div className="text-4xl font-black text-primary">{data.score}%</div>
        <div className="text-sm text-slate-400">Match with job description</div>
      </div>
      
      {data.missing.length > 0 && (
        <div className="pt-4 border-t border-slate-800/50">
          <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Missing Keywords</h4>
          <div className="flex flex-wrap gap-2">
            {data.missing.slice(0, 8).map((w, i) => (
              <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">{w}</span>
            ))}
            {data.missing.length > 8 && (
              <span className="px-2 py-1 text-slate-500 text-xs rounded border border-slate-700">+{data.missing.length - 8} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
