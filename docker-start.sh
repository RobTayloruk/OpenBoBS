#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-4173}"
OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
OLLAMA_PULL_TIMEOUT="${OLLAMA_PULL_TIMEOUT:-240}"

printf "[openbobs] Starting deterministic container runtime\n"
printf "[openbobs] Booting API/UI server immediately for first-run health checks\n"

env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py &
APP_PID=$!

pull_model_worker() {
  printf "[openbobs] Background Ollama readiness worker started (%s)\n" "$OLLAMA_URL"
  local waited=0
  until curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; do
    sleep 2
    waited=$((waited + 2))
    if [[ "$waited" -ge "$OLLAMA_PULL_TIMEOUT" ]]; then
      printf "[openbobs] Ollama not ready after %ss; staying in runtime fallback mode\n" "$waited"
      return 0
    fi
  done

  printf "[openbobs] Ollama reachable; requesting model pull: %s\n" "$OLLAMA_MODEL"
  curl -fsS "$OLLAMA_URL/api/pull" \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$OLLAMA_MODEL\",\"stream\":false}" \
    >/dev/null || printf "[openbobs] Warning: model pull request failed; fallback mode remains available\n"
}

pull_model_worker &

wait "$APP_PID"
