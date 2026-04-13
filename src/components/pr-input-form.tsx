'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReviewResult } from '@/lib/schemas';

export function PrInputForm() {
  const router = useRouter();
  const [prUrl, setPrUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, string> = { prUrl, apiKey };
      if (githubToken.trim()) body.githubToken = githubToken.trim();

      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ReviewResult | { error: string } = await res.json();

      if (!res.ok || 'error' in data) {
        setError('error' in data ? data.error : `Request failed (${res.status})`);
        return;
      }

      try {
        sessionStorage.setItem(`review:${data.id}`, JSON.stringify(data));
      } catch {
        // sessionStorage may be unavailable (private mode, quota) — still navigate
      }

      router.push(`/review/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pr-url">GitHub PR URL</Label>
        <Input
          id="pr-url"
          type="url"
          placeholder="https://github.com/owner/repo/pull/123"
          value={prUrl}
          onChange={e => setPrUrl(e.target.value)}
          required
          disabled={loading}
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="api-key">Anthropic API Key</Label>
        <Input
          id="api-key"
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          required
          disabled={loading}
          className="h-9 text-sm font-mono"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowGithubToken(prev => !prev)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <span>{showGithubToken ? '▲' : '▶'}</span>
          GitHub token (optional — needed for private repos)
        </button>

        {showGithubToken && (
          <Input
            id="github-token"
            type="password"
            placeholder="ghp_..."
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            disabled={loading}
            className="h-9 text-sm font-mono"
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Running review...
          </span>
        ) : (
          'Review PR'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your API key is sent directly to our server, used only for this request, and never stored.
        GitHub token is optional and only needed for private repositories.
      </p>
    </form>
  );
}
