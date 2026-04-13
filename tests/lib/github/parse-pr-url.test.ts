import { describe, it, expect } from 'vitest';
import { parsePrUrl } from '@/lib/github/parse-pr-url';

describe('parsePrUrl', () => {
  it('parses a standard GitHub PR URL', () => {
    expect(parsePrUrl('https://github.com/vercel/next.js/pull/12345'))
      .toEqual({ owner: 'vercel', repo: 'next.js', number: 12345 });
  });
  it('parses URL without https://', () => {
    expect(parsePrUrl('github.com/facebook/react/pull/99'))
      .toEqual({ owner: 'facebook', repo: 'react', number: 99 });
  });
  it('parses URL with trailing slash', () => {
    expect(parsePrUrl('https://github.com/vercel/ai/pull/100/'))
      .toEqual({ owner: 'vercel', repo: 'ai', number: 100 });
  });
  it('parses URL with /files or /commits suffix', () => {
    expect(parsePrUrl('https://github.com/vercel/ai/pull/100/files'))
      .toEqual({ owner: 'vercel', repo: 'ai', number: 100 });
  });
  it('returns null for non-GitHub URLs', () => {
    expect(parsePrUrl('https://gitlab.com/foo/bar/merge_requests/1')).toBeNull();
  });
  it('returns null for invalid PR URLs', () => {
    expect(parsePrUrl('https://github.com/vercel/next.js')).toBeNull();
    expect(parsePrUrl('https://github.com/vercel/next.js/issues/123')).toBeNull();
    expect(parsePrUrl('not a url')).toBeNull();
  });
});
