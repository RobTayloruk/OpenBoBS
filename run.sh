#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
HOST="${HOST:-0.0.0.0}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
OPEN_DASHBOARD="${OPEN_DASHBOARD:-1}"
DASHBOARD_URL="http://localhost:${PORT}"

printf "Starting OpenBoBS on %s\n" "$DASHBOARD_URL"
printf "Using offline Ollama endpoint: %s\n" "$OLLAMA_URL"

if command -v ollama >/dev/null 2>&1; then
  if curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    printf "Ollama is reachable.\n"
  else
    printf "Ollama detected but not responding; app will use local fallback until available.\n"
  fi
else
  printf "Ollama CLI not found; app will use local fallback unless endpoint is externally available.\n"
fi

if [[ "$OPEN_DASHBOARD" == "1" ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    (sleep 1 && xdg-open "$DASHBOARD_URL" >/dev/null 2>&1) &
  elif command -v open >/dev/null 2>&1; then
    (sleep 1 && open "$DASHBOARD_URL" >/dev/null 2>&1) &
  elif command -v powershell.exe >/dev/null 2>&1; then
    (sleep 1 && powershell.exe -NoProfile -Command "Start-Process '$DASHBOARD_URL'" >/dev/null 2>&1) &
  else
    printf "No browser opener found. Open %s manually.\n" "$DASHBOARD_URL"
  fi
fi

exec env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py
