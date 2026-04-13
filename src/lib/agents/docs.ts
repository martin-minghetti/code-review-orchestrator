import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { AgentResult } from '@/lib/schemas';
import { findingSchema } from '@/lib/schemas';
import { AGENT_MODELS } from './models';
import { getSystemPrompt, buildUserMessage } from './prompts';
import type { ContextFile } from '@/lib/github/context-builder';
import type { PrFile } from '@/lib/github/pr';

const agentOutputSchema = z.object({
  findings: z.array(findingSchema),
  summary: z.string(),
});

// ---------------------------------------------------------------------------
// Skip logic
// ---------------------------------------------------------------------------

const DOCS_TRIGGER_PATTERNS = [/README/i, /^docs\//, /\.d\.ts$/];

export function shouldRunDocsAgent(changedFiles: PrFile[]): boolean {
  for (const file of changedFiles) {
    if (DOCS_TRIGGER_PATTERNS.some((p) => p.test(file.filename))) return true;
  }
  for (const file of changedFiles) {
    if (file.patch && /^\+.*\bexport\b/m.test(file.patch)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function runDocsAgent(
  apiKey: string,
  pr: { title: string; author: string; description: string },
  diff: string,
  contextFiles: ContextFile[],
  changedFiles: PrFile[],
): Promise<AgentResult> {
  const startTime = Date.now();

  if (!shouldRunDocsAgent(changedFiles)) {
    return {
      agent: 'docs',
      status: 'skipped',
      skipReason: 'No README, docs/, .d.ts, or new exports detected in this PR',
      findings: [],
      summary: '',
      model: AGENT_MODELS.docs,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }

  const anthropic = createAnthropic({ apiKey });

  try {
    const result = await generateText({
      model: anthropic(AGENT_MODELS.docs),
      system: getSystemPrompt('docs'),
      prompt: buildUserMessage(pr, diff, contextFiles),
      experimental_output: Output.object({ schema: agentOutputSchema }),
    });

    return {
      agent: 'docs',
      status: 'completed',
      findings: result.output.findings,
      summary: result.output.summary,
      model: AGENT_MODELS.docs,
      tokensUsed: result.usage.totalTokens ?? 0,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      agent: 'docs',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
      findings: [],
      summary: '',
      model: AGENT_MODELS.docs,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
}
