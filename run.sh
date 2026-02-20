#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
HOST="${HOST:-0.0.0.0}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

printf "Starting OpenBoBS on http://%s:%s\n" "$HOST" "$PORT"
printf "Using offline Ollama endpoint: %s\n" "$OLLAMA_URL"

if command -v ollama >/dev/null 2>&1; then
  if ! curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    printf "Ollama detected but not responding at %s (continuing with UI fallback mode).\n" "$OLLAMA_URL"
  fi
else
  printf "Ollama CLI not found (continuing with UI fallback mode).\n"
fi

exec env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py
