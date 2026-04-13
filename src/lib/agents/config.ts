// Client-safe: no process.env reads here.
// For model assignments (server-only), see ./models.ts

export const AGENT_IDS = ['security', 'change-impact', 'test-gap', 'docs'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_META: Record<AgentId, { name: string; icon: string; description: string }> = {
  security: {
    name: 'Security Scanner',
    icon: '🔒',
    description: 'Vulnerabilities, exposed secrets, missing auth, injection risks',
  },
  'change-impact': {
    name: 'Change Impact Analyzer',
    icon: '🔍',
    description: 'Separation of concerns, repo patterns, regression risk',
  },
  'test-gap': {
    name: 'Test Gap Detector',
    icon: '🧪',
    description: 'Missing tests for new code, coverage gaps',
  },
  docs: {
    name: 'Documentation Verifier',
    icon: '📝',
    description: 'Missing docs on public API, outdated README',
  },
};
