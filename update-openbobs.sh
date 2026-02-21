#!/usr/bin/env bash
set -euo pipefail

printf "[OpenBoBS] Running deterministic validation suite...\n"
node --check app.js
python3 -m py_compile run.py
bash -n run.sh
bash -n docker-start.sh

if command -v docker >/dev/null 2>&1; then
  docker compose config >/dev/null
else
  printf "[OpenBoBS] Docker not found in this environment; skipped docker compose validation.\n"
fi

printf "[OpenBoBS] Validation complete.\n"
