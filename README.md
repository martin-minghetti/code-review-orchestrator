<div align="center">

# Code Review Orchestrator

**Paste a GitHub PR URL. 4 AI agents review it in parallel.**\
**Security, impact analysis, test gaps, and documentation — unified report in seconds.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-code--review--orchestrator.vercel.app-black?style=flat-square)](https://code-review-orchestrator.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_+_Haiku-cc785c?style=flat-square)](https://anthropic.com)
[![Tests](https://img.shields.io/badge/Tests-65_passing-brightgreen?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)]()

<img src="docs/screenshots/landing.png" alt="Code Review Orchestrator — landing page" width="700">

[Live Demo](https://code-review-orchestrator.vercel.app) | [Run Locally](#run-locally) | [How It Works](#how-it-works) | [Contributing](#contributing)

</div>

---

## The Problem

Code reviews are slow. Reviewers miss things because they're tired, unfamiliar with the codebase, or focused on logic while security issues slip through. Teams wait hours or days for a review that catches surface-level problems a machine could flag in seconds.

Existing AI review tools either give you vague suggestions ("consider improving error handling") or dump a wall of unstructured feedback with no connection to the actual code.

## The Solution

Code Review Orchestrator runs four specialized AI agents against your PR in parallel. Each agent focuses on one dimension of quality and receives only the files relevant to its job. In under 30 seconds, you get a single report where every finding is pinned to a specific file and line, backed by evidence from the code, with a concrete suggestion for how to fix it.

No vague advice. Every finding says exactly where, exactly what, and exactly how.

---

## The Agents

Each agent receives a tailored slice of the repository — not the entire codebase, but the files most relevant to its job. This keeps token usage efficient and findings precise.

| Agent | Model | What it reviews | Context it receives |
|-------|-------|-----------------|---------------------|
| **Security Scanner** | Claude Sonnet | Exposed secrets, missing auth checks, injection vectors, insecure dependencies | Config files, env examples, auth middleware, the diff |
| **Change Impact Analyzer** | Claude Sonnet | Separation of concerns violations, regression risk, deviations from repo patterns | Related modules, imports, existing architecture, the diff |
| **Test Gap Detector** | Claude Haiku | New code paths with no tests, edge cases missing from existing test suites | Existing test files, the diff, test config |
| **Documentation Verifier** | Claude Haiku | Undocumented public API, exported functions without JSDoc, outdated README | README, docs folder, public exports, the diff |

Sonnet handles the agents that need deeper reasoning (security, impact). Haiku handles the ones that are more pattern-matching (tests, docs). This balances cost and quality.

---

## What a Finding Looks Like

Every finding the agents return includes:

- **Severity** — `critical`, `warning`, or `info`
- **Confidence** — `high`, `medium`, or `low` (agents self-assess how certain they are)
- **File + line** — pinned to the exact location in the diff
- **Evidence** — a direct code quote showing the problem
- **Suggestion** — a concrete fix, not a generic recommendation

The report groups findings by agent and shows an overall assessment: **LGTM**, **REVIEW SUGGESTED**, or **NEEDS WORK**.

<p align="center">
  <img src="docs/screenshots/demo-report.png" alt="Demo report — security issues found in a PR" width="700">
</p>

---

## Try It — No API Key Needed

Three precomputed reviews load instantly from bundled JSON:

| Demo | What it shows |
|------|---------------|
| **Security Issues** | A PR that adds a raw SQL user search endpoint. The Security Scanner finds a critical SQL injection vulnerability and a hardcoded secret. The Change Impact Analyzer flags a missing auth check. |
| **Clean PR** | A well-structured refactor that extracts a shared utility module. All four agents return clean — no findings. |
| **Mixed** | A DataTable component PR with a warning about missing test coverage and an info-level note about undocumented props. Shows how findings from different agents are grouped together. |

Click any demo card on the [home page](https://code-review-orchestrator.vercel.app) to see the full report.

---

## How It Works

<p align="center">
  <img src="docs/architecture.svg" alt="Architecture diagram" width="600">
</p>

1. **Parse & fetch** — The PR URL is validated with Zod, then Octokit fetches the diff, list of changed files, and a shallow tree of the repository.

2. **Build context** — For each agent, a context builder selects the most relevant existing files from the repo. The Security Scanner gets config files and auth middleware. The Test Gap Detector gets existing test files. This is how agents "understand" the codebase beyond just the diff.

3. **Run agents in parallel** — All four agents call Claude simultaneously via `Promise.allSettled`. Each agent has its own system prompt with structured output (Zod schema). If one agent fails or times out, the others still complete and their findings appear in the report.

4. **Unify & score** — Findings from all agents are aggregated. The system counts criticals, warnings, and info items, then generates a plain-English assessment. No numeric scores — just three states that map to the decision a reviewer actually needs to make: approve, comment, or request changes.

---

## Run Locally

```bash
git clone https://github.com/martin-minghetti/code-review-orchestrator.git
cd code-review-orchestrator
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The three demo reviews work immediately with no configuration.

**To review real PRs**, create a `.env.local` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...          # optional — for private repos or to avoid rate limits
```

Or use the web form directly — paste your Anthropic API key in the form field. The key is sent to the server, used once to call the Claude API, and discarded. It is never stored, logged, or cached. You can verify this in [`src/app/api/review/route.ts`](src/app/api/review/route.ts).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Server components for the landing, client components for interactive report |
| AI | Vercel AI SDK v6 + `@ai-sdk/anthropic` | Structured output with Zod schemas, parallel agent execution |
| Models | Claude Sonnet (security, impact) · Claude Haiku (tests, docs) | Cost/quality balance — reasoning-heavy tasks get Sonnet |
| GitHub | Octokit v5 | Diff fetching, file content, repo tree traversal |
| UI | shadcn/ui + Tailwind CSS v4 | Dark/light theme, responsive layout |
| Validation | Zod v4 | Input validation, API response schemas, agent output schemas |
| Testing | Vitest + Testing Library (65 tests) | Unit tests for parsers, schemas, context builder, components |

---

## Design Decisions

**Why no AST parsing?**
The agents receive raw diffs and surrounding file context. Claude understands code structure well enough for the findings this tool targets — security issues, missing tests, undocumented APIs. AST parsing would add a native dependency (tree-sitter) and significant complexity without meaningfully improving output quality at this scope.

**Why `Promise.allSettled` instead of streaming per-finding?**
All four agents run in parallel and resolve together. The unified assessment at the top of the report depends on aggregate counts across all agents (e.g., "2 critical, 3 warnings"). Streaming individual findings would require either deferring the assessment or recomputing it as findings arrive. The current approach keeps the report renderer simple and the assessment accurate.

**Why no user accounts or login?**
The tool is stateless by design. Reviews are cached in-memory by `repo + PR number + commit SHA` for the lifetime of the server process. There's nothing to persist across sessions, and no reason to require an account to use a tool that calls an API you're already paying for.

**Why three assessment states instead of a numeric score?**
A score like "72/100" implies a precision that doesn't exist. The three states — LGTM / REVIEW SUGGESTED / NEEDS WORK — map directly to the three actions a code reviewer can take on a GitHub PR: approve, comment, or request changes. No ambiguity about what to do next.

**Why TypeScript/JavaScript only?**
The context builder fetches file content from the repo to give agents relevant background. Scoping to TS/JS files keeps context focused and token usage efficient. The agents themselves are language-agnostic in their prompts — adding more languages means extending the context builder to know which files matter for each language.

---

## Contributing

Contributions are welcome. Some areas where help would be useful:

- **Language support** — Extend the context builder to handle Python, Go, Rust, etc.
- **Agent improvements** — Better system prompts, new agent types (performance, accessibility)
- **UI/UX** — Report readability, mobile layout, diff viewer integration

To contribute:

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Open a PR

Please keep PRs focused — one feature or fix per PR.

---

## Community

- **Issues** — [GitHub Issues](https://github.com/martin-minghetti/code-review-orchestrator/issues) for bugs and feature requests
- **Discussions** — [GitHub Discussions](https://github.com/martin-minghetti/code-review-orchestrator/discussions) for questions and ideas

---

## License

MIT
