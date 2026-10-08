# Module

Implement **one** module from `docs/private/BRIEF.md` §4. The user should name the module: `mistakes` | `courses` | `mindmap` | `voice` | `anki` | `feynman` | `interleave` (or letter a–g).

## Workflow
1. **Plan** — Read the module's §4 subsection and acceptance criteria. List files to add/change under `src/modules/<name>/` and any shared `agent/`, `memory/`, or `ui/` touch points. Keep scope to this module only.
2. **Code** — Follow `.cursor/rules/10-project-conventions.mdc`, `20-pedagogy-prompts.mdc`, `30-design-system.mdc`, `40-security-secrets.mdc`. English UI; validated JSON for every LLM call.
3. **Tests** — Colocated vitest for logic and validators; e2e only if the brief requires it for this module.
4. **tester** subagent — `npm run typecheck && npm run lint && npm test && npm run build`; fix until green.
5. **pedagogy-reviewer** subagent — readonly PASS/FAIL per acceptance criterion; fix any FAIL before finishing.

## Done when
- All AC from the brief for that module are PASS from pedagogy-reviewer.
- Tester reports green.
- No secrets committed; settings/keys stay out of exports.

Summarize: what was built, test counts, pedagogy table, and any brief deviations (one line each).
