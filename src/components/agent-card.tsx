import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AGENT_META, type AgentId } from '@/lib/agents/config';
import type { AgentResult } from '@/lib/schemas';
import { FindingItem } from './finding-item';

interface AgentCardProps {
  result: AgentResult;
}

function getSeverityBadgeStyle(result: AgentResult): string {
  if (result.status === 'skipped') return 'bg-muted/50 text-muted-foreground border-border';
  if (result.status === 'error') return 'bg-red-500/15 text-red-400 border-red-500/30';
  const hasCritical = result.findings.some(f => f.severity === 'critical');
  const hasWarning = result.findings.some(f => f.severity === 'warning');
  if (hasCritical) return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (hasWarning) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  return 'bg-green-500/15 text-green-400 border-green-500/30';
}

function getSeverityLabel(result: AgentResult): string {
  if (result.status === 'skipped') return 'Skipped';
  if (result.status === 'error') return 'Error';
  const hasCritical = result.findings.some(f => f.severity === 'critical');
  const hasWarning = result.findings.some(f => f.severity === 'warning');
  if (hasCritical) return 'Critical';
  if (hasWarning) return 'Warnings';
  return 'Clean';
}

function formatDuration(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number): string {
  if (n === 0) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function AgentCard({ result }: AgentCardProps) {
  const meta = AGENT_META[result.agent as AgentId];
  const badgeStyle = getSeverityBadgeStyle(result);
  const badgeLabel = getSeverityLabel(result);

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg" aria-hidden="true">{meta.icon}</span>
            <CardTitle className="text-sm font-semibold">{meta.name}</CardTitle>
          </div>
          <span
            className={`inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-xs font-medium ${badgeStyle}`}
          >
            {badgeLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-mono">
          <span title="Model">{result.model}</span>
          <span>·</span>
          <span title="Tokens used">{formatTokens(result.tokensUsed)} tok</span>
          <span>·</span>
          <span title="Duration">{formatDuration(result.durationMs)}</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pt-3 flex-1">
        {result.status === 'skipped' && (
          <p className="text-sm text-muted-foreground italic">
            {result.skipReason ?? 'Skipped — no relevant changes detected.'}
          </p>
        )}

        {result.status === 'error' && (
          <p className="text-sm text-red-400">
            {result.errorMessage ?? 'An unknown error occurred.'}
          </p>
        )}

        {result.status === 'completed' && result.summary && (
          <p className="text-sm text-muted-foreground">{result.summary}</p>
        )}

        {result.findings.length > 0 && (
          <div className="flex flex-col gap-2">
            {result.findings.map((finding, i) => (
              <FindingItem key={i} finding={finding} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
