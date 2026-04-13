// Server-only: reads process.env. Do NOT import from client components.
import type { AgentId } from './config';

export const AGENT_MODELS: Record<AgentId, string> = {
  security: process.env.SECURITY_MODEL ?? 'claude-sonnet-4-6',
  'change-impact': process.env.CHANGE_IMPACT_MODEL ?? 'claude-sonnet-4-6',
  'test-gap': process.env.TEST_GAP_MODEL ?? 'claude-haiku-4-5',
  docs: process.env.DOCS_MODEL ?? 'claude-haiku-4-5',
};
