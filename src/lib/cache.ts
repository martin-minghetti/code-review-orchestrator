import type { ReviewResult } from './schemas';

const cache = new Map<string, ReviewResult>();

export const reviewCache = {
  get(key: string): ReviewResult | undefined {
    return cache.get(key);
  },
  set(key: string, value: ReviewResult): void {
    cache.set(key, value);
  },
  clear(): void {
    cache.clear();
  },
};

export function buildCacheKey(
  owner: string,
  repo: string,
  number: number,
  headSha: string,
): string {
  return `${owner}/${repo}#${number}@${headSha}`;
}
