#!/usr/bin/env bash
# stop + postToolUse(Write) hook: if TS/config files changed, run typecheck + lint + unit tests (quiet).
# Clean or nothing changed -> {}.  Failure -> {"followup_message": "<short tail of errors>"} (loop_limit caps retries).
set -u
DONE=0
trap '[ "$DONE" = 1 ] || printf "{}\n"' EXIT
input=$(cat 2>/dev/null || true)
status="" root="" event=""
if command -v jq >/dev/null 2>&1; then
  event=$(printf '%s' "$input" | jq -r '.hook_event_name // ""' 2>/dev/null) || event=""
  status=$(printf '%s' "$input" | jq -r '.status // ""' 2>/dev/null) || status=""
  root=$(printf '%s' "$input" | jq -r '.workspace_roots[0] // ""' 2>/dev/null) || root=""
fi
[ "$event" = "postToolUse" ] || [ "$status" = "completed" ] || [ -z "$status" ] || exit 0
root=${root:-${CURSOR_PROJECT_DIR:-$PWD}}
cd "$root" 2>/dev/null || exit 0
[ -x node_modules/.bin/tsc ] || exit 0
changed=$({ git diff --name-only; git diff --cached --name-only; git ls-files --others --exclude-standard; } 2>/dev/null \
  | grep -E '\.(ts|mts|json)$|^(index\.html|vite\.config\.ts|tsconfig.*\.json|eslint\.config\.[mc]?js)$' | grep -v '^\.cursor/' | head -n1)
[ -n "$changed" ] || exit 0
T="timeout 50"; command -v timeout >/dev/null 2>&1 || T=""
fail="" out=""
run() { local o; o=$($T "$@" 2>&1) || { fail="$*"; out=$(printf '%s\n' "$o" | grep -vE '^\s*$' | tail -n 15); return 1; }; }
if [ "$event" = "postToolUse" ]; then
  # after each edit: fast typecheck only (tests/lint run on stop)
  run npm run -s typecheck
else
  run npm run -s typecheck && run npm run -s lint && run npx --no-install vitest run --reporter=dot --passWithNoTests
fi
[ -n "$fail" ] || exit 0
msg="Verify hook: '$fail' failed. Fix only these errors (small diff), then stop:
$out"
if [ "$event" = "postToolUse" ]; then key=additional_context; else key=followup_message; fi
jq -cn --arg k "$key" --arg m "$msg" '{($k):$m}' 2>/dev/null || printf '{"followup_message":"Verify hook: %s failed; run it and fix."}\n' "${fail//\"/}"
DONE=1
