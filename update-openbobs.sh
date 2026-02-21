#!/usr/bin/env bash
set -euo pipefail

MODEL="${1:-llama3.1:8b}"

printf "[OpenBoBS] Running update routine...\n"
node --check app.js
python3 -m py_compile run.py
bash -n run.sh

if command -v ollama >/dev/null 2>&1; then
  printf "[OpenBoBS] Ensuring Ollama model '%s' is present...\n" "$MODEL"
  ollama pull "$MODEL" || printf "[OpenBoBS] Warning: could not pull model now.\n"
else
  printf "[OpenBoBS] Ollama CLI not found; skipping model pull.\n"
fi

printf "[OpenBoBS] Update routine complete. Start dashboard with ./run.sh\n"
