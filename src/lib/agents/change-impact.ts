import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { AgentResult } from '@/lib/schemas';
import { findingSchema } from '@/lib/schemas';
import { AGENT_MODELS } from './models';
import { getSystemPrompt, buildUserMessage } from './prompts';
import type { ContextFile } from '@/lib/github/context-builder';

const agentOutputSchema = z.object({
  findings: z.array(findingSchema),
  summary: z.string(),
});

export async function runChangeImpactAgent(
  apiKey: string,
  pr: { title: string; author: string; description: string },
  diff: string,
  contextFiles: ContextFile[],
): Promise<AgentResult> {
  const startTime = Date.now();
  const anthropic = createAnthropic({ apiKey });

  try {
    const result = await generateText({
      model: anthropic(AGENT_MODELS['change-impact']),
      system: getSystemPrompt('change-impact'),
      prompt: buildUserMessage(pr, diff, contextFiles),
      experimental_output: Output.object({ schema: agentOutputSchema }),
    });

    return {
      agent: 'change-impact',
      status: 'completed',
      findings: result.output.findings,
      summary: result.output.summary,
      model: AGENT_MODELS['change-impact'],
      tokensUsed: result.usage.totalTokens ?? 0,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      agent: 'change-impact',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
      findings: [],
      summary: '',
      model: AGENT_MODELS['change-impact'],
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
}
