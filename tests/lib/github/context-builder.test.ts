import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAgentContexts, fetchFileContent } from '@/lib/github/context-builder';
import type { Octokit } from 'octokit';
import type { PrFile, PrTreeEntry } from '@/lib/github/pr';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTree(paths: string[]): PrTreeEntry[] {
  return paths.map((p) => ({ path: p, type: 'blob' }));
}

function makeFiles(filenames: string[]): PrFile[] {
  return filenames.map((f) => ({ filename: f, status: 'modified' }));
}

function makeOctokit(contentMap: Record<string, string> = {}): Octokit {
  return {
    rest: {
      repos: {
        getContent: vi.fn(({ path }: { path: string }) => {
          const content = contentMap[path] ?? `content of ${path}`;
          return Promise.resolve({
            data: {
              content: Buffer.from(content).toString('base64'),
              encoding: 'base64',
            },
          });
        }),
      },
    },
  } as unknown as Octokit;
}

// ---------------------------------------------------------------------------
// fetchFileContent
// ---------------------------------------------------------------------------

describe('fetchFileContent', () => {
  it('decodes base64 content', async () => {
    const octokit = makeOctokit({ 'README.md': 'hello world' });
    const result = await fetchFileContent(octokit, 'owner', 'repo', 'README.md');
    expect(result).toBe('hello world');
  });

  it('passes ref to getContent when provided', async () => {
    const octokit = makeOctokit({ 'src/app.ts': 'app content' });
    const spy = octokit.rest.repos.getContent as ReturnType<typeof vi.fn>;
    await fetchFileContent(octokit, 'owner', 'repo', 'src/app.ts', 'feature-branch');
    expect(spy).toHaveBeenCalledWith({ owner: 'owner', repo: 'repo', path: 'src/app.ts', ref: 'feature-branch' });
  });

  it('does not include ref when not provided', async () => {
    const octokit = makeOctokit();
    const spy = octokit.rest.repos.getContent as ReturnType<typeof vi.fn>;
    await fetchFileContent(octokit, 'owner', 'repo', 'src/app.ts');
    const call = spy.mock.calls[0][0] as Record<string, unknown>;
    expect('ref' in call).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildAgentContexts — security agent
// ---------------------------------------------------------------------------

describe('buildAgentContexts — security agent', () => {
  it('includes auth files', async () => {
    const tree = makeTree(['src/auth/login.ts', 'src/utils.ts', '.env.example']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    const paths = result.security.map((f) => f.path);
    expect(paths).toContain('src/auth/login.ts');
  });

  it('includes middleware files', async () => {
    const tree = makeTree(['src/middleware/auth.ts', 'src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    expect(result.security.map((f) => f.path)).toContain('src/middleware/auth.ts');
  });

  it('includes guard files', async () => {
    const tree = makeTree(['src/guards/role.guard.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    expect(result.security.map((f) => f.path)).toContain('src/guards/role.guard.ts');
  });

  it('includes .env.example', async () => {
    const tree = makeTree(['.env.example', 'src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    expect(result.security.map((f) => f.path)).toContain('.env.example');
  });

  it('caps security files at 8', async () => {
    const paths = Array.from({ length: 12 }, (_, i) => `src/auth/file${i}.ts`);
    const tree = makeTree(paths);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    expect(result.security.length).toBeLessThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// buildAgentContexts — change-impact agent
// ---------------------------------------------------------------------------

describe('buildAgentContexts — change-impact agent', () => {
  it('includes package.json and tsconfig.json when present', async () => {
    const tree = makeTree(['package.json', 'tsconfig.json', 'src/index.ts']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    const paths = result['change-impact'].map((f) => f.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
  });

  it('includes sibling .ts files from same directory as changed file', async () => {
    const tree = makeTree(['src/utils.ts', 'src/index.ts', 'src/helpers.tsx']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    const paths = result['change-impact'].map((f) => f.path);
    expect(paths).toContain('src/utils.ts');
    expect(paths).toContain('src/helpers.tsx');
    // Should not include the changed file itself
    expect(paths).not.toContain('src/index.ts');
  });

  it('includes sibling .js and .jsx files', async () => {
    const tree = makeTree(['src/utils.js', 'src/helper.jsx', 'src/index.ts']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    const paths = result['change-impact'].map((f) => f.path);
    expect(paths).toContain('src/utils.js');
    expect(paths).toContain('src/helper.jsx');
  });

  it('caps change-impact files at 10', async () => {
    const siblingPaths = Array.from({ length: 12 }, (_, i) => `src/sibling${i}.ts`);
    const tree = makeTree(['package.json', 'tsconfig.json', 'src/index.ts', ...siblingPaths]);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result['change-impact'].length).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// buildAgentContexts — test-gap agent
// ---------------------------------------------------------------------------

describe('buildAgentContexts — test-gap agent', () => {
  it('includes corresponding test file under tests/', async () => {
    const tree = makeTree(['src/lib/parser.ts', 'tests/lib/parser.test.ts']);
    const files = makeFiles(['src/lib/parser.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result['test-gap'].map((f) => f.path)).toContain('tests/lib/parser.test.ts');
  });

  it('includes __tests__ sibling test file', async () => {
    const tree = makeTree(['src/utils.ts', 'src/__tests__/utils.test.ts']);
    const files = makeFiles(['src/utils.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result['test-gap'].map((f) => f.path)).toContain('src/__tests__/utils.test.ts');
  });

  it('includes vitest.config.ts when present', async () => {
    const tree = makeTree(['vitest.config.ts', 'src/index.ts']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result['test-gap'].map((f) => f.path)).toContain('vitest.config.ts');
  });

  it('caps test-gap files at 6', async () => {
    const srcFiles = Array.from({ length: 8 }, (_, i) => `src/mod${i}.ts`);
    const testFiles = Array.from({ length: 8 }, (_, i) => `tests/mod${i}.test.ts`);
    const tree = makeTree(['vitest.config.ts', ...srcFiles, ...testFiles]);
    const files = makeFiles(srcFiles);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result['test-gap'].length).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// buildAgentContexts — docs agent
// ---------------------------------------------------------------------------

describe('buildAgentContexts — docs agent', () => {
  it('includes README.md when present', async () => {
    const tree = makeTree(['README.md', 'src/index.ts']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result.docs.map((f) => f.path)).toContain('README.md');
  });

  it('includes .d.ts files for changed modules', async () => {
    const tree = makeTree(['README.md', 'src/api.ts', 'src/api.d.ts']);
    const files = makeFiles(['src/api.ts']);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result.docs.map((f) => f.path)).toContain('src/api.d.ts');
  });

  it('caps docs files at 4', async () => {
    const srcFiles = Array.from({ length: 5 }, (_, i) => `src/mod${i}.ts`);
    const dtsFiles = Array.from({ length: 5 }, (_, i) => `src/mod${i}.d.ts`);
    const tree = makeTree(['README.md', ...srcFiles, ...dtsFiles]);
    const files = makeFiles(srcFiles);
    const octokit = makeOctokit();
    const result = await buildAgentContexts(octokit, 'o', 'r', files, tree);
    expect(result.docs.length).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// buildAgentContexts — cross-cutting concerns
// ---------------------------------------------------------------------------

describe('buildAgentContexts — cross-cutting', () => {
  it('fetches shared files only once (deduplication)', async () => {
    // README.md appears in docs; package.json in change-impact
    const tree = makeTree(['README.md', 'package.json', 'tsconfig.json', 'src/auth/login.ts', 'src/index.ts']);
    const files = makeFiles(['src/index.ts']);
    const octokit = makeOctokit();
    const spy = octokit.rest.repos.getContent as ReturnType<typeof vi.fn>;

    await buildAgentContexts(octokit, 'o', 'r', files, tree);

    // Count how many times each path was requested
    const callPaths = spy.mock.calls.map((c: unknown[]) => (c[0] as { path: string }).path);
    const pathCounts = callPaths.reduce<Record<string, number>>((acc, p) => {
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {});

    for (const [p, count] of Object.entries(pathCounts)) {
      expect(count, `${p} was fetched ${count} times`).toBe(1);
    }
  });

  it('passes ref to all file fetches', async () => {
    const tree = makeTree(['README.md', 'package.json']);
    const octokit = makeOctokit();
    const spy = octokit.rest.repos.getContent as ReturnType<typeof vi.fn>;

    await buildAgentContexts(octokit, 'owner', 'repo', [], tree, 'my-branch');

    for (const call of spy.mock.calls as Array<[{ ref?: string }]>) {
      expect(call[0].ref).toBe('my-branch');
    }
  });

  it('skips files that fail to fetch (404-like errors)', async () => {
    const tree = makeTree(['src/auth/login.ts', 'README.md']);
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn(({ path }: { path: string }) => {
            if (path === 'src/auth/login.ts') return Promise.reject(new Error('Not Found'));
            return Promise.resolve({
              data: {
                content: Buffer.from('readme content').toString('base64'),
                encoding: 'base64',
              },
            });
          }),
        },
      },
    } as unknown as Octokit;

    const result = await buildAgentContexts(octokit, 'o', 'r', [], tree);
    const securityPaths = result.security.map((f) => f.path);
    expect(securityPaths).not.toContain('src/auth/login.ts');
  });
});
