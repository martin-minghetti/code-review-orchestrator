import { z } from 'zod';

export const evidenceRefSchema = z.object({
  file: z.string(),
  lineStart: z.number(),
  lineEnd: z.number().optional().nullable(),
  snippet: z.string().optional().nullable(),
  reason: z.string(),
});

export const findingSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  confidence: z.enum(['high', 'medium', 'low']),
  primaryLocation: z
    .object({ file: z.string(), line: z.number() })
    .optional()
    .nullable(),
  title: z.string(),
  description: z.string(),
  suggestion: z.string(),
  evidenceRefs: z.array(evidenceRefSchema),
});

export const agentResultSchema = z.object({
  agent: z.enum(['security', 'change-impact', 'test-gap', 'docs']),
  status: z.enum(['completed', 'skipped', 'error']),
  skipReason: z.string().optional(),
  errorMessage: z.string().optional(),
  findings: z.array(findingSchema),
  summary: z.string(),
  model: z.string(),
  tokensUsed: z.number(),
  durationMs: z.number(),
});

export const reviewResultSchema = z.object({
  id: z.string(),
  pr: z.object({
    owner: z.string(),
    repo: z.string(),
    number: z.number(),
    title: z.string(),
    author: z.string(),
    headSha: z.string(),
  }),
  summary: z.object({
    total: z.number(),
    critical: z.number(),
    warning: z.number(),
    info: z.number(),
    assessment: z.string(),
  }),
  agentResults: z.array(agentResultSchema),
  contextByAgent: z.record(z.string(), z.array(z.string())),
  createdAt: z.string(),
});

export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
