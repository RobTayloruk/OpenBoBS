# OpenBoBS

OpenBoBS is an OpenClaw-style multi-agent coding workspace focused on rapid planning, architecture, quality, and release orchestration.

## What this build includes

- OpenClaw-inspired split-pane console UX with responsive layout
- Visual dashboard with image-backed sections for architecture, quality gate, and release ops
- New workspace sections:
  - Agent Mission Control hero panel
  - Templates (MVP sprint, incident response, scale readiness)
  - Execution board (timeline, active focus, artifacts)
- Advanced agent roster with configurable participation:
  - System Architect
  - Frontend Specialist
  - Backend Engineer
  - QA Automation
  - Security Reviewer
  - Release Manager
- Agent orchestration workflow with synthesized output
- Slash commands: `/plan`, `/agents`, `/risk`, `/ship`, `/summary`
- Workspace controls for project, profile, and model selection
- Conversation export to JSON (with active agent and config metadata)
- Theme toggle + chat reset

## Run locally

```bash
python3 -m http.server 4173
```

Then open: `http://localhost:4173`

## Notes

- This project runs in local simulation mode on the client (no external API keys needed).
- Agent outputs are deterministic scaffolds you can adapt into real backend orchestration later.
