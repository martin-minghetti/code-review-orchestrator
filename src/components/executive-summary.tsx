import { Badge } from '@/components/ui/badge';
import type { ReviewResult } from '@/lib/schemas';

interface ExecutiveSummaryProps {
  summary: ReviewResult['summary'];
}

export function ExecutiveSummary({ summary }: ExecutiveSummaryProps) {
  const isClean = summary.total === 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {isClean ? (
          <span className="inline-flex h-6 items-center rounded-full bg-green-500/15 px-3 text-xs font-medium text-green-400">
            ✓ No issues found
          </span>
        ) : (
          <>
            {summary.critical > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-red-500/15 px-3 text-xs font-medium text-red-400">
                {summary.critical} critical
              </span>
            )}
            {summary.warning > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-yellow-500/15 px-3 text-xs font-medium text-yellow-400">
                {summary.warning} warning{summary.warning !== 1 ? 's' : ''}
              </span>
            )}
            {summary.info > 0 && (
              <span className="inline-flex h-6 items-center rounded-full bg-blue-500/15 px-3 text-xs font-medium text-blue-400">
                {summary.info} info
              </span>
            )}
            <Badge variant="outline" className="text-xs">
              {summary.total} total
            </Badge>
          </>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{summary.assessment}</p>
    </div>
  );
}
