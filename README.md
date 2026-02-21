# OpenBoBS

OpenBoBS is a deterministic, enterprise-grade OpenClaw-style orchestration console designed for first-run reliability on Windows + Docker Desktop.

## Why this repo is production-leaning

- **Single backend runtime** (`run.py`) serves UI + APIs together.
- **No mixed dev servers** and no CORS split between front/back.
- **Docker-first stack** (`openbobs` + `ollama`) for offline operation.
- **Deterministic run flow** with explicit startup sequencing (`docker-start.sh`).
- **Windows one-command launcher** (`Start-OpenBoBS.ps1`).

## Feature set

- Professional operations dashboard with OpenClaw-inspired information architecture.
- Multi-agent execution with real-time progress and terminal output.
- 1-click **pre-done playbooks** for common delivery paths.
- Autonomy mode for multi-cycle iterative improvement.
- Self-updating local memory (versioned patterns in browser storage).
- Offline Ollama integration with graceful fallback to local deterministic outputs.

## Quick start (Windows)

```powershell
./Start-OpenBoBS.ps1 -Model llama3.1:8b -Rebuild
```

This script:
1. verifies Docker Desktop,
2. writes `.env` model and startup timeout settings,
3. starts compose services,
4. waits for `/api/runtime` health from the unified backend,
5. prints diagnostics (`docker compose ps` + logs) if health timeout occurs,
6. opens dashboard at `http://localhost:4173`.

## Deterministic validation

```bash
./update-openbobs.sh
```

## Operations

- Dashboard: `http://localhost:4173`
- Ollama API: `http://localhost:11434`
- Logs: `docker compose logs -f --tail=200`
- Stop: `docker compose down`
- Full reset: `docker compose down -v`


Health wait behavior: OpenBoBS starts the app server immediately and performs Ollama model pull in background, so first-run health checks no longer block on long model downloads.
