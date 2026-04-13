import { NextRequest, NextResponse } from 'next/server';
import { parsePrUrl } from '@/lib/github/parse-pr-url';
import { createGitHubClient } from '@/lib/github/client';
import { fetchPrData } from '@/lib/github/pr';
import { buildAgentContexts } from '@/lib/github/context-builder';
import { runReview } from '@/lib/agents/orchestrator';
import { reviewCache, buildCacheKey } from '@/lib/cache';

export const maxDuration = 300;
export const runtime = 'nodejs';

function redactTokens(message: string): string {
  return message
    .replace(/sk-ant-[a-zA-Z0-9-]+/g, '[REDACTED]')
    .replace(/ghp_[a-zA-Z0-9]+/g, '[REDACTED]')
    .replace(/github_pat_[a-zA-Z0-9_]+/g, '[REDACTED]');
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
  }
  const cached = reviewCache.get(id);
  if (!cached) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }
  return NextResponse.json(cached);
}

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prUrl, apiKey, githubToken } = (body ?? {}) as Record<string, unknown>;

  // 2. Validate inputs
  if (!prUrl || typeof prUrl !== 'string') {
    return NextResponse.json({ error: 'prUrl is required' }, { status: 400 });
  }
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
  }

  // 3. Parse PR URL
  const prRef = parsePrUrl(prUrl);
  if (!prRef) {
    return NextResponse.json({ error: 'Invalid GitHub PR URL' }, { status: 400 });
  }

  // 4. Create GitHub client
  const octokit = createGitHubClient(
    typeof githubToken === 'string' ? githubToken : undefined,
  );

  // 5. Fetch PR data
  let prData;
  try {
    prData = await fetchPrData(octokit, prRef);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'too many changed files') {
      return NextResponse.json(
        { error: 'PR has too many changed files (limit: 100)' },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: redactTokens(`GitHub error: ${message}`) },
      { status: 502 },
    );
  }

  const { pr, files, repoTree } = prData;

  // 6. Check cache
  const cacheKey = buildCacheKey(pr.owner, pr.repo, pr.number, pr.headSha);
  const cached = reviewCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 7. Build diff string from file patches
  const diff = files
    .filter((f) => f.patch)
    .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join('\n\n');

  // 8. Build per-agent context
  let contextByAgent;
  try {
    contextByAgent = await buildAgentContexts(
      octokit,
      pr.owner,
      pr.repo,
      files,
      repoTree,
      pr.headRef,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: redactTokens(`Failed to build context: ${message}`) },
      { status: 502 },
    );
  }

  // 9. Run review
  let result;
  try {
    result = await runReview({
      apiKey,
      pr: {
        owner: pr.owner,
        repo: pr.repo,
        number: pr.number,
        title: pr.title,
        author: pr.author,
        headSha: pr.headSha,
        description: pr.description,
      },
      diff,
      changedFiles: files,
      contextByAgent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: redactTokens(`Review failed: ${message}`) },
      { status: 500 },
    );
  }

  // 10. Cache result
  reviewCache.set(cacheKey, result);

  // 11. Return result
  return NextResponse.json(result);
}
