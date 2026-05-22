import { CheckCircle, XCircle } from "lucide-react";

interface OldATSFormat {
  score: number;
  matched: string[];
  missing: string[];
}

interface NewATSFormat {
  score: number;
  breakdown: {
    skillsMatch: number;
    experienceRelevance: number;
    keywordCoverage: number;
    roleAlignment: number;
    formattingClarity: number;
  };
  keywordAnalysis: {
    missingSkills: string[];
    weakSkills: string[];
    strongSkills: string[];
  };
}

interface ATSScoreCardProps {
  data: OldATSFormat | NewATSFormat;
  onImprove?: () => void;
  improving?: boolean;
  changes?: string[];
  previousScore?: number | null;
  analysis?: {
    gapAnalysis?: string;
    actionableImprovements?: string[];
  };
}

export function ATSScoreCard({ data, onImprove, improving, changes, previousScore, analysis }: ATSScoreCardProps) {
  const score = data.score;
  const missingKeywords = 'missing' in data ? data.missing : data.keywordAnalysis.missingSkills;
  const strongSkills = 'keywordAnalysis' in data ? data.keywordAnalysis.strongSkills : ('matched' in data ? data.matched : []);
  const breakdown = 'breakdown' in data ? data.breakdown : null;

  return (
    <div className="bg-surface-container/50 border border-outline-variant rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" /> ATS Compatibility
        </h3>
        {onImprove && score < 100 && (
          <button 
            onClick={onImprove}
            disabled={improving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-bold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {improving ? "Improving..." : "Improve Resume"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-5xl font-black text-primary">{score}%</div>
        <div className="space-y-1">
          <div className="text-sm font-medium text-on-surface-variant">Match with job description</div>
          {previousScore != null && (
            <div className="text-xs text-success font-medium flex items-center gap-1">
              Improved from {previousScore}%
            </div>
          )}
          {score < 70 && !previousScore && (
            <div className="text-xs text-warning font-medium">
              Your resume can be improved. Click "Improve Resume".
            </div>
          )}
        </div>
      </div>

      {breakdown && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Score Breakdown</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Skills Match:</span>
              <span className="text-on-surface font-medium">{breakdown.skillsMatch}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Experience:</span>
              <span className="text-on-surface font-medium">{breakdown.experienceRelevance}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Keywords:</span>
              <span className="text-on-surface font-medium">{breakdown.keywordCoverage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Role Alignment:</span>
              <span className="text-on-surface font-medium">{breakdown.roleAlignment}%</span>
            </div>
          </div>
        </div>
      )}
      
      {changes && changes.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50 space-y-3">
          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" /> Changes Made
          </h4>
          <ul className="space-y-2">
            {changes.map((c, i) => (
              <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                <span className="text-success mt-0.5">•</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.gapAnalysis && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Gap Analysis</h4>
          <p className="text-sm text-on-surface-variant">{analysis.gapAnalysis}</p>
        </div>
      )}

      {analysis?.actionableImprovements && analysis.actionableImprovements.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Actionable Improvements</h4>
          <ul className="space-y-2">
            {analysis.actionableImprovements.slice(0, 5).map((improvement, i) => (
              <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                 <span className="text-tertiary mt-0.5">→</span> {improvement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingKeywords && missingKeywords.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-error" /> Missing Keywords
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.slice(0, 12).map((w, i) => (
              <span key={i} className="px-2 py-1 bg-error/10 text-error text-xs rounded border border-error/20">{w}</span>
            ))}
            {missingKeywords.length > 12 && (
              <span className="px-2 py-1 text-on-surface-variant/50 text-xs rounded border border-outline-variant">+{missingKeywords.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {strongSkills && strongSkills.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" /> Strong Matches
          </h4>
          <div className="flex flex-wrap gap-2">
            {strongSkills.slice(0, 8).map((w, i) => (
              <span key={i} className="px-2 py-1 bg-success/10 text-success text-xs rounded border border-success/20">{w}</span>
            ))}
            {strongSkills.length > 8 && (
              <span className="px-2 py-1 text-on-surface-variant/50 text-xs rounded border border-outline-variant">+{strongSkills.length - 8} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
