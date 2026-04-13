import { describe, it, expect, vi } from 'vitest';
import { fetchPrData } from '@/lib/github/pr';
import type { Octokit } from 'octokit';

function makeMockOctokit({
  prData = {},
  filesData = [],
  treeData = [],
}: {
  prData?: Record<string, unknown>;
  filesData?: unknown[];
  treeData?: unknown[];
}): Octokit {
  const defaultPr = {
    title: 'Test PR',
    body: 'A description',
    user: { login: 'octocat' },
    head: { sha: 'abc123', ref: 'feature-branch' },
    ...prData,
  };

  return {
    rest: {
      pulls: {
        get: vi.fn().mockResolvedValue({ data: defaultPr }),
        listFiles: vi.fn().mockResolvedValue({ data: filesData }),
      },
      git: {
        getTree: vi.fn().mockResolvedValue({ data: { tree: treeData } }),
      },
    },
  } as unknown as Octokit;
}

describe('fetchPrData', () => {
  it('returns PR metadata, files, and repo tree on happy path', async () => {
    const filesData = [
      { filename: 'src/index.ts', status: 'modified', patch: '@@ -1 +1 @@' },
      { filename: 'src/utils.ts', status: 'added' },
    ];
    const treeData = [
      { path: 'src/index.ts', type: 'blob' },
      { path: 'src/utils.ts', type: 'blob' },
      { path: 'src', type: 'tree' },
    ];

    const octokit = makeMockOctokit({ filesData, treeData });
    const ref = { owner: 'vercel', repo: 'next.js', number: 42 };
    const result = await fetchPrData(octokit, ref);

    expect(result.pr).toEqual({
      owner: 'vercel',
      repo: 'next.js',
      number: 42,
      title: 'Test PR',
      author: 'octocat',
      headSha: 'abc123',
      headRef: 'feature-branch',
      description: 'A description',
    });

    expect(result.files).toEqual([
      { filename: 'src/index.ts', status: 'modified', patch: '@@ -1 +1 @@' },
      { filename: 'src/utils.ts', status: 'added' },
    ]);

    expect(result.repoTree).toEqual([
      { path: 'src/index.ts', type: 'blob' },
      { path: 'src/utils.ts', type: 'blob' },
      { path: 'src', type: 'tree' },
    ]);
  });

  it('omits patch field when not present in file', async () => {
    const filesData = [{ filename: 'README.md', status: 'renamed' }];
    const octokit = makeMockOctokit({ filesData });
    const result = await fetchPrData(octokit, { owner: 'a', repo: 'b', number: 1 });
    expect(result.files[0]).toEqual({ filename: 'README.md', status: 'renamed' });
    expect('patch' in result.files[0]).toBe(false);
  });

  it('throws "too many changed files" when PR has more than 100 files', async () => {
    const filesData = Array.from({ length: 101 }, (_, i) => ({
      filename: `file${i}.ts`,
      status: 'modified',
    }));
    const octokit = makeMockOctokit({ filesData });
    const ref = { owner: 'vercel', repo: 'next.js', number: 99 };
    await expect(fetchPrData(octokit, ref)).rejects.toThrow('too many changed files');
  });

  it('handles null PR body as empty string', async () => {
    const octokit = makeMockOctokit({
      prData: { body: null },
    });
    const result = await fetchPrData(octokit, { owner: 'a', repo: 'b', number: 1 });
    expect(result.pr.description).toBe('');
  });

  it('handles null PR user as empty author string', async () => {
    const octokit = makeMockOctokit({
      prData: { user: null },
    });
    const result = await fetchPrData(octokit, { owner: 'a', repo: 'b', number: 1 });
    expect(result.pr.author).toBe('');
  });
});
