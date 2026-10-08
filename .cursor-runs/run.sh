#!/bin/bash
# usage: run.sh <projdir> <NN-name> [plan]
cd "$1" || exit 1
n=$2; mode=$3
P=".cursor-runs/$n.prompt.md"
for model in ${MODELS:-composer-2.5}; do
  extra=(); [ "$mode" = plan ] && extra=(--mode plan)
  ~/.local/bin/cursor-agent -p "$(cat "$P")" --model "$model" --force --trust --output-format stream-json "${extra[@]}" > ".cursor-runs/$n.jsonl" 2> ".cursor-runs/$n.err"
  if grep -q '"type":"result"' ".cursor-runs/$n.jsonl"; then echo "$model" > ".cursor-runs/$n.model"; break; fi
  mv ".cursor-runs/$n.jsonl" ".cursor-runs/$n.$model.failed.jsonl"; cp ".cursor-runs/$n.err" ".cursor-runs/$n.$model.failed.err"
done
if [ "$mode" = plan ]; then
  jq -r 'select(.type=="tool_call" and .subtype=="started") | .tool_call.createPlanToolCall.args.plan // empty' ".cursor-runs/$n.jsonl" > ".cursor-runs/$n.plan.md"
  if [ -s ".cursor-runs/$n.plan.md" ]; then
    jq -c --rawfile p ".cursor-runs/$n.plan.md" 'if .type=="result" then .result=$p else . end' ".cursor-runs/$n.jsonl" > ".cursor-runs/$n.jsonl.tmp" && mv ".cursor-runs/$n.jsonl.tmp" ".cursor-runs/$n.jsonl"
  fi
fi
