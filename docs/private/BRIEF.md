# Build brief: `learning-hub` PWA (for the Cursor bot)

Owner: Vladislav (18, autism + ADHD, 2e). He studies with hand-drawn mind maps (Goodnotes on iPad), interleaving, Anki and the Feynman method.
Context: `/workspace/learning-system/map.md` (his "learning system" map, decoded). This brief is self-contained.

## 0. How to build (Cursor through the terminal)
- Use the Cursor CLI on the box (`~/.local/bin/agent`, v2026.10.01, logged in). Run headless phases like discrete-tasks did:
  `agent -p --output-format stream-json "<phase prompt>" > .cursor-runs/NN-name.jsonl 2> .cursor-runs/NN-name.err`
  Keep each phase prompt in `.cursor-runs/NN-name.prompt.md` and summarize with `.cursor-runs/status.sh` (copy it from discrete-tasks).
- Project dir: `/workspace/learning-hub`. Phase 1 writes `PLAN.md` + `AGENTS.md`; later phases implement the plan module by module.
- **Copy and adapt `.cursor/` from `/workspace/discrete-tasks`.** Rename every "Discrete Tasks"/`/discrete-tasks/` to "Learning Hub"/`/learning-hub/`:
  - rules: `00-user-context`, `10-project-conventions`, `30-design-system`, `40-security-secrets` (keep as-is apart from names), plus a new `20-pedagogy-prompts.mdc` (globs `src/agent/**`, `src/modules/**`): no lecturing, short output, JSON contracts, map-skill rules.
  - hooks (`.cursor/hooks.json`): `guard-shell.sh`, `guard-read.sh`, `post-edit.sh` (prettier), `secret-scan.sh` on stop. Run `bash .cursor/hooks/test-hooks.sh` after copying.
  - sub-agents (`.cursor/agents/`): keep `tester` and `ui-designer`; add `prompt-author` (writes and tests LLM prompts + JSON validators) and `pedagogy-reviewer` (checks each module against the acceptance criteria below, ADHD load, no lecturing).
  - commands: `/review`, `/ship` (adapted to `/learning-hub/`).
- Cloud agents are optional: once the repo is on GitHub, independent modules (e.g. Anki export, voice window) may run as parallel cloud agents on branches, merged by normal PRs. Never force-push.
- Done for any phase = `npm run typecheck`, `lint`, `test`, `build` all green, plus the `tester` sub-agent pass.

## 1. Stack and design: reuse discrete-tasks exactly
- **Vite 8 + vanilla strict TypeScript** (no frameworks), `vite-plugin-pwa` (registerType `prompt`, quiet "new version ready" line), `workbox-window`, `vitest` + `happy-dom` + `fake-indexeddb`, `eslint` (typescript-eslint), `prettier`, `tsx`, `@playwright/test` e2e. Node ≥ 20.19. KaTeX bundled locally for math.
- Copy these and adapt: `src/lib/*` (guards, result, time, dom), `src/memory/storage/*` (IndexedDB + localStorage adapters, versioned schema, migrations, corrupt-data quarantine), `src/memory/srs.ts` (SM-2) and `picker.ts` (interleaving), `src/agent/*` (client, settings, errors, extract-json), `src/ui/tokens.css`, `base.css`, `components.css`, `components/top-bar.ts`, `components/update-prompt.ts`, the `vite.config.ts` CSP plugin, `public/icons` generation, `e2e/` setup, `.github/workflows/deploy.yml`.
- Design tokens (from `src/ui/tokens.css`; never hard-code colors elsewhere):
```css
--bg:#0e0f13; --surface:#161820; --surface-2:#1d2029; --border:#2a2e3a;
--text:#e7e9ee; --muted:#9aa0ad;
--green:#3ddc97;  --green-soft:rgb(61 220 151 / .12);   /* primary action, success, progress */
--purple:#a78bfa; --purple-soft:rgb(167 139 250 / .12); /* anything from the AI */
--warn:#f5b971; /* calm amber, never red */  --on-accent:#0e0f13;
--radius:12px; --radius-lg:16px; spacing 4/8/12/16/24/32/48/64px;
--font: system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
--mono: ui-monospace,'SF Mono',Menlo,Consolas,monospace;
text 14/17/20/26/32px, weights 400/600, line-height 1.6, --measure:68ch, --column:720px,
--tap:44px, --motion:180ms ease-out; theme_color/background_color #0e0f13
```
- Rules: dark only, one task in focus, at most one filled accent button per screen, opacity/transform motion only (off under `prefers-reduced-motion`), AA contrast, green focus ring (purple inside AI panels), inputs ≥ 16px, `env(safe-area-inset-*)`, touch targets ≥ 44px. **UI language: English**; AI feedback language is a setting (default Russian, he thinks in RU+EN).
- Navigation: a quiet home screen with 7 module tiles + Settings + Data; on iPad landscape a slim left rail is fine (not on solving screens).

## 2. Data, privacy, offline
- Local-first: one IndexedDB DB `learning-hub` (versioned schema + migrations, never silently drop data; localStorage fallback as in discrete-tasks).
- **Data screen:** export everything as one JSON file (`learning-hub-YYYY-MM-DD.json`), import with merge/replace, reset with confirmation. Exports never contain settings or keys.
- Fully offline except LLM calls; every AI feature shows a calm message when offline/no key and offers the fallback.
- No telemetry, no CDNs, no external fonts. All libraries (KaTeX, Mermaid, sql.js wasm) are bundled and precached.

## 3. LLM access (Settings)
- User-supplied key stored **only in localStorage** (`lh:settings`, versioned), password field with show/hide, "Test connection", "Forget key". Reuse `src/agent/settings.ts` + `client.ts` (OpenAI-compatible `POST {baseUrl}/chat/completions`, `Authorization: Bearer`, timeout via AbortController, JSON-mode retry without `response_format` on 400, typed `AgentError` with calm messages).
- Presets:
  - **Nous Portal** (same as discrete-tasks): base `https://inference-api.nousresearch.com/v1`, default text model as in discrete-tasks (`poolside/laguna-s-2.1:free`); "Test connection" lists `GET /models` so he can pick another.
  - **OpenRouter**: base `https://openrouter.ai/api/v1`. Free vision models confirmed live via `https://openrouter.ai/api/v1/models` on 2026-10-08 (input modalities include `image`): **`google/gemma-4-31b-it:free`** (262k ctx) as the default vision model, **`thinkingmachines/inkling:free`** (1M ctx) as an alternative (also `google/gemma-4-26b-a4b-it:free`). Re-check the list at build time and keep only ones that still exist. Send the `HTTP-Referer`/`X-Title` headers OpenRouter recommends.
  - Custom (any OpenAI-compatible URL; https only, http allowed only for localhost, as now).
- Two model fields: **text model** and **vision model** (the trainer uses the vision one). Extend `ChatMessage.content` to `string | ContentPart[]` (`{type:'text'}` / `{type:'image_url', image_url:{url:'data:image/jpeg;base64,…'}}`).
- CSP: keep the discrete-tasks policy; add `blob:` to `img-src`, `'wasm-unsafe-eval'` to `script-src` (sql.js), and only what Mermaid strictly needs (test it; if it needs inline `<style>`, allow `style-src 'unsafe-inline'` and note why in a comment).
- **Fallback when there is no key:** every AI action has a "Copy prompt + open Grok Bot" button: it copies the full prompt to the clipboard and opens the URL from Settings → "Grok Bot link" (empty by default → copy only, with a toast saying "Prompt copied, paste it into Grok Bot with your photo").

## 4. Modules and acceptance criteria

### (a) Mistakes review
Log a mistake: what went wrong, **cause category** (concept gap / misread task / careless slip / wrong method / memory lapse / time pressure), the correct fix (1–3 lines, KaTeX allowed), topic + course link, source (free text or link). A **spaced re-check queue** uses SM-2 from discrete-tasks (first checks at +1, +3, +7 days): "Re-check now" shows the mistake with the fix hidden → he attempts it → Got it / Partly / Missed.
- AC: create/edit/delete persists after reload; the queue shows only due items; outcome changes the next due date (unit-tested with a fake clock); filter by topic/cause; per-cause counts on a quiet stats strip; the queue feeds (g).

### (b) Course organizer
Imports course Markdown from `/workspace/learning-system/courses/*.md`: at build, copy that folder into `content/courses/` and bundle it (the folder may not exist yet → ship one sample course and still build). Also an in-app "Import .md" file picker (Files app on iPad). Parser is tolerant: `# Course`, `## Module …`, `- [ ]`/`- [x]` items or `###` lessons, optional frontmatter (`topics:`, `goal:`).
- Shows the module list with progress (done/total), a "Next session" card, session log (date, minutes, module, a 1-line note), and topics exported to (c), (e), (g).
- AC: re-import keeps progress (matches by slug); a malformed file shows a calm error, not a crash; course progress is in the JSON export.

### (c) Mindmapping trainer (the most important module)
Flow: pick a prompt → timer → he draws by hand in Goodnotes → uploads/pastes a photo → vision LLM feedback → score history.
- Prompts: from `courses/mindmapping-drills.md` (one drill per `##`/list item: a topic or a short text to map) and from course modules; if the file is missing, ship ~10 built-in drills (discrete math, learning science, neuropsychology, English). Modes: "Map this topic" / "Map this text" (the text is shown in a readable card).
- Timer: 5/10/15 min presets, a quiet elapsed ring, a soft single cue at the end, never red, can overrun.
- Image input: `<input type=file accept="image/*">` (camera, Photos, Files), paste (Goodnotes copy), drag & drop. Downscale on a canvas to ≤ 2048 px long side as JPEG; optional "detail mode" sends 2×2 overlapping tiles plus the overview (per the skill's self-zoom rule).
- Vision prompt = the mind-map skill embedded as `src/agent/prompts/mindmap-skill.md` (import `?raw`), copied from `/home/box/agent-data/workflows/read-handwritten-mind-maps/SKILL.md`, sections 3–5 verbatim: the **Legend** (→ leads to; ⇒ strong result; ↔ mutual link/interleaving; plain/wavy line = loose association; braces/brackets = one group; oval/circled = core concept, circled near the center = main goal; box = goal/unit/chunk; `[ ]` task; underline/double underline = emphasis/key; crossed out = dropped/replaced; `?`/`??` open question; `=` definition/outcome; `+ ИИ` = AI in the loop; times = schedule block; `√…` = evaluate), the **drawings and math** rules, the **accuracy rules** (never put an unread word or a guessed arrow in the outline, it goes under `?`; don't complete the map from world knowledge; an uncertain edge beats a wrong tree; don't narrate). Plus his **personal glossary** (editable in the app, appended to the prompt; corrections win).
- Two steps in one call: first read the map (what is written vs interpretation), then critique it against the drill. Required JSON:
  `{read:{core, clusters:[{name, nodes[]}], relations:[{from,to,label|null}], unreadable[]}, scores:{structure, chunking, relations, coverage, overall} (0–10), strengths[≤3], issues:[{type:'structure'|'grouping'|'relations'|'gap'|'missing', detail}] (≤5), missing[≤5], nextDrill}`.
  Criteria (Justin Sung-style): few strong clusters instead of lists, chunking/grouping, relations drawn **and labeled**, non-linear links across clusters, minimal words, a clear center, what's missing for the given topic/text.
- Validate JSON with a strict validator (reuse `extract-json.ts`); show an "I couldn't read this part" list instead of guesses.
- Score history: list + SVG sparkline per criterion, saving drill, date, time used, scores and a thumbnail (≤ 300 px, kept in IndexedDB); "Redo this drill" button.
- No key → "Copy prompt + open Grok Bot" (the same skill prompt + drill text; he attaches the photo himself).
- AC: unit tests for the prompt builder (legend and accuracy rules present, glossary appended), the JSON validator (fenced JSON, missing fields, out-of-range scores) and image downscaling; e2e with a mocked fetch renders the feedback card and adds a history point; one real call with a sample map (`/workspace/learning-system/map.jpg`) via an OpenRouter free vision model if a key is available on the box, otherwise report "needs key".

### (d) Voice window (iPad)
A full-screen calm view with one big mic button (≥ 120 px, green ring while listening), a language toggle **ru-RU / en-US**, live transcript (editable textarea), and a mode toggle **Research / Visualization**.
- Web Speech API (`SpeechRecognition || webkitSpeechRecognition`, continuous, interim results). I'm not sure it works inside an installed iOS home-screen PWA: detect this, and if it fails show "Tap the textarea and use the keyboard mic (iPad dictation)" as the fallback. Same textarea either way.
- "Structure it" (LLM) → Research: a brief `{question, why, context, subQuestions[3–6], sourcesWanted, outputFormat}` rendered as Markdown; Visualization: a short explanation + **Mermaid** code (flowchart/mindmap) rendered offline by bundled, lazy-loaded Mermaid, with "Fix diagram" retry on a parse error.
- Actions: Copy, Share (`navigator.share`), Send to LLM (show the answer in a purple panel), Copy prompt + open Grok Bot. History of the last 20 requests.
- AC: works by typing alone with no mic permission; Mermaid renders offline; invalid Mermaid never blanks the screen.

### (e) Anki deck generator
Input: a topic, pasted notes, or a course module. The LLM drafts 8–15 **deep-connection cards**, each typed `why | how | contrast | link` (no trivia or bare definitions): `{front, back, type, tags[]}`. Editable table: edit, delete, add, reorder; KaTeX preview.
- Export **.apkg in the browser** (genanki-js approach: sql.js + bundled `sql-wasm.wasm` + JSZip, Basic note type, deck name = topic, tags incl. `type::why`) and **CSV** (`front;back;tags`, UTF-8 BOM). Also keep generated decks locally.
- AC: the .apkg opens in Anki/AnkiDroid. Verify on the box: unzip it, open `collection.anki2` with `sqlite3`/python, check the note count, fields and deck name match; CSV round-trips Cyrillic and LaTeX.

### (f) Feynman-check agent
He explains a concept in text or by voice (reuse the (d) recognizer) and can name the target audience ("a 12-year-old", "a first-year student").
- The agent **does not lecture or give the right explanation**. It returns `{gaps[], wrongAnalogies[], missingLinks[], jargonUnexplained[], questions[3]}` (3 probing questions, each answerable in 1–2 sentences). He answers → a second round, up to 3 rounds → a final "what's now solid / what's still open" list (no teaching unless he presses "Explain this gap"). Open gaps can be logged to (a) with one tap.
- AC: unit test that the system prompt forbids lecturing and the validator rejects responses without exactly 3 questions; e2e with mocked fetch runs one round.

### (g) Interleaving scheduler
Builds a **daily plan** of 2–4 short blocks (15/20/25 min, his choice), each with 3–5 items mixing topics and problem types across courses: due mistake re-checks from (a), next course sessions from (b), a mindmap drill from (c), Anki review/creation, a Feynman check. Reuse `picker.ts`: never the same topic twice in a row when alternatives exist, deterministic with a seed.
- The block view shows one item at a time with a "why this now" line, Done/Skip, and a gentle break screen between blocks. "Swap" replaces one item; "Too much today" shrinks the plan.
- AC: unit tests (no adjacent same-topic, due mistakes included first, empty pools handled); the plan persists for the day and regenerates the next day.

## 5. Deploy (GitHub Pages, account `xgrybvo6508-dot`; `gh` is logged in on the box)
- Repo: **`xgrybvo6508-dot/learning-hub`** (public; it doesn't exist yet). Vite `base: '/learning-hub/'`, manifest `start_url`/`scope` `/learning-hub/`, name "Learning Hub", short name "Hub", new icon (dark tile, green/purple mark).
- Create and push: `gh repo create xgrybvo6508-dot/learning-hub --public --source . --push`, enable Pages from Actions: `gh api -X POST repos/xgrybvo6508-dot/learning-hub/pages -f build_type=workflow`. Workflow = the discrete-tasks `deploy.yml` (push to main + dispatch, node 20, `npm ci` → `npm test` → `npm run build` → upload `dist` → `deploy-pages`). Watch it with `gh run watch`.
- Live URL: `https://xgrybvo6508-dot.github.io/learning-hub/`. Post-deploy checks: loads, installs (manifest valid, apple-touch-icon), works offline after the first visit (Playwright: SW ready → offline → reload).
- Pre-ship: `/ship` checklist + `secret-scan.sh` prints `{}`; no `.env*` except `.env.example`; never commit keys.

## 6. iPad testing
- Playwright screenshots of every module (home, (a)–(g), Settings, Data) at **1024×1366** and **820×1180** portrait plus both landscapes (`deviceScaleFactor: 2`, `hasTouch: true`), saved to `screenshots/`. Fix overflow, cut-off buttons and too-small tap targets, then re-shoot. Run `ui-designer` on the shots.
- Also one 390 px phone pass (he has a Pixel).

## 7. Delivery report (send back to the Grok Bot that dispatched you)
1. Live URL and repo URL (+ the Actions run link and its status).
2. Per module (a)–(g): works / partly / not done, one line each, with acceptance criteria PASS/FAIL.
3. **What needs a key:** which features, which preset/model was actually tested, which are untested without a key; the fallback behaviour.
4. Test counts (vitest, e2e), CSP changes and why, any known iOS issues (Web Speech in standalone mode, paste from Goodnotes).
5. Paths to the iPad screenshots on the box (`/workspace/learning-hub/screenshots/`).
6. Anything you decided differently from this brief, and why (one line each).

## Limits
Don't touch `/workspace/discrete-tasks` (read/copy only), `~/.hermes`, or other repos. No force-push. No secrets in the repo, logs or the report. If `courses/` or `mindmapping-drills.md` still don't exist, build with samples and say so in the report.
