import { describe, it, expect, beforeEach } from 'vitest';
import { reviewCache, buildCacheKey } from '@/lib/cache';
import type { ReviewResult } from '@/lib/schemas';

const MOCK_RESULT: ReviewResult = {
  id: 'owner/repo#1@abc123',
  pr: {
    owner: 'owner',
    repo: 'repo',
    number: 1,
    title: 'Test PR',
    author: 'alice',
    headSha: 'abc123',
  },
  summary: {
    total: 1,
    critical: 1,
    warning: 0,
    info: 0,
    assessment: 'NEEDS WORK — 1 critical issue found',
  },
  agentResults: [],
  contextByAgent: {},
  createdAt: new Date().toISOString(),
};

describe('reviewCache', () => {
  beforeEach(() => {
    reviewCache.clear();
  });

  it('returns undefined for a missing key', () => {
    expect(reviewCache.get('nonexistent')).toBeUndefined();
  });

  it('stores and retrieves a ReviewResult', () => {
    reviewCache.set('owner/repo#1@abc123', MOCK_RESULT);
    expect(reviewCache.get('owner/repo#1@abc123')).toEqual(MOCK_RESULT);
  });

  it('overwrites an existing entry', () => {
    const updated = { ...MOCK_RESULT, createdAt: '2026-01-01T00:00:00.000Z' };
    reviewCache.set('owner/repo#1@abc123', MOCK_RESULT);
    reviewCache.set('owner/repo#1@abc123', updated);
    expect(reviewCache.get('owner/repo#1@abc123')).toEqual(updated);
  });

  it('stores multiple independent entries', () => {
    const result2 = { ...MOCK_RESULT, id: 'owner/repo#2@def456' };
    reviewCache.set('owner/repo#1@abc123', MOCK_RESULT);
    reviewCache.set('owner/repo#2@def456', result2);
    expect(reviewCache.get('owner/repo#1@abc123')).toEqual(MOCK_RESULT);
    expect(reviewCache.get('owner/repo#2@def456')).toEqual(result2);
  });

  it('clears all entries', () => {
    reviewCache.set('owner/repo#1@abc123', MOCK_RESULT);
    reviewCache.clear();
    expect(reviewCache.get('owner/repo#1@abc123')).toBeUndefined();
  });
});

describe('buildCacheKey', () => {
  it('produces the correct key format', () => {
    expect(buildCacheKey('owner', 'repo', 42, 'sha123')).toBe('owner/repo#42@sha123');
  });

  it('handles different owners, repos, numbers, and shas', () => {
    expect(buildCacheKey('acme', 'my-app', 1, 'deadbeef')).toBe('acme/my-app#1@deadbeef');
  });
});
