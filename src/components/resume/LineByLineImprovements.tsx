import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImprovementItem {
  section: string;
  before: string;
  after: string;
  impact?: number;
}

interface LineByLineImprovementsProps {
  improvements: ImprovementItem[];
  onApply: (index: number) => void;
  onApplyAll: () => void;
  applying?: boolean;
  applyingIndex?: number | null;
  loadingCount?: number;
  appliedIndices?: Set<number>;
}

const sectionColors: Record<string, string> = {
  summary: 'border-l-blue-500 bg-blue-500/5',
  experience: 'border-l-emerald-500 bg-emerald-500/5',
  skills: 'border-l-purple-500 bg-purple-500/5',
  education: 'border-l-amber-500 bg-amber-500/5',
};

function toDisplayString(val: any): string {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (val && typeof val === 'object') {
    if (val.bullets) return Array.isArray(val.bullets) ? val.bullets.join('\n') : String(val.bullets);
    if (val.degree) return `${val.degree} — ${val.institution || val.school || ''}`;
    if (val.role) return `${val.role} at ${val.company || ''}`;
    return JSON.stringify(val, null, 2);
  }
  return String(val ?? '');
}

export function LineByLineImprovements({
  improvements,
  onApply,
  onApplyAll,
  applying,
  applyingIndex = null,
  loadingCount = 0,
  appliedIndices = new Set(),
}: LineByLineImprovementsProps) {
  if (!improvements.length && loadingCount <= 0) return null;

  const allApplied = improvements.length > 0 && improvements.every((_, i) => appliedIndices.has(i));

  return (
    <div className="glass rounded-xl border border-outline-variant/30 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 bg-surface-container-low/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Suggested Apply Changes</h3>
            <p className="text-[10px] text-on-surface-variant font-medium">
              {loadingCount > 0 ? `${loadingCount} loading` : `${improvements.filter((_, i) => !appliedIndices.has(i)).length} remaining`}
            </p>
          </div>
        </div>
        {improvements.length > 0 && !allApplied && (
          <button
            onClick={onApplyAll}
            disabled={applying}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {applying ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {applying ? 'Applying...' : 'Apply All'}
          </button>
        )}
        {allApplied && improvements.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-success font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            All applied
          </div>
        )}
      </div>

      <div className="divide-y divide-outline-variant/10">
        <AnimatePresence initial={false}>
          {improvements.map((imp, i) => {
            const isApplied = appliedIndices.has(i);
            if (isApplied) return null;
            const isApplyingThis = applyingIndex === i;
            const sectionKey = imp.section.toLowerCase();
            const borderColor = Object.keys(sectionColors).find(k => sectionKey.includes(k))
              ? sectionColors[Object.keys(sectionColors).find(k => sectionKey.includes(k))!]
              : 'border-l-primary bg-primary/5';

            const beforeText = toDisplayString(imp.before);
            const afterText = toDisplayString(imp.after);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "border-l-2 pl-4 pr-4 py-4 transition-opacity",
                  borderColor,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {imp.section}
                      {imp.impact && (
                        <span className="ml-1 text-success">+{imp.impact}pts</span>
                      )}
                    </span>

                    <div>
                      <p className="text-[10px] font-semibold text-error/70 uppercase tracking-wider mb-1">Before</p>
                      <div className="bg-error/5 border border-error/15 rounded-lg px-3 py-2">
                        <p className="text-xs text-on-surface-variant line-through decoration-error/50 whitespace-pre-wrap">{beforeText}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-success/70 uppercase tracking-wider mb-1">After</p>
                      <div className="bg-success/5 border border-success/15 rounded-lg px-3 py-2">
                        <p className="text-xs text-on-surface font-medium whitespace-pre-wrap">{afterText}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onApply(i)}
                    disabled={applying}
                    className={cn(
                      "shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                      "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 disabled:opacity-30"
                    )}
                  >
                    {isApplyingThis ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Applying</>
                    ) : (
                      <><ArrowRight className="w-3 h-3" /> Apply</>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {Array.from({ length: loadingCount }).map((_, i) => (
            <motion.div
              key={`loading-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l-2 border-l-primary bg-primary/5 pl-4 pr-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="h-5 w-28 rounded-full bg-surface-container-high animate-pulse" />
                  <div className="space-y-2 rounded-lg border border-outline-variant/20 bg-surface-container/40 p-3">
                    <div className="h-3 w-20 rounded bg-surface-container-high animate-pulse" />
                    <div className="h-3 w-full rounded bg-surface-container-high animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-surface-container-high animate-pulse" />
                  </div>
                  <div className="space-y-2 rounded-lg border border-outline-variant/20 bg-surface-container/40 p-3">
                    <div className="h-3 w-16 rounded bg-surface-container-high animate-pulse" />
                    <div className="h-3 w-5/6 rounded bg-surface-container-high animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-surface-container-high animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-20 rounded-lg bg-surface-container-high animate-pulse" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
