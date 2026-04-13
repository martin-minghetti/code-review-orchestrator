import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentResult } from '@/lib/schemas';
import type { ContextFile } from '@/lib/github/context-builder';
import type { PrFile } from '@/lib/github/pr';

// ---------------------------------------------------------------------------
// Mocks — must be hoisted (no out-of-scope variable references in factories)
// ---------------------------------------------------------------------------

vi.mock('@/lib/agents/security', () => ({
  runSecurityAgent: vi.fn(),
}));

vi.mock('@/lib/agents/change-impact', () => ({
  runChangeImpactAgent: vi.fn(),
}));

vi.mock('@/lib/agents/test-gap', () => ({
  runTestGapAgent: vi.fn(),
}));

vi.mock('@/lib/agents/docs', () => ({
  runDocsAgent: vi.fn(),
  shouldRunDocsAgent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { runSecurityAgent } from '@/lib/agents/security';
import { runChangeImpactAgent } from '@/lib/agents/change-impact';
import { runTestGapAgent } from '@/lib/agents/test-gap';
import { runDocsAgent } from '@/lib/agents/docs';
import { runReview } from '@/lib/agents/orchestrator';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAgentResult(agent: AgentResult['agent'], overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    agent,
    status: 'completed',
    findings: [],
    summary: `${agent} summary`,
    model: 'claude-3-5-haiku-20241022',
    tokensUsed: 100,
    durationMs: 50,
    ...overrides,
  };
}

const SECURITY_RESULT = makeAgentResult('security', {
  findings: [
    {
      severity: 'critical',
      confidence: 'high',
      title: 'SQL injection',
      description: 'Unsafe query',
      suggestion: 'Use parameterized queries',
      evidenceRefs: [{ file: 'src/db.ts', lineStart: 10, reason: 'raw concat' }],
    },
  ],
});

const CHANGE_IMPACT_RESULT = makeAgentResult('change-impact', {
  findings: [
    {
      severity: 'warning',
      confidence: 'medium',
      title: 'Breaking change',
      description: 'Function signature changed',
      suggestion: 'Update callers',
      evidenceRefs: [{ file: 'src/api.ts', lineStart: 5, reason: 'signature mismatch' }],
    },
  ],
});

const TEST_GAP_RESULT = makeAgentResult('test-gap', {
  findings: [
    {
      severity: 'info',
      confidence: 'low',
      title: 'Missing test',
      description: 'No test for new function',
      suggestion: 'Add a unit test',
      evidenceRefs: [],
    },
  ],
});

const DOCS_RESULT = makeAgentResult('docs');

const PR = {
  owner: 'acme',
  repo: 'app',
  number: 42,
  title: 'Add auth middleware',
  author: 'alice',
  headSha: 'deadbeef',
  description: 'Adds JWT middleware',
};

const DIFF = `diff --git a/src/auth.ts b/src/auth.ts\n+export function auth() {}`;

const CHANGED_FILES: PrFile[] = [
  { filename: 'src/auth.ts', status: 'modified', patch: '+export function auth() {}' },
];

const CONTEXT_FILES: ContextFile[] = [
  { path: 'src/auth.ts', content: 'export function auth() {}' },
];

const CONTEXT_BY_AGENT = {
  security: CONTEXT_FILES,
  'change-impact': CONTEXT_FILES,
  'test-gap': [],
  docs: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runSecurityAgent).mockResolvedValue(SECURITY_RESULT);
    vi.mocked(runChangeImpactAgent).mockResolvedValue(CHANGE_IMPACT_RESULT);
    vi.mocked(runTestGapAgent).mockResolvedValue(TEST_GAP_RESULT);
    vi.mocked(runDocsAgent).mockResolvedValue(DOCS_RESULT);
  });

  it('returns a valid ReviewResult with correct shape', async () => {
    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.id).toBe('acme/app#42@deadbeef');
    expect(result.pr.owner).toBe('acme');
    expect(result.pr.repo).toBe('app');
    expect(result.pr.number).toBe(42);
    expect(result.pr.headSha).toBe('deadbeef');
    expect(typeof result.createdAt).toBe('string');
    expect(new Date(result.createdAt).getTime()).toBeGreaterThan(0);
  });

  it('runs all 4 agents', async () => {
    await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(vi.mocked(runSecurityAgent)).toHaveBeenCalledOnce();
    expect(vi.mocked(runChangeImpactAgent)).toHaveBeenCalledOnce();
    expect(vi.mocked(runTestGapAgent)).toHaveBeenCalledOnce();
    expect(vi.mocked(runDocsAgent)).toHaveBeenCalledOnce();
  });

  it('computes summary counts correctly (1 critical, 1 warning, 1 info)', async () => {
    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.summary.critical).toBe(1);
    expect(result.summary.warning).toBe(1);
    expect(result.summary.info).toBe(1);
    expect(result.summary.total).toBe(3);
  });

  it('sets assessment to NEEDS WORK when critical findings exist', async () => {
    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.summary.assessment).toContain('NEEDS WORK');
  });

  it('sets assessment to REVIEW SUGGESTED when only warnings exist', async () => {
    vi.mocked(runSecurityAgent).mockResolvedValue(makeAgentResult('security'));
    vi.mocked(runChangeImpactAgent).mockResolvedValue(CHANGE_IMPACT_RESULT);
    vi.mocked(runTestGapAgent).mockResolvedValue(makeAgentResult('test-gap'));
    vi.mocked(runDocsAgent).mockResolvedValue(makeAgentResult('docs'));

    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.summary.assessment).toContain('REVIEW SUGGESTED');
  });

  it('sets assessment to LGTM when no findings', async () => {
    vi.mocked(runSecurityAgent).mockResolvedValue(makeAgentResult('security'));
    vi.mocked(runChangeImpactAgent).mockResolvedValue(makeAgentResult('change-impact'));
    vi.mocked(runTestGapAgent).mockResolvedValue(makeAgentResult('test-gap'));
    vi.mocked(runDocsAgent).mockResolvedValue(makeAgentResult('docs'));

    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.summary.assessment).toContain('LGTM');
    expect(result.summary.total).toBe(0);
  });

  it('records context file paths per agent', async () => {
    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(result.contextByAgent['security']).toEqual(['src/auth.ts']);
    expect(result.contextByAgent['change-impact']).toEqual(['src/auth.ts']);
    expect(result.contextByAgent['test-gap']).toEqual([]);
    expect(result.contextByAgent['docs']).toEqual([]);
  });

  it('returns all 4 agent results in the result', async () => {
    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    const agents = result.agentResults.map((r) => r.agent);
    expect(agents).toContain('security');
    expect(agents).toContain('change-impact');
    expect(agents).toContain('test-gap');
    expect(agents).toContain('docs');
  });

  it('still returns results for other agents when one agent rejects', async () => {
    vi.mocked(runSecurityAgent).mockRejectedValue(new Error('API timeout'));

    const result = await runReview({
      apiKey: 'fake-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    const securityResult = result.agentResults.find((r) => r.agent === 'security');
    expect(securityResult?.status).toBe('error');
    expect(securityResult?.errorMessage).toBe('API timeout');

    // Other agents still succeeded
    const changeImpact = result.agentResults.find((r) => r.agent === 'change-impact');
    expect(changeImpact?.status).toBe('completed');
  });

  it('passes apiKey and context to each agent', async () => {
    await runReview({
      apiKey: 'my-api-key',
      pr: PR,
      diff: DIFF,
      changedFiles: CHANGED_FILES,
      contextByAgent: CONTEXT_BY_AGENT,
    });

    expect(vi.mocked(runSecurityAgent)).toHaveBeenCalledWith(
      'my-api-key',
      { title: PR.title, author: PR.author, description: PR.description },
      DIFF,
      CONTEXT_FILES,
    );

    expect(vi.mocked(runDocsAgent)).toHaveBeenCalledWith(
      'my-api-key',
      { title: PR.title, author: PR.author, description: PR.description },
      DIFF,
      [],
      CHANGED_FILES,
    );
  });
});
