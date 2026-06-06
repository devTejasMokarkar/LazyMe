import React from "react";
import { CheckCircle, XCircle, Lightbulb, TrendingUp, ArrowRight, HelpCircle, Sparkles, RefreshCw, Loader2 } from "lucide-react";

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
  onApplyKeyword?: (keyword: string) => void;
  applyingKeyword?: string | null;
  improving?: boolean;
  changes?: string[];
  previousScore?: number | null;
  analysis?: {
    gapAnalysis?: string;
    actionableImprovements?: string[];
  };
  estimatedScore?: number | null;
  onAutoFix?: () => void;
  autoFixing?: boolean;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
  scoreIsDirty?: boolean;
  appliedChangesLog?: string[];
}

function formatItem(item: any): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && item.section) {
    const section = String(item.section);
    if (item.after) {
      const after = String(item.after).trim();
      if (section === 'Skills' || section === 'skills') {
        const newItems = after.replace(/^\[.*?\]\s*/, '').replace(/^["[]+/, '').replace(/["[\]]+$/, '');
        return `Add to ${section}: ${newItems.slice(0, 120)}`;
      }
      if (section === 'Summary' || section === 'summary') {
        return `Rewrite ${section}: ${after.slice(0, 120)}...`;
      }
      if (section === 'Experience' || section === 'experience') {
        const lines = after.split('\n').filter(Boolean);
        return lines.length > 1 ? `Rewrite bullet to: ${lines[lines.length - 1].slice(0, 120)}` : `Update ${section} bullet: ${after.slice(0, 120)}`;
      }
      return `[${section}] ${after.slice(0, 120)}`;
    }
    return `[${section}] Update content`;
  }
  return String(item);
}

function formatImprovement(item: any): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    if (item.section && item.after && item.before) {
      const section = String(item.section);
      const after = String(item.after).trim();
      if (section === 'Skills' || section === 'skills') {
        const added = after.replace(/^\[.*?\]\s*/, '').replace(/^\[|\]$/g, '').split(', ').slice(-3).join(', ');
        return `Add missing skills: ${added}`;
      }
      if (section === 'Summary' || section === 'summary') {
        return `Rewrite summary to include ${after.split(' ').slice(-5).join(' ')}`;
      }
      if (section === 'Experience' || section === 'experience') {
        const lines = after.split('\n').filter(Boolean);
        const lastBullet = lines[lines.length - 1]?.replace(/^[•\-\*]\s*/, '') || '';
        return `Enhance experience bullet: ${lastBullet.slice(0, 120)}`;
      }
      return `[${section}] ${after.slice(0, 120)}`;
    }
    return JSON.stringify(item);
  }
  return String(item);
}

export function ATSScoreCard({
  data, onImprove, onApplyKeyword, applyingKeyword, improving, changes, previousScore,
  analysis, estimatedScore, onAutoFix, autoFixing,
  onRecalculate, isRecalculating, scoreIsDirty, appliedChangesLog
}: ATSScoreCardProps) {
  const score = data.score;
  const missingKeywords = 'missing' in data ? data.missing : data.keywordAnalysis.missingSkills;
  const strongSkills = 'keywordAnalysis' in data ? data.keywordAnalysis.strongSkills : ('matched' in data ? data.matched : []);
  const breakdown = 'breakdown' in data ? data.breakdown : null;
  const [showLearnATS, setShowLearnATS] = React.useState(false);

  return (
    <div className="bg-surface-container/50 border border-outline-variant rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" /> ATS Compatibility
        </h3>
        {onImprove && score < 100 && !onAutoFix && (
          <button 
            onClick={onImprove}
            disabled={improving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-bold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {improving ? "Improving..." : "Improve Resume"}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <div className="text-4xl sm:text-5xl font-black text-primary">{score}%</div>
        <div className="space-y-1">
          <div className="text-sm font-medium text-on-surface-variant">Match with job description</div>
          {previousScore != null && previousScore !== score && (
            <div className={`text-xs font-medium flex items-center gap-1 ${score > previousScore ? 'text-success' : 'text-on-surface-variant'}`}>
              <TrendingUp className="w-3 h-3" />
              {score > previousScore
                ? `+${score - previousScore}% improvement (was ${previousScore}%)`
                : `Recalculated from ${previousScore}%`}
            </div>
          )}
          {score < 70 && !previousScore && (
            <div className="text-xs text-warning font-medium">
              Add the missing keywords or apply suggested changes.
            </div>
          )}
        </div>
      </div>

      {/* Applied Changes Log — shows what user did since last score */}
      {appliedChangesLog && appliedChangesLog.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
          <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">Pending Changes ({appliedChangesLog.length})</h4>
          <ul className="space-y-1">
            {appliedChangesLog.map((log, i) => (
              <li key={i} className="text-xs text-on-surface-variant flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">+</span> {log}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recalculate Score Button — only when changes are pending */}
      {onRecalculate && scoreIsDirty && (
        <button
          onClick={onRecalculate}
          disabled={isRecalculating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 text-on-primary text-sm font-bold rounded-lg transition-all disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {isRecalculating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Recalculating Score...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Recalculate ATS Score
            </>
          )}
        </button>
      )}

      {/* Recalculating Skeleton */}
      {isRecalculating && (
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center gap-3 p-4 bg-surface-container rounded-lg border border-outline-variant/20">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 bg-surface-container-high rounded" />
              <div className="h-2 w-1/2 bg-surface-container-high rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Missing Keywords - Prominent Section */}
      {missingKeywords && missingKeywords.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-error" /> Missing Keywords
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.slice(0, 12).map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 bg-error/10 text-error text-xs rounded border border-error/20">
                {w}
                {onApplyKeyword && (
                  <button
                    type="button"
                    onClick={() => onApplyKeyword(w)}
                    disabled={applyingKeyword === w}
                    className="rounded border border-error/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider hover:bg-error/10 disabled:opacity-50"
                  >
                    {applyingKeyword === w ? 'Adding' : 'Apply'}
                  </button>
                )}
              </span>
            ))}
            {missingKeywords.length > 12 && (
              <span className="px-2 py-1 text-on-surface-variant/50 text-xs rounded border border-outline-variant">+{missingKeywords.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {/* AI Suggestions Section */}
      {analysis?.actionableImprovements && analysis.actionableImprovements.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tertiary" /> AI Suggestions
          </h4>
          <ul className="space-y-2">
            {analysis.actionableImprovements.slice(0, 5).map((improvement: any, i: number) => (
              <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                 <span className="text-success mt-0.5">✓</span> {formatItem(improvement)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estimated Score After Fixes */}
      {estimatedScore && estimatedScore > score && (
        <div className="pt-4 border-t border-outline-variant/50">
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-tertiary/5 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-success" />
              <div>
                <div className="text-xs font-medium text-on-surface-variant">Estimated Score After Fixes</div>
                <div className="text-lg font-bold text-success">{estimatedScore}%</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-on-surface-variant">Potential Improvement</div>
              <div className="text-sm font-bold text-success">+{estimatedScore - score}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Fix Resume Button */}
      {onAutoFix && score < 90 && (
        <div className="pt-4 border-t border-outline-variant/50">
          <button
            onClick={onAutoFix}
            disabled={autoFixing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-tertiary hover:from-primary/90 hover:to-tertiary/90 disabled:opacity-50 text-on-primary text-sm font-bold rounded-lg transition-all disabled:cursor-not-allowed"
          >
            {autoFixing ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Auto Fixing Resume...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto Fix Resume
              </>
            )}
          </button>
        </div>
      )}

      {breakdown && (
        <div className="pt-4 border-t border-outline-variant/50">
          <h4 className="text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Score Breakdown</h4>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Keyword Match', value: breakdown.keywordCoverage, color: 'text-primary' },
              { label: 'Experience Relevance', value: breakdown.experienceRelevance, color: 'text-primary' },
              { label: 'Job Title Match', value: breakdown.roleAlignment, color: 'text-primary' },
              { label: 'Formatting', value: breakdown.formattingClarity, color: 'text-primary' },
              { label: 'Skills Coverage', value: breakdown.skillsMatch, color: 'text-primary' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">{item.label}</span>
                  <span className={`font-medium ${item.color}`}>{item.value}%</span>
                </div>
                <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                  <div
                    className="bg-primary rounded-full h-1.5 transition-all duration-500"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {changes && changes.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/50 space-y-3">
          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" /> Changes Made
          </h4>
          <ul className="space-y-2">
            {changes.map((c: any, i: number) => (
              <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                <span className="text-success mt-0.5">•</span> {formatImprovement(c)}
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

      {/* Learn ATS Section */}
      <div className="pt-4 border-t border-outline-variant/50">
        <button
          onClick={() => setShowLearnATS(!showLearnATS)}
          className="flex items-center gap-2 text-xs font-medium text-tertiary hover:text-primary transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          Learn ATS
          <ArrowRight className={`w-3 h-3 transition-transform ${showLearnATS ? 'rotate-90' : ''}`} />
        </button>
        {showLearnATS && (
          <div className="mt-3 p-4 bg-surface-container rounded-lg text-xs text-on-surface-variant space-y-2">
            <p><strong>What is ATS?</strong> ATS (Applicant Tracking System) is software used by recruiters to screen resumes.</p>
            <p><strong>How it works:</strong> It compares your resume with the job description to find keyword matches.</p>
            <p><strong>Higher score = better match</strong> with the role requirements.</p>
            <p><strong>To improve:</strong></p>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Use the same skills as the job post</li>
              <li>Mention them in your work experience</li>
              <li>Match your title to the role</li>
              <li>Use a simple single-column format</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
