'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDemoById } from '@/lib/demos';
import { AGENT_IDS } from '@/lib/agents/config';
import type { ReviewResult } from '@/lib/schemas';
import { ExecutiveSummary } from '@/components/executive-summary';
import { AgentCard } from '@/components/agent-card';
import { ContextInspector } from '@/components/context-inspector';
import { CopyMarkdownButton } from '@/components/copy-markdown-button';

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // 1. Check demos first
    const demo = getDemoById(id);
    if (demo) {
      setResult(demo);
      setLoading(false);
      return;
    }

    // 2. Check sessionStorage
    try {
      const stored = sessionStorage.getItem(`review:${id}`);
      if (stored) {
        setResult(JSON.parse(stored) as ReviewResult);
        setLoading(false);
        return;
      }
    } catch {
      // sessionStorage unavailable
    }

    // 3. Fetch from API
    fetch(`/api/review?id=${encodeURIComponent(id)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok || 'error' in data) {
          setError('error' in data ? (data as { error: string }).error : `Not found (${res.status})`);
        } else {
          setResult(data as ReviewResult);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load review');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Loading review…</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold">Review not found</p>
          <p className="mt-1 text-sm text-muted-foreground">{error ?? 'This review does not exist or has expired.'}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const { pr, summary, agentResults, contextByAgent } = result;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              ← Back
            </Link>
            <p className="text-xs font-mono text-muted-foreground">
              {pr.owner}/{pr.repo} #{pr.number} · @{pr.author} · {pr.headSha.slice(0, 7)}
            </p>
            <h1 className="text-xl font-semibold leading-snug">{pr.title}</h1>
          </div>
          <CopyMarkdownButton result={result} />
        </div>

        {/* Executive Summary */}
        <ExecutiveSummary summary={summary} />

        {/* Agent Cards 2x2 grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AGENT_IDS.map(agentId => {
            const agentResult = agentResults.find(r => r.agent === agentId);
            if (!agentResult) return null;
            return <AgentCard key={agentId} result={agentResult} />;
          })}
        </div>

        {/* Context Inspector */}
        <ContextInspector contextByAgent={contextByAgent} />
      </div>
    </div>
  );
}
