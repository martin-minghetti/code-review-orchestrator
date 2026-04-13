import { describe, it, expect } from 'vitest';
import {
  evidenceRefSchema,
  findingSchema,
  agentResultSchema,
  reviewResultSchema,
  type Finding,
  type AgentResult,
  type ReviewResult,
} from '@/lib/schemas';

describe('evidenceRefSchema', () => {
  it('validates a complete evidence ref', () => {
    const ref = {
      file: 'src/api/users.ts',
      lineStart: 42,
      lineEnd: 50,
      snippet: 'app.get("/users", handler)',
      reason: 'No auth middleware applied',
    };
    expect(evidenceRefSchema.parse(ref)).toEqual(ref);
  });

  it('allows optional lineEnd and snippet', () => {
    const ref = { file: 'src/index.ts', lineStart: 1, reason: 'entry point' };
    expect(evidenceRefSchema.parse(ref)).toEqual(ref);
  });

  it('allows null for lineEnd and snippet', () => {
    const ref = {
      file: 'src/index.ts',
      lineStart: 1,
      lineEnd: null,
      snippet: null,
      reason: 'Claude may return null instead of omitting',
    };
    expect(evidenceRefSchema.parse(ref)).toEqual(ref);
  });
});

describe('findingSchema', () => {
  it('validates a finding with primaryLocation', () => {
    const finding: Finding = {
      severity: 'critical',
      confidence: 'high',
      primaryLocation: { file: 'src/api/users.ts', line: 42 },
      title: 'Missing auth middleware',
      description: 'Endpoint has no authentication check.',
      suggestion: 'Add withAuth middleware.',
      evidenceRefs: [
        { file: 'src/api/posts.ts', lineStart: 10, reason: 'Other routes use withAuth' },
      ],
    };
    expect(findingSchema.parse(finding)).toEqual(finding);
  });

  it('allows absent primaryLocation for repo-wide findings', () => {
    const finding: Finding = {
      severity: 'info',
      confidence: 'medium',
      title: 'No .env.example found',
      description: 'Repository lacks environment variable documentation.',
      suggestion: 'Add .env.example with required variables.',
      evidenceRefs: [],
    };
    expect(findingSchema.parse(finding)).toEqual(finding);
  });

  it('allows null for primaryLocation', () => {
    const finding: Finding = {
      severity: 'warning',
      confidence: 'low',
      primaryLocation: null,
      title: 'Null primaryLocation from Claude',
      description: 'Claude returned null instead of omitting.',
      suggestion: 'Handle gracefully.',
      evidenceRefs: [],
    };
    expect(findingSchema.parse(finding)).toEqual(finding);
  });
});

describe('agentResultSchema', () => {
  it('validates a completed agent result', () => {
    const result: AgentResult = {
      agent: 'security',
      status: 'completed',
      findings: [],
      summary: 'No security issues found.',
      model: 'claude-sonnet-4-6',
      tokensUsed: 1500,
      durationMs: 3200,
    };
    expect(agentResultSchema.parse(result)).toEqual(result);
  });

  it('validates a skipped agent result', () => {
    const result: AgentResult = {
      agent: 'docs',
      status: 'skipped',
      skipReason: 'No public API changes detected.',
      findings: [],
      summary: 'Skipped — no public API changes.',
      model: 'claude-haiku-4-5',
      tokensUsed: 0,
      durationMs: 0,
    };
    expect(agentResultSchema.parse(result)).toEqual(result);
  });
});

describe('reviewResultSchema', () => {
  it('validates a complete review result', () => {
    const result: ReviewResult = {
      id: 'vercel/next.js#12345@abc123',
      pr: {
        owner: 'vercel',
        repo: 'next.js',
        number: 12345,
        title: 'Add new feature',
        author: 'user123',
        headSha: 'abc123',
      },
      summary: {
        total: 2,
        critical: 1,
        warning: 1,
        info: 0,
        assessment: 'Found 1 critical security issue and 1 warning.',
      },
      agentResults: [],
      contextByAgent: { security: ['src/middleware.ts'], 'change-impact': ['package.json'] },
      createdAt: '2026-04-12T10:00:00Z',
    };
    expect(reviewResultSchema.parse(result)).toEqual(result);
  });
});
