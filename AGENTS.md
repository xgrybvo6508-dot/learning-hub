# AGENTS.md — Learning Hub

Guide for any coding agent working in this repo. Full plan: [`PLAN.md`](PLAN.md). Product spec: [`docs/private/BRIEF.md`](docs/private/BRIEF.md) (gitignored; read on box only).

## Project summary

**Learning Hub** is a static, offline-first PWA for Vladislav (18, autism + ADHD, 2e): hand-drawn mind maps, course organization, mistake log with spaced re-check, Anki deck export, Feynman probing (no lecturing), daily interleaving, and a voice/research window. Study data stays on-device. LLM features use a user-supplied OpenAI-compatible API key in **localStorage** only, with clipboard + Grok Bot fallbacks. **UI: simple literal English.** AI feedback language is a Settings field (default Russian). Deploy: GitHub Pages at `https://xgrybvo6508-dot.github.io/learning-hub/` (`base: '/learning-hub/'`).

**Status:** P0 done (`.cursor/`, `content/courses/`, docs). Phase 1 bootstraps `src/` by copying/adapting `/workspace/discrete-tasks` (read-only).

## Stack

- Vite 8 + vanilla strict TypeScript (no UI framework). Runtime: `katex`, `workbox-window`; add `mermaid` (lazy), `sql.js` + wasm, `jszip` (`.apkg`).
- Tooling: `vite-plugin-pwa` (`registerType: 'prompt'`), vitest + happy-dom + fake-indexeddb, eslint, prettier, tsx, Playwright. Node ≥ 20.19.
- Hash routes (`#/`, `#/mindmap`, … `#/settings`, `#/data`). Bootstrap: `src/main.ts` → `src/ui/app.ts`.

## Folder layout

```
src/main.ts
src/lib/              # guards, result, time, dom, markdown, math, ids, …
src/memory/           # schema, migrate, store, srs, interleave-picker, storage/
src/agent/            # client, settings, errors, extract-json, prompts/, validators/
src/modules/          # mistakes, courses, mindmap, anki, feynman, interleave, voice
src/ui/               # app.ts, tokens/base/components CSS, views, components
content/courses/      # bundled Markdown (build-time glob)
scripts/              # sync-courses.ts, icons, optional vision-smoke
e2e/                  # Playwright
.cursor/              # rules, agents, commands, hooks
```

Tests: colocated `*.test.ts`. See `PLAN.md` §2–§3 for data stores and module map.

## `.cursor` rules (always follow)

| File | When it applies |
|------|-----------------|
| `rules/00-user-context.mdc` | Product/UX: one task in focus, calm ADHD-friendly UI, mind maps + interleaving |
| `rules/10-project-conventions.mdc` | Stack, layout, strict TS, migrations, npm scripts |
| `rules/20-pedagogy-prompts.mdc` | `src/agent/**`, `src/modules/**`: no lecturing, JSON contracts, mind-map skill |
| `rules/30-design-system.mdc` | `src/ui/**`: tokens, spacing, green/purple semantics, a11y |
| `rules/40-security-secrets.mdc` | Keys in localStorage only, no secrets in logs/export, CSP, calm API errors |

## Hooks (`.cursor/hooks.json`)

| Script | Event | Purpose |
|--------|--------|---------|
| `guard-shell.sh` | beforeShell | Deny force-push, destructive `rm`, `~/.hermes`, secret env dumps, curl\|bash, etc. |
| `guard-read.sh` | beforeReadFile | Block `.env*` (except templates), keys, `auth.json`, `hosts.yml` |
| `post-edit.sh` | afterFileEdit | Prettier on edited `src/` and root config files |
| `secret-scan.sh` | stop | Scan changes for API keys/tokens; returns follow-up if found |

Test: `bash .cursor/hooks/test-hooks.sh`. Pre-ship: `bash .cursor/hooks/secret-scan.sh < /dev/null` → `{}`.

## Sub-agents (`.cursor/agents/`)

| Agent | Use when |
|-------|----------|
| **tester** | After any code change; end of every implementation phase. Runs typecheck, lint, test, build. |
| **ui-designer** | UI/CSS/HTML; iPad layout; screenshot review (P9). |
| **prompt-author** | New/changed `src/agent/prompts/**` or LLM JSON validators. |
| **pedagogy-reviewer** | Readonly PASS/FAIL vs BRIEF §4 AC per module; run after module work. |

## Commands (`.cursor/commands/`)

| Command | Use when |
|---------|----------|
| `/module <name>` | Implement one module (`mistakes` \| `courses` \| `mindmap` \| `voice` \| `anki` \| `feynman` \| `interleave`). Ends with tester + pedagogy-reviewer. |
| `/review` | Light review of current changes: tester → pedagogy (if module/prompts) → ui-designer. |
| `/ship` | Release checklist: typecheck, lint, test, build, base path, secret scan; deploy steps only if user asks. |

## Definition of Done (every phase)

1. `npm run typecheck && npm run lint && npm test && npm run build` — all green.
2. **tester** sub-agent reports PASS on those steps.
3. Module phases: **pedagogy-reviewer** PASS/FAIL table — all AC PASS before done.
4. No secrets committed; exports exclude settings/keys.

## Build phases (strict order)

| Phase | Scope | Sub-agents / command |
|-------|--------|----------------------|
| **P0** | `.cursor/*`, `content/courses`, docs | Done |
| **P1** | Core scaffold from discrete-tasks, `AGENTS.md`, empty home/settings/data | tester, ui-designer; `/review` |
| **P2** | **(c) Mindmap** | prompt-author, pedagogy-reviewer, ui-designer, tester; `/module mindmap` |
| **P2b** | First Pages deploy | tester; `/ship` |
| **P3** | **(b) Courses** | tester, pedagogy-reviewer; `/module courses` |
| **P4** | **(a) Mistakes** | tester, pedagogy-reviewer; `/module mistakes` |
| **P5** | **(e) Anki** | prompt-author, tester; `/module anki` |
| **P6** | **(f) Feynman** | prompt-author, pedagogy-reviewer, tester; `/module feynman` |
| **P7** | **(g) Interleave** | tester, pedagogy-reviewer; `/module interleave` |
| **P8** | **(d) Voice** | prompt-author, ui-designer, tester; `/module voice` |
| **P9** | iPad polish, `e2e/screenshots.spec.ts` | ui-designer, tester; `/review` |

Do not skip order. Copy patterns from `/workspace/discrete-tasks` where `PLAN.md` says so; omit discrete-tasks-only bank/practice code.

## Hard limits

- **No secrets** in repo, logs, commits, or delivery reports. Only `.env.example` with placeholders. API key **only** in `localStorage` (`lh:settings`); never in export JSON.
- **Never** `git push --force` / `-f` / `--force-with-lease` / `+refspec`.
- **Never** read or touch `~/.hermes`.
- **`/workspace/discrete-tasks`** — read and copy only; do not modify.
- **`docs/private/`** and test fixtures with real secrets are gitignored; keep private, do not commit.
- No telemetry, CDNs, or external fonts. KaTeX/Mermaid/sql.js bundled and precached.
- Memory: versioned schema + migrations; never silently drop user data.

## npm scripts

`dev` · `build` · `preview` · `test` · `lint` · `typecheck` · `format` — see `package.json` after P1.
