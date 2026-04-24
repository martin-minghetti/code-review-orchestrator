'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Finding } from '@/lib/schemas';

interface FindingItemProps {
  finding: Finding;
}

const severityStyles: Record<Finding['severity'], string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const confidenceStyles: Record<Finding['confidence'], string> = {
  high: 'bg-foreground/10 text-foreground border-foreground/10',
  medium: 'bg-foreground/5 text-muted-foreground border-foreground/10',
  low: 'bg-foreground/5 text-muted-foreground/70 border-foreground/10',
};

const BADGE =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border py-0.5 px-2 text-[11px] font-medium leading-tight';

export function FindingItem({ finding }: FindingItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-left flex flex-col gap-1.5 p-3 hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className={`${BADGE} ${severityStyles[finding.severity]}`}>
            {finding.severity}
          </span>
          <span className={`${BADGE} ${confidenceStyles[finding.confidence]}`}>
            {finding.confidence}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{finding.title}</span>
        </div>
        {finding.primaryLocation && (
          <span className="truncate text-xs font-mono text-muted-foreground sm:max-w-[38%] sm:shrink-0">
            {finding.primaryLocation.file}:{finding.primaryLocation.line}
          </span>
        )}
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border p-3 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{finding.description}</p>

          {finding.suggestion && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-xs font-semibold text-green-400 mb-1">Suggestion</p>
              <p className="text-sm text-green-300/90">{finding.suggestion}</p>
            </div>
          )}

          {finding.evidenceRefs.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evidence</p>
              {finding.evidenceRefs.map((ref, i) => (
                <div key={i} className="rounded-md border border-border bg-muted/30 p-2 flex flex-col gap-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {ref.file}
                    {ref.lineStart ? `:${ref.lineStart}` : ''}
                    {ref.lineEnd && ref.lineEnd !== ref.lineStart ? `–${ref.lineEnd}` : ''}
                  </span>
                  <p className="text-xs text-muted-foreground">{ref.reason}</p>
                  {ref.snippet && (
                    <pre className="text-xs font-mono bg-background rounded p-2 overflow-x-auto text-foreground/80 mt-1">
                      {ref.snippet}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
