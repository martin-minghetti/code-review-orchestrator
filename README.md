# Code Review Orchestrator

> Paste a GitHub PR URL. 4 AI agents review it in parallel. Get a unified report in seconds.

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Code Review Orchestrator" width="700">
</p>

Security Scanner, Change Impact Analyzer, Test Gap Detector, and Documentation Verifier run simultaneously via Claude. Each finding includes the exact file, line, evidence quote, and a concrete fix — not vague suggestions.

---

## Try It

Three precomputed demos load instantly — no API key needed:

| Demo | What it shows |
|------|---------------|
| **Security Issues** | Hardcoded secrets, missing auth check — critical findings from Security Scanner |
| **Clean PR** | Well-structured refactor with tests and docs — all agents return LGTM |
| **Mixed** | Warnings across multiple agents — shows how findings are grouped and scored |

<p align="center">
  <img src="docs/screenshots/demo-report.png" alt="Demo review report" width="700">
</p>

---

## How It Works

<p align="center">
  <img src="docs/architecture.svg" alt="Architecture" width="600">
</p>

1. **Parse & fetch** — The PR URL is parsed, the GitHub API returns the diff, changed files, and repo tree.
2. **Build context** — For each agent, relevant files are fetched from the repo (existing tests for the test-gap agent, config files for security, etc.).
3. **Run agents in parallel** — All four call Claude simultaneously via `Promise.allSettled`. If one fails, the others still complete.
4. **Unify & score** — Findings are aggregated by severity. A plain-English assessment is generated: LGTM, REVIEW SUGGESTED, or NEEDS WORK.

---

## Run Locally

```bash
git clone https://github.com/martin-minghetti/code-review-orchestrator.git
cd code-review-orchestrator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The three demos work immediately.

For live reviews of real PRs, create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...          # optional — for private repos or rate limits
```

---

## BYOK — Bring Your Own Key

Your API key is sent to this server, used once to call the Anthropic API, and never stored or logged. The key is read from the request body, passed to the agent runner, and discarded. Source: [`src/app/api/review/route.ts`](src/app/api/review/route.ts).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| AI | Vercel AI SDK v6 + Claude Sonnet & Haiku |
| GitHub | Octokit v5 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validation | Zod v4 |
| Testing | Vitest (65 tests) |
| Deploy | Vercel |

---

## Design Decisions

**Why no AST parsing?** Claude understands code structure from raw diffs and surrounding context. AST would add complexity and a native dependency without improving output quality at this scope.

**Why not streaming per-finding?** All agents run in parallel and resolve via `Promise.allSettled`. The unified assessment depends on counts across all agents, so results are returned as a single payload.

**Why no login?** The tool is stateless. Reviews are cached in-memory by commit SHA. There's nothing to persist and no reason to require an account.

**Why no numeric score?** "72/100" implies false precision. Three states — LGTM / REVIEW SUGGESTED / NEEDS WORK — map directly to the decision a reviewer needs to make.

---

## License

MIT
