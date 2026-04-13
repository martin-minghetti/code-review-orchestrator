import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ContextFile } from '@/lib/github/context-builder';

// ---------------------------------------------------------------------------
// Mocks (factories must not reference out-of-scope variables — hoisted by vitest)
// ---------------------------------------------------------------------------

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (modelId: string) => ({ modelId })),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { runSecurityAgent } from '@/lib/agents/security';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_FINDING = {
  severity: 'warning' as const,
  confidence: 'high' as const,
  title: 'Hardcoded API key',
  description: 'An API key is hardcoded in the source.',
  suggestion: 'Move the key to an environment variable.',
  evidenceRefs: [
    {
      file: 'src/api.ts',
      lineStart: 10,
      reason: 'Key literal found on this line',
    },
  ],
};

const MOCK_OUTPUT = {
  findings: [MOCK_FINDING],
  summary: 'Found one hardcoded secret.',
};

const MOCK_RESULT = {
  output: MOCK_OUTPUT,
  usage: { totalTokens: 500, inputTokens: 400, outputTokens: 100 },
};

const PR = { title: 'Add login endpoint', author: 'alice', description: 'Adds /login route' };
const DIFF = `diff --git a/src/api.ts b/src/api.ts\n+const API_KEY = "sk-secret-123";`;
const CTX: ContextFile[] = [{ path: 'src/auth/login.ts', content: 'export function login() {}' }];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runSecurityAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateText).mockResolvedValue(MOCK_RESULT as never);
  });

  it('returns a completed AgentResult with findings from the LLM', async () => {
    const result = await runSecurityAgent('fake-key', PR, DIFF, CTX);

    expect(result.agent).toBe('security');
    expect(result.status).toBe('completed');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].title).toBe('Hardcoded API key');
    expect(result.summary).toBe('Found one hardcoded secret.');
    expect(result.tokensUsed).toBe(500);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns a model string on the result', async () => {
    const result = await runSecurityAgent('fake-key', PR, DIFF, CTX);
    expect(typeof result.model).toBe('string');
    expect(result.model.length).toBeGreaterThan(0);
  });

  it('returns error status (not throws) when generateText rejects', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Rate limit exceeded'));

    const result = await runSecurityAgent('fake-key', PR, DIFF, CTX);

    expect(result.agent).toBe('security');
    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe('Rate limit exceeded');
    expect(result.findings).toEqual([]);
    expect(result.tokensUsed).toBe(0);
  });

  it('handles non-Error throws gracefully', async () => {
    vi.mocked(generateText).mockRejectedValueOnce('string error');

    const result = await runSecurityAgent('fake-key', PR, DIFF, CTX);

    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe('string error');
  });

  it('passes apiKey to createAnthropic', async () => {
    await runSecurityAgent('my-secret-key', PR, DIFF, CTX);
    expect(vi.mocked(createAnthropic)).toHaveBeenCalledWith({ apiKey: 'my-secret-key' });
  });

  it('calls generateText with the security system prompt and user message', async () => {
    await runSecurityAgent('fake-key', PR, DIFF, CTX);

    const call = vi.mocked(generateText).mock.calls[0][0] as Record<string, unknown>;
    expect(typeof call.system).toBe('string');
    expect((call.system as string).toLowerCase()).toContain('security');
    expect(typeof call.prompt).toBe('string');
    expect(call.prompt as string).toContain(PR.title);
    expect(call.prompt as string).toContain(DIFF);
  });
});
