import type { Octokit } from 'octokit';
import type { PrFile, PrTreeEntry } from './pr';

export interface ContextFile {
  path: string;
  content: string;
}

export type AgentContexts = Record<string, ContextFile[]>;

// ---------------------------------------------------------------------------
// File selection helpers
// ---------------------------------------------------------------------------

function selectSecurityFiles(repoTree: PrTreeEntry[]): string[] {
  const matched: string[] = [];

  for (const entry of repoTree) {
    if (entry.type !== 'blob') continue;
    const p = entry.path;
    if (/auth/i.test(p) || /middleware/i.test(p) || /security/i.test(p) || /guard/i.test(p)) {
      matched.push(p);
    }
  }

  // Always include .env.example if it exists in the tree
  const envExample = repoTree.find((e) => e.type === 'blob' && e.path === '.env.example');
  if (envExample && !matched.includes('.env.example')) {
    matched.unshift('.env.example');
  }

  return matched.slice(0, 8);
}

function selectChangeImpactFiles(changedFiles: PrFile[], repoTree: PrTreeEntry[]): string[] {
  const results: string[] = [];

  // Always include root config files if present
  for (const config of ['package.json', 'tsconfig.json']) {
    if (repoTree.some((e) => e.type === 'blob' && e.path === config)) {
      results.push(config);
    }
  }

  // Collect unique directories of changed files
  const changedDirs = new Set<string>();
  for (const f of changedFiles) {
    const parts = f.filename.split('/');
    if (parts.length > 1) {
      changedDirs.add(parts.slice(0, -1).join('/'));
    }
  }

  // Changed file paths as a set for dedup
  const changedPaths = new Set(changedFiles.map((f) => f.filename));

  // Add sibling files (same directory, .ts/.tsx/.js/.jsx, not the changed file itself)
  for (const dir of changedDirs) {
    for (const entry of repoTree) {
      if (entry.type !== 'blob') continue;
      if (!entry.path.startsWith(dir + '/')) continue;
      // Must be a direct sibling (no further nesting)
      const rest = entry.path.slice(dir.length + 1);
      if (rest.includes('/')) continue;
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.path)) continue;
      if (changedPaths.has(entry.path)) continue;
      if (!results.includes(entry.path)) {
        results.push(entry.path);
      }
    }
  }

  return results.slice(0, 10);
}

function selectTestGapFiles(changedFiles: PrFile[], repoTree: PrTreeEntry[]): string[] {
  const results: string[] = [];
  const treePaths = new Set(repoTree.filter((e) => e.type === 'blob').map((e) => e.path));

  // Test configs
  for (const config of ['vitest.config.ts', 'jest.config.ts', 'jest.config.js']) {
    if (treePaths.has(config)) results.push(config);
  }

  // Heuristic: src/x.ts → tests/x.test.ts, src/__tests__/x.test.ts
  for (const f of changedFiles) {
    if (!/\.(ts|tsx|js|jsx)$/.test(f.filename)) continue;

    // Derive base name without extension
    const withoutExt = f.filename.replace(/\.(ts|tsx|js|jsx)$/, '');
    const basename = withoutExt.split('/').pop()!;

    // Pattern 1: replace leading src/ with tests/ and append .test.EXT
    const exts = ['ts', 'tsx', 'js', 'jsx'];
    if (f.filename.startsWith('src/')) {
      const middle = withoutExt.slice('src/'.length);
      for (const ext of exts) {
        const candidate = `tests/${middle}.test.${ext}`;
        if (treePaths.has(candidate) && !results.includes(candidate)) {
          results.push(candidate);
        }
      }
    }

    // Pattern 2: __tests__ sibling
    const dir = f.filename.split('/').slice(0, -1).join('/');
    for (const ext of exts) {
      const candidate = dir ? `${dir}/__tests__/${basename}.test.${ext}` : `__tests__/${basename}.test.${ext}`;
      if (treePaths.has(candidate) && !results.includes(candidate)) {
        results.push(candidate);
      }
    }

    // Pattern 3: same dir, x.test.EXT
    for (const ext of exts) {
      const candidate = dir ? `${dir}/${basename}.test.${ext}` : `${basename}.test.${ext}`;
      if (treePaths.has(candidate) && !results.includes(candidate)) {
        results.push(candidate);
      }
    }
  }

  return results.slice(0, 6);
}

function selectDocsFiles(changedFiles: PrFile[], repoTree: PrTreeEntry[]): string[] {
  const results: string[] = [];
  const treePaths = new Set(repoTree.filter((e) => e.type === 'blob').map((e) => e.path));

  // Always include README.md if present
  if (treePaths.has('README.md')) results.push('README.md');

  // .d.ts files for changed modules
  for (const f of changedFiles) {
    if (!/\.(ts|tsx|js|jsx)$/.test(f.filename)) continue;
    const dts = f.filename.replace(/\.(ts|tsx|js|jsx)$/, '.d.ts');
    if (treePaths.has(dts) && !results.includes(dts)) {
      results.push(dts);
    }
  }

  return results.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string> {
  const params: { owner: string; repo: string; path: string; ref?: string } = { owner, repo, path };
  if (ref !== undefined) params.ref = ref;

  const response = await octokit.rest.repos.getContent(params);
  const data = response.data as { content?: string; encoding?: string };

  if (data.encoding === 'base64' && data.content) {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
  }

  return (data.content as string) ?? '';
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export async function buildAgentContexts(
  octokit: Octokit,
  owner: string,
  repo: string,
  changedFiles: PrFile[],
  repoTree: PrTreeEntry[],
  ref?: string,
): Promise<AgentContexts> {
  const securityPaths = selectSecurityFiles(repoTree);
  const changeImpactPaths = selectChangeImpactFiles(changedFiles, repoTree);
  const testGapPaths = selectTestGapFiles(changedFiles, repoTree);
  const docsPaths = selectDocsFiles(changedFiles, repoTree);

  // Deduplicate all paths for a single batch fetch
  const allPaths = Array.from(
    new Set([...securityPaths, ...changeImpactPaths, ...testGapPaths, ...docsPaths]),
  );

  const fetched = await Promise.all(
    allPaths.map(async (p) => {
      try {
        const content = await fetchFileContent(octokit, owner, repo, p, ref);
        return { path: p, content } satisfies ContextFile;
      } catch {
        return null;
      }
    }),
  );

  const fileMap = new Map<string, ContextFile>();
  for (const f of fetched) {
    if (f != null) fileMap.set(f.path, f);
  }

  const resolve = (paths: string[]): ContextFile[] =>
    paths.map((p) => fileMap.get(p)).filter((f): f is ContextFile => f != null);

  return {
    security: resolve(securityPaths),
    'change-impact': resolve(changeImpactPaths),
    'test-gap': resolve(testGapPaths),
    docs: resolve(docsPaths),
  };
}
