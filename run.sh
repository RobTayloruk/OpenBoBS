#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-4173}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
OPEN_DASHBOARD="${OPEN_DASHBOARD:-1}"
URL="http://localhost:${PORT}"

printf "Starting OpenBoBS unified backend at %s\n" "$URL"
printf "Using Ollama endpoint: %s\n" "$OLLAMA_URL"

if [[ "$OPEN_DASHBOARD" == "1" ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    (sleep 1 && xdg-open "$URL" >/dev/null 2>&1) &
  elif command -v open >/dev/null 2>&1; then
    (sleep 1 && open "$URL" >/dev/null 2>&1) &
  elif command -v powershell.exe >/dev/null 2>&1; then
    (sleep 1 && powershell.exe -NoProfile -Command "Start-Process '$URL'" >/dev/null 2>&1) &
  else
    printf "No browser opener detected. Open %s manually.\n" "$URL"
  fi
fi

exec env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py
