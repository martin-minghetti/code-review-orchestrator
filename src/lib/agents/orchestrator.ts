import { randomUUID } from 'crypto';
import type { AgentResult, ReviewResult } from '@/lib/schemas';
import type { ContextFile } from '@/lib/github/context-builder';
import type { PrFile } from '@/lib/github/pr';
import { runSecurityAgent } from './security';
import { runChangeImpactAgent } from './change-impact';
import { runTestGapAgent } from './test-gap';
import { runDocsAgent } from './docs';
import { buildCacheKey } from '@/lib/cache';

export interface RunReviewParams {
  apiKey: string;
  pr: {
    owner: string;
    repo: string;
    number: number;
    title: string;
    author: string;
    headSha: string;
    description: string;
  };
  diff: string;
  changedFiles: PrFile[];
  contextByAgent: Record<string, ContextFile[]>;
}

function makeErrorAgentResult(
  agent: AgentResult['agent'],
  reason: unknown,
): AgentResult {
  return {
    agent,
    status: 'error',
    errorMessage: reason instanceof Error ? reason.message : String(reason),
    findings: [],
    summary: '',
    model: '',
    tokensUsed: 0,
    durationMs: 0,
  };
}

function buildAssessment(critical: number, warning: number): string {
  if (critical > 0) {
    return `NEEDS WORK — ${critical} critical issue${critical > 1 ? 's' : ''} found`;
  }
  if (warning > 0) {
    return `REVIEW SUGGESTED — ${warning} warning${warning > 1 ? 's' : ''} found`;
  }
  return 'LGTM — no significant issues found';
}

export async function runReview(params: RunReviewParams): Promise<ReviewResult> {
  const { apiKey, pr, diff, changedFiles, contextByAgent } = params;

  const prMeta = { title: pr.title, author: pr.author, description: pr.description };

  const [securitySettled, changeImpactSettled, testGapSettled, docsSettled] =
    await Promise.allSettled([
      runSecurityAgent(apiKey, prMeta, diff, contextByAgent['security'] ?? []),
      runChangeImpactAgent(apiKey, prMeta, diff, contextByAgent['change-impact'] ?? []),
      runTestGapAgent(apiKey, prMeta, diff, contextByAgent['test-gap'] ?? []),
      runDocsAgent(apiKey, prMeta, diff, contextByAgent['docs'] ?? [], changedFiles),
    ]);

  const agentResults: AgentResult[] = [
    securitySettled.status === 'fulfilled'
      ? securitySettled.value
      : makeErrorAgentResult('security', securitySettled.reason),
    changeImpactSettled.status === 'fulfilled'
      ? changeImpactSettled.value
      : makeErrorAgentResult('change-impact', changeImpactSettled.reason),
    testGapSettled.status === 'fulfilled'
      ? testGapSettled.value
      : makeErrorAgentResult('test-gap', testGapSettled.reason),
    docsSettled.status === 'fulfilled'
      ? docsSettled.value
      : makeErrorAgentResult('docs', docsSettled.reason),
  ];

  // Build summary counts across all findings
  let critical = 0;
  let warning = 0;
  let info = 0;

  for (const agentResult of agentResults) {
    for (const finding of agentResult.findings) {
      if (finding.severity === 'critical') critical++;
      else if (finding.severity === 'warning') warning++;
      else if (finding.severity === 'info') info++;
    }
  }

  const total = critical + warning + info;

  // Build contextByAgent paths map (file paths per agent)
  const contextPaths: Record<string, string[]> = {};
  for (const [agentKey, files] of Object.entries(contextByAgent)) {
    contextPaths[agentKey] = files.map((f) => f.path);
  }

  const id = buildCacheKey(pr.owner, pr.repo, pr.number, pr.headSha);

  return {
    id,
    pr: {
      owner: pr.owner,
      repo: pr.repo,
      number: pr.number,
      title: pr.title,
      author: pr.author,
      headSha: pr.headSha,
    },
    summary: {
      total,
      critical,
      warning,
      info,
      assessment: buildAssessment(critical, warning),
    },
    agentResults,
    contextByAgent: contextPaths,
    createdAt: new Date().toISOString(),
  };
}
