#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-4173}"
OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
OLLAMA_PULL_TIMEOUT="${OLLAMA_PULL_TIMEOUT:-240}"

printf "[openbobs] Starting deterministic container runtime\n"
printf "[openbobs] Waiting for Ollama at %s\n" "$OLLAMA_URL"

SECONDS_WAITED=0
until curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; do
  sleep 2
  SECONDS_WAITED=$((SECONDS_WAITED + 2))
  if [[ "$SECONDS_WAITED" -ge "$OLLAMA_PULL_TIMEOUT" ]]; then
    printf "[openbobs] Ollama not ready after %ss; continuing with fallback mode\n" "$SECONDS_WAITED"
    break
  fi
done

if curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
  printf "[openbobs] Pulling model %s\n" "$OLLAMA_MODEL"
  curl -fsS "$OLLAMA_URL/api/pull" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$OLLAMA_MODEL\",\"stream\":false}" \
    >/dev/null || printf "[openbobs] Warning: model pull request failed, runtime fallback stays enabled\n"
fi

exec env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py
