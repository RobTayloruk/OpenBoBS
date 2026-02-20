# OpenBoBS

OpenBoBS is an OpenClaw-style multi-agent coding workspace with offline Ollama integration, a self-updating agent, and an easy deployment run script.

## New in this build

- Easy deployment entrypoint:
  - `./run.sh` boots the app server and auto-detects local Ollama availability
  - `run.py` serves the frontend and provides local API routes (`/api/chat`, `/api/health`)
- Offline Ollama integration:
  - Runtime toggle for Offline Ollama mode
  - Model selector for local models (default `llama3.1:8b`)
  - Health check button for local daemon status
- Self-updating agent:
  - Learns recurring request patterns over time
  - Persists memory in browser localStorage
  - `/selfupdate` command reveals learned topic state and adaptation version
- Advanced multi-agent orchestration and export metadata retained

## Run locally

```bash
./run.sh
```

Then open: `http://localhost:4173`

## Optional Ollama setup

```bash
ollama serve
ollama pull llama3.1:8b
```

If Ollama is not available, OpenBoBS automatically falls back to local simulation responses.
