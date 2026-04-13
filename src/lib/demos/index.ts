import demoSecurityIssues from './demo-security-issues.json';
import demoCleanPr from './demo-clean-pr.json';
import demoMixed from './demo-mixed.json';
import type { ReviewResult } from '@/lib/schemas';

export const DEMOS: { id: string; data: ReviewResult }[] = [
  { id: 'demo-security-issues', data: demoSecurityIssues as ReviewResult },
  { id: 'demo-clean-pr', data: demoCleanPr as ReviewResult },
  { id: 'demo-mixed', data: demoMixed as ReviewResult },
];

export function getDemoById(id: string): ReviewResult | undefined {
  return DEMOS.find(d => d.id === id)?.data;
}
