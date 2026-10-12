# AGENTS.md — Reboard-AI course tracker (reboard-ai repo)

**Current scope:** a simple offline PWA that records Vladislav's courses → modules → pieces with done marks and progress. Nothing else. Full rules: `.cursor/rules/05-tracker-scope.mdc` (scope), `10-project-conventions.mdc` (stack/layout), `40-security-secrets.mdc` (safety). The design comes from Vladislav — don't build UI before he sends it.

`PLAN.md`, `docs/private/BRIEF.md` and code in `src/agent/`, `src/memory/`, `src/modules/*` describe the **old** multi-module Learning Hub. They are legacy: don't follow or extend them.

- Data: `/workspace/learning-system/courses-v2/{cursor,discrete,claude}.md`, bundled at build time.
- Stack: Vite + vanilla strict TS, vite-plugin-pwa, vitest; GitHub Pages `xgrybvo6508-dot/reboard-ai`, base `/reboard-ai/`.
- Hooks (`.cursor/hooks.json`): `guard-shell.sh` (blocks force-push, `rm -r` outside repo, `~/.hermes`, secret dumps, curl|sh), `guard-read.sh` (blocks secret files), `post-edit.sh` (prettier on edited src files), `secret-scan.sh` + `verify.sh` (typecheck after every edit; full typecheck+lint+tests on stop — stop does not fire in `cursor-agent -p`). Self-test: `bash .cursor/hooks/test-hooks.sh`.
- Agents: `tester`, `ui-designer`. Commands: `/review`, `/ship` (deploy only when asked).
- Done = `npm run typecheck && npm run lint && npm test && npm run build` green. Never push --force; never touch `~/.hermes`; no secrets anywhere.
