# OpenBoBS

OpenBoBS is a deterministic, enterprise-grade OpenClaw-style orchestration console designed for first-run reliability on Windows + Docker Desktop.

## Why this repo is production-leaning

- **Single backend runtime** (`run.py`) serves UI + APIs together.
- **No mixed dev servers** and no CORS split between front/back.
- **Docker-first stack** (`openbobs` + `ollama`) for offline operation.
- **Deterministic run flow** with explicit startup sequencing (`docker-start.sh`).
- **Windows one-command launcher** (`Start-OpenBoBS.ps1`).

## Feature set (enterprise command center)

- Professional operations dashboard with OpenClaw-inspired information architecture.
- Multi-agent execution with real-time progress and terminal output.
- 1-click **pre-done playbooks** for common delivery paths.
- Bot Creator section for adding custom agents on the fly.
- Advanced bot packs (Red Team, Blue Team, Compliance, SRE, Privacy) with one-click deployment.
- Integrated web search section for external research context.
- Kali tools catalog section with broad inventory visibility, safe-run wrappers for allowed checks, and explicit execution guardrails.
- Workflow history with replay buttons for deterministic reruns.
- Runtime metrics panel (chat/search/kali/health counters + uptime).
- Guardrail toggle for Kali tool launch commands (safe-by-default).
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
6. creates a desktop shortcut (`OpenBoBS.url`) and opens dashboard at `http://localhost:4173`.

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


New command shortcuts: `/help`, `/metrics`.


Agent tooling context: active agents automatically receive Kali catalog/safe-tool context from `/api/agent/tools-context` during workflow orchestration.


Kali runtime note: the Docker image now installs the dashboard-required Kali/security tooling bundle (`nmap`, `nikto`, `sqlmap`, `gobuster`, `hydra`, `ffuf`, `amass`, `whatweb`, `tcpdump`, `dnsutils`, `smbclient`, `snmp`, `masscan`, `netcat-openbsd`, `seclists`).


Launch behavior: startup now attempts a best-effort Kali bootstrap at container start and **skips on errors** so the dashboard still comes online.
If Docker is unavailable on Windows startup, `Start-OpenBoBS.ps1` opens a WSL troubleshooting terminal automatically when available.
