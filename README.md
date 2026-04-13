# Code Review Orchestrator

4 AI agents review your GitHub pull request in parallel — security, impact analysis, test gaps, and documentation.

<p align="center">
  <img src="docs/screenshots/landing.png" alt="Code Review Orchestrator landing page" width="700">
</p>

---

## How It Works

<p align="center">
  <img src="docs/architecture.svg" alt="Architecture diagram" width="600">
</p>

**Step by step:**

1. **Parse & fetch** — The PR URL is parsed, then the GitHub API returns the diff, changed files, and a shallow repo tree.
2. **Build context** — For each agent, relevant existing files are fetched from the repo (e.g., existing tests for the test-gap agent, config files for the security agent).
3. **Run agents in parallel** — All four agents call Claude simultaneously via `Promise.allSettled`. If one fails, the others still complete.
4. **Unify & score** — Findings are aggregated, counted by severity, and a plain-English assessment is generated.

---

## The Agents

| Agent | Model | What It Finds |
|-------|-------|---------------|
| Security Scanner | Claude Sonnet | Exposed secrets, missing auth checks, injection vectors, insecure dependencies |
| Change Impact Analyzer | Claude Sonnet | Separation of concerns violations, regression risk, deviations from repo patterns |
| Test Gap Detector | Claude Haiku | New code paths with no corresponding test, edge cases missing from existing tests |
| Documentation Verifier | Claude Haiku | Undocumented public API surface, exported functions without JSDoc, outdated README sections |

---

## Evidence-Based Findings

Every finding the agents return includes:

- **Severity** — `critical`, `warning`, or `info`
- **File + line reference** — pinned to the exact location in the diff
- **Evidence** — a direct quote or excerpt from the code under review
- **Recommendation** — a concrete suggested fix, not a generic prompt

The report never says "consider adding input validation" in the abstract — it shows you the specific function, the line, and what form the validation should take.

---

## Try the Demo

Three precomputed reviews load instantly — no API key required:

| Demo | What to expect |
|------|----------------|
| **Security Issues** | A PR with hardcoded secrets and a missing auth check — Security Scanner fires critical findings |
| **Clean PR** | A well-structured refactor with tests and docs — all agents return LGTM |
| **Mixed** | A real-world PR with warnings across multiple agents — shows how findings are grouped |

Click any demo card on the home page to see the full report.

<p align="center">
  <img src="docs/screenshots/demo-report.png" alt="Demo review report showing security findings" width="700">
</p>

---

## Run Locally

```bash
git clone https://github.com/martin-minghetti/code-review-orchestrator.git
cd code-review-orchestrator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The three demo reviews work immediately with no configuration.

**For live reviews of real PRs**, create a `.env.local` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

A GitHub token is optional — the app uses the public GitHub API by default, which handles most public repos. For private repos or to avoid rate limits, add:

```env
GITHUB_TOKEN=ghp_...
```

---

## BYOK — Bring Your Own Key

When you submit a live review, you paste your Anthropic API key into the form. Here is exactly what happens with it:

> Your API key is sent to this server, used once to call the Anthropic API, and never stored or logged. Source code is public — you can verify this yourself.

Relevant code: [`src/app/api/review/route.ts`](src/app/api/review/route.ts) — the key is read from the request body, passed to the agent runner, and discarded. It is never written to any log, database, or cache. The response cache stores only the review result, keyed by repo + PR number + commit SHA.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| AI SDK | Vercel AI SDK v6 (`@ai-sdk/anthropic`) |
| Models | Claude Sonnet (security, impact) · Claude Haiku (tests, docs) |
| GitHub client | Octokit v5 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Validation | Zod v4 |
| Testing | Vitest + Testing Library |
| Deploy | Vercel (Serverless Functions, 300s max duration) |

---

## Design Decisions

**Why no tree-sitter / AST parsing?**
The agents receive raw diffs and surrounding file context. Claude's understanding of code structure is sufficient for the findings this tool targets. AST parsing would add complexity and a native dependency without meaningfully improving output quality at this scope.

**Why does each agent complete before results appear, rather than streaming per-finding?**
All four agents run in parallel and resolve via `Promise.allSettled`. Results are returned as a single JSON payload when all agents finish. This keeps the report renderer simple and makes the unified assessment (which depends on counts across all agents) trivial to compute.

**Why no login / user accounts?**
The tool is stateless by design. Reviews are cached in-memory by commit SHA for the lifetime of the server process. There is nothing to persist across sessions, and no reason to require an account to use a tool that calls an API you're paying for directly.

**Why no numeric score?**
A score like "72/100" implies a precision that doesn't exist. The three-state assessment — LGTM / REVIEW SUGGESTED / NEEDS WORK — maps directly to the actual decision a reviewer needs to make: approve, comment, or request changes.

**Why TypeScript/JavaScript only?**
The GitHub context builder fetches file content from the repo to give agents relevant background. Scoping to TS/JS files keeps context focused and token-efficient. Adding language support is straightforward — the agents themselves are language-agnostic.

---

## License

MIT