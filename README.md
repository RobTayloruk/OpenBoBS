# OpenBoBS

OpenBoBS is an enterprise AI agent creator and deployment dashboard with local offline Ollama support, autonomous execution loops, and a persistent agent library.

## Core platform capabilities

- **AI provider gateway** with live status for local Ollama (offline), HuggingFace free inference (online), and deterministic local fallback.
- **AI Agent Creator** for custom role/prompt creation.
- **Agent Import Hub** for importing JSON agent definitions from sources like `https://agents.sabrina.dev/...`.
- **Agent Library** saved locally under `agent_library/`, with download links and in-dashboard JSON editing/saving.
- **Autonomous deployment loop** with configurable intervals and cycle counts.
- **Self-learning behavior** that tracks recurring topics and updates adaptive policy over time.
- **Pre-done bot packs** and one-click deployment playbooks.
- **Runtime metrics, workflow history replay, and exportable sessions**.

## APIs

- `GET /api/ollama/status`
- `POST /api/chat`
- `POST /api/agents/import`
- `GET /api/agents/library`
- `POST /api/agents/save`
- `GET /api/runtime/metrics`

## Quick start

```bash
./run.sh
```

Then open `http://localhost:4173`.

## Docker start (Windows)

```powershell
./Start-OpenBoBS.ps1 -Model llama3.1:8b -Rebuild
```

## Notes

- Imported agents are saved into `./agent_library`.
- `POST /api/chat` accepts `provider` values: `ollama-local`, `hf-free`, or `local-sim`.
- Optional env vars: `HF_MODEL` (default `google/flan-t5-base`) and `HUGGINGFACE_API_KEY`.
- If Ollama is unavailable, choose `local-sim` or `hf-free` from the dashboard provider selector.
