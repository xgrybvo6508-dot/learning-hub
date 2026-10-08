#!/bin/bash
# usage: pipeline.sh  — waits for a running 01-setup, then 02-plan -> 02b-agents -> 03-core -> 04-trainer, one cursor-agent at a time, local commits only
D=/workspace/learning-hub; cd "$D" || exit 1
L=.cursor-runs/pipeline.log; R=.cursor-runs/run.sh
log(){ echo "$(date '+%F %T') $*" >> $L; }
gate(){ ( npm run -s typecheck && npm run -s lint && npm test --silent && npm run -s build ) > .cursor-runs/$1.gate.txt 2>&1 && echo GREEN || echo RED; }
while pgrep -f 'run.sh /workspace/learning-hub 01-setup' >/dev/null; do sleep 10; done
log "01 finished"
if ! git log --oneline 2>/dev/null | grep -q 'run 01'; then
  bash .cursor/hooks/test-hooks.sh > .cursor-runs/01-setup.hooktest.txt 2>&1; log "test-hooks exit $?"
  git add -A && git commit -qm "Cursor tooling: rules, hooks, subagents, commands adapted from discrete-tasks (Cursor run 01)"; log "commit 01"
fi
if [ ! -s PLAN.md ]; then
  $R $D 02-plan plan; log "02 done"
  jq -r 'select(.type=="result") | .result' .cursor-runs/02-plan.jsonl > PLAN.md
  $R $D 02b-agents; log "02b done"
  git add -A && git commit -qm "PLAN.md (Cursor plan mode, run 02) + AGENTS.md (run 02b)"; log "commit 02"
fi
$R $D 03-core; g=$(gate 03-core); log "03 done gate=$g"
git add -A && git commit -qm "Core scaffold: stack from discrete-tasks, settings presets, home, Data screen (Cursor run 03, gate $g)"; log "commit 03"
$R $D 04-trainer; g=$(gate 04-trainer); log "04 done gate=$g"
git add -A && git commit -qm "Module (c) Mindmapping trainer (Cursor run 04, gate $g)"; log "commit 04"
log "pipeline end"
