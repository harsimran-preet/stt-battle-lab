import type { AnalysisResult } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Trophy, ThumbsUp, AlertTriangle, XCircle } from 'lucide-react';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

const VERDICT_CONFIG = {
  Excellent: { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', Icon: Trophy },
  Good: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700', Icon: ThumbsUp },
  Fair: { className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700', Icon: AlertTriangle },
  Poor: { className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700', Icon: XCircle },
};

function scoreToColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-blue-500';
  if (score >= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const { deepgramAnalysis } = analysis;
  const verdictCfg = VERDICT_CONFIG[deepgramAnalysis.verdict];
  const { Icon: VerdictIcon } = verdictCfg;

  return (
    <ScrollArea className="h-[560px] pr-2">
      <div className="space-y-5">
        {/* Overall Score */}
        <div className="rounded-xl border bg-gradient-to-br from-card to-muted/30 p-5 text-center">
          <div className="mb-3">
            <span className="text-6xl font-black text-foreground">
              {deepgramAnalysis.overallScore.toFixed(1)}
            </span>
            <span className="text-2xl font-semibold text-muted-foreground">/10</span>
          </div>
          <Badge
            variant="outline"
            className={cn('text-sm font-semibold px-3 py-1 gap-1.5', verdictCfg.className)}
          >
            <VerdictIcon className="h-3.5 w-3.5" />
            {deepgramAnalysis.verdict} Quality
          </Badge>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {deepgramAnalysis.summary}
          </p>
        </div>

        {/* Category Scores */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <Star className="h-4 w-4" />
            Category Breakdown
          </h3>
          {deepgramAnalysis.scores.map(item => (
            <div key={item.category} className="rounded-lg border bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{item.category}</span>
                <span className={cn(
                  'text-sm font-bold tabular-nums px-2 py-0.5 rounded-md',
                  item.score >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  item.score >= 6 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  item.score >= 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                )}>
                  {item.score}/10
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', scoreToColor(item.score))}
                  style={{ width: `${item.score * 10}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{item.feedback}</p>
            </div>
          ))}
        </div>

      </div>
    </ScrollArea>
  );
}
