'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ReviewResult } from '@/lib/schemas';
import { AGENT_META, type AgentId } from '@/lib/agents/config';

function toMarkdown(result: ReviewResult): string {
  const { pr, summary, agentResults } = result;
  const lines: string[] = [];

  lines.push(`# Code Review: ${pr.owner}/${pr.repo} #${pr.number}`);
  lines.push('');
  lines.push(`**${pr.title}**`);
  lines.push(`Author: @${pr.author} · SHA: \`${pr.headSha.slice(0, 7)}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(
    `${summary.critical} critical · ${summary.warning} warnings · ${summary.info} info · ${summary.total} total`,
  );
  lines.push('');
  lines.push(`> ${summary.assessment}`);
  lines.push('');

  for (const agentResult of agentResults) {
    const meta = AGENT_META[agentResult.agent as AgentId];
    lines.push(`## ${meta.icon} ${meta.name}`);
    lines.push('');

    if (agentResult.status === 'skipped') {
      lines.push(`_Skipped: ${agentResult.skipReason ?? 'No relevant changes'}_`);
      lines.push('');
      continue;
    }

    if (agentResult.status === 'error') {
      lines.push(`_Error: ${agentResult.errorMessage ?? 'Unknown error'}_`);
      lines.push('');
      continue;
    }

    if (agentResult.summary) {
      lines.push(agentResult.summary);
      lines.push('');
    }

    for (const finding of agentResult.findings) {
      lines.push(
        `### [${finding.severity.toUpperCase()}] ${finding.title}`,
      );
      lines.push('');
      if (finding.primaryLocation) {
        lines.push(`**Location:** \`${finding.primaryLocation.file}:${finding.primaryLocation.line}\``);
        lines.push('');
      }
      lines.push(finding.description);
      lines.push('');
      lines.push(`**Suggestion:** ${finding.suggestion}`);
      lines.push('');

      if (finding.evidenceRefs.length > 0) {
        lines.push('**Evidence:**');
        for (const ref of finding.evidenceRefs) {
          lines.push(
            `- \`${ref.file}:${ref.lineStart}${ref.lineEnd && ref.lineEnd !== ref.lineStart ? `–${ref.lineEnd}` : ''}\` — ${ref.reason}`,
          );
          if (ref.snippet) {
            lines.push('```');
            lines.push(ref.snippet);
            lines.push('```');
          }
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

interface CopyMarkdownButtonProps {
  result: ReviewResult;
}

export function CopyMarkdownButton({ result }: CopyMarkdownButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function handleCopy() {
    try {
      const markdown = toMarkdown(result);
      await navigator.clipboard.writeText(markdown);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {state === 'idle' && '📋 Copy as Markdown'}
      {state === 'copied' && '✓ Copied!'}
      {state === 'error' && 'Failed to copy'}
    </Button>
  );
}
