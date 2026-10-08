#!/bin/bash
# usage: status.sh file.jsonl
f=$1
jq -r 'select(.type=="tool_call" and .subtype=="started") | .tool_call | keys[0] + " " + ((.[keys[0]].args.path // .[keys[0]].args.command // .[keys[0]].args.description // "")|tostring|.[0:140])' "$f" 2>/dev/null | tail -${2:-15}
jq -r 'select(.type=="result") | "RESULT: " + (.subtype//"") + " dur=" + ((.duration_ms//0)/1000|tostring) + "s\n" + (.result//"")' "$f" 2>/dev/null
