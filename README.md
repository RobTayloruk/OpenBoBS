# OpenBoBS

OpenBoBS is a deterministic, enterprise-grade OpenClaw-style orchestration console for local-first AI operations.

## What changed in this build

- Removed Kali-specific references from the product flow for now.
- Added **Agent Import Hub** for importing agent definitions from external URLs (for example `https://agents.sabrina.dev/...`).
- Added **Agent Library** panel with local download links for imported agents.
- Added local save folder: `agent_library/` (served by backend and persisted in project workspace).
- Kept advanced bot packs, pre-done playbooks, history replay, and runtime metrics.

## Agent library APIs

- `POST /api/agents/import` with `{ "url": "https://agents.sabrina.dev/..." }`
- `GET /api/agents/library`
- Download imported files directly from `/agent_library/<file>.json`

## Quick start (Windows)

```powershell
./Start-OpenBoBS.ps1 -Model llama3.1:8b -Rebuild
```

This script:
1. verifies Docker Desktop,
2. writes `.env` model settings,
3. starts compose services,
4. waits for `/api/runtime` health,
5. creates desktop shortcut (`OpenBoBS.url`),
6. opens dashboard at `http://localhost:4173`.

## Deterministic validation

```bash
./update-openbobs.sh
```

## Operations

- Dashboard: `http://localhost:4173`
- Agent library folder: `./agent_library`
- Logs: `docker compose logs -f --tail=200`
- Stop: `docker compose down`
