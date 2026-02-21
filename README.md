# OpenBoBS

OpenBoBS is an OpenClaw-style multi-agent dashboard with offline Ollama support, real-time agent progress, and terminal-style runtime output.

## Features

- Professional OpenClaw-inspired GUI with dedicated runtime, workspace, and advanced agent controls.
- Pre-done task packs (MVP sprint, incident response, scaling, security hardening).
- Real-time agent progress bars plus a live terminal output panel.
- Offline Ollama integration via local API endpoints (`/api/chat`, `/api/health`).
- Self-updating agent that learns recurring request topics and tracks version progression.
- Exportable session JSON (messages, runtime settings, terminal output, and agent state).

## Run locally

```bash
./run.sh
```

By default `run.sh` attempts to open `http://localhost:4173` automatically.

## One-command refresh script

Use this when you want to re-apply sanity checks and prepare runtime dependencies after manual file edits:

```bash
./update-openbobs.sh
```

Optional model argument:

```bash
./update-openbobs.sh llama3.1:8b
```

## Optional Ollama setup

```bash
ollama serve
ollama pull llama3.1:8b
```

If Ollama is unavailable, the dashboard automatically falls back to local simulation responses.

## Windows/local bootstrap script

You can scaffold the full project into a destination folder with:

```powershell
./Create-OpenBoBS.ps1 -Destination .\OpenBoBS -Force
```
