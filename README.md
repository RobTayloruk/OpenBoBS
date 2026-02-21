# OpenBoBS

OpenBoBS is a deterministic, enterprise-structured OpenClaw-style multi-agent system designed to run first time on Windows with Docker Desktop and offline Ollama.

## Architecture (single backend, no mixed dev servers)

- One backend (`run.py`) serves both UI assets and API routes.
- No Vite, no split frontend dev server, no CORS juggling.
- Docker Compose runs exactly two services:
  - `openbobs` (UI + orchestration backend)
  - `ollama` (offline local model runtime)

## Core capabilities

- Professional operations dashboard UI.
- Multi-agent orchestration with deterministic progress visualization.
- Prebuilt task packs (MVP, incident response, scale readiness, security hardening).
- Self-updating memory persisted in browser storage.
- Autonomy mode with configurable multi-cycle execution.
- Offline Ollama integration with graceful fallback mode.
- Terminal-style live runtime output.

## Windows one-script startup

Use PowerShell:

```powershell
./Start-OpenBoBS.ps1 -Model llama3.1:8b -Rebuild
```

What it does:

1. Verifies Docker Desktop engine availability.
2. Writes `.env` with your Ollama model.
3. Starts the full stack with Docker Compose.
4. Waits for app readiness.
5. Opens the dashboard at `http://localhost:4173`.

## Local non-docker run (optional)

```bash
./run.sh
```

## Deterministic validation command

```bash
./update-openbobs.sh
```

## Useful operations

- View logs: `docker compose logs -f --tail=200`
- Stop stack: `docker compose down`
- Reset Ollama model cache: `docker compose down -v`
