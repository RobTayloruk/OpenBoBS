param(
  [string]$Destination = '.\OpenBoBS',
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Destination)) { New-Item -ItemType Directory -Path $Destination | Out-Null }

$files = @{}
$files['README.md'] = @'
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

## Windows/local bootstrap script

You can generate the full project scaffold locally with:

```powershell
./Create-OpenBoBS.ps1 -Destination .\OpenBoBS -Force
```

This script writes all app files (`index.html`, `app.js`, `styles.css`, `run.py`, `run.sh`, and SVG assets) into the target directory.

'@

$files['index.html'] = @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenBoBS • OpenClaw Style Agent Console</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar">
        <div>
          <h1>OpenBoBS</h1>
          <p class="subtitle">OpenClaw-style multi-agent workspace.</p>
        </div>

        <section class="hero-card">
          <img src="assets/agent-hub.svg" alt="Abstract illustration of agent network" />
          <div>
            <h3>Agent Mission Control</h3>
            <p>Compose specialized agents and run orchestrated delivery flows from one console.</p>
          </div>
        </section>

        <section>
          <h2>Runtime</h2>
          <label class="switch-row">
            <input id="ollamaMode" type="checkbox" checked />
            <span>Offline Ollama mode</span>
          </label>
          <label>
            Ollama model
            <input id="ollamaModel" value="llama3.1:8b" />
          </label>
          <button id="healthBtn">Check Ollama Health</button>
        </section>

        <section>
          <h2>Workspace</h2>
          <label>
            Project name
            <input id="projectName" value="OpenBoBS" />
          </label>
          <label>
            Profile
            <select id="profile">
              <option value="balanced">Balanced</option>
              <option value="creative">Creative</option>
              <option value="strict">Strict</option>
            </select>
          </label>
          <label>
            Model
            <select id="model">
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
              <option value="o4-mini">o4-mini</option>
            </select>
          </label>
        </section>

        <section>
          <h2>Advanced Agents</h2>
          <div id="agentList" class="agent-list"></div>
          <div class="button-grid compact">
            <button id="allAgentsBtn">Enable all</button>
            <button id="clearAgentsBtn">Clear</button>
          </div>
        </section>

        <section>
          <h2>Templates</h2>
          <div class="button-grid">
            <button data-template="mvp">MVP Build Sprint</button>
            <button data-template="incident">Incident Response</button>
            <button data-template="scaling">Scale Readiness</button>
          </div>
        </section>

        <section>
          <h2>Utilities</h2>
          <div class="button-grid">
            <button id="runWorkflowBtn">Run Agent Workflow</button>
            <button id="exportBtn">Export Conversation</button>
            <button id="clearBtn" class="danger">Clear Chat</button>
            <button id="themeBtn">Toggle Theme</button>
          </div>
        </section>
      </aside>

      <main class="chat-panel">
        <header>
          <div>
            <h2>OpenClaw-style Agent Orchestration</h2>
            <p id="status">Ready • Local multi-agent simulation</p>
          </div>
          <span class="badge" id="activeAgentsBadge">0 agents active</span>
        </header>

        <section class="dashboard-strip" aria-label="Workspace highlights">
          <article>
            <img src="assets/architecture.svg" alt="Architecture blueprint visual" />
            <h3>Architecture</h3>
            <p>Define clean boundaries and scalable contracts.</p>
          </article>
          <article>
            <img src="assets/testing.svg" alt="Testing and quality visual" />
            <h3>Quality Gate</h3>
            <p>Prioritized checks for unit, integration, and e2e.</p>
          </article>
          <article>
            <img src="assets/release.svg" alt="Release operations visual" />
            <h3>Release Ops</h3>
            <p>Staged rollout plans with rollback confidence.</p>
          </article>
        </section>

        <section class="insights-panel" aria-label="Execution board">
          <article>
            <h3>Execution Timeline</h3>
            <ol id="timelineList" class="timeline-list"></ol>
          </article>
          <article>
            <h3>Active Focus</h3>
            <ul id="focusList" class="focus-list"></ul>
          </article>
          <article>
            <h3>Self-Updating Agent</h3>
            <ul id="artifactList" class="focus-list"></ul>
          </article>
        </section>

        <div id="messages" class="messages" aria-live="polite"></div>

        <form id="composer" class="composer">
          <textarea
            id="input"
            placeholder="Describe your build request. Try /plan, /agents, /risk, /ship, /summary"
            rows="4"
            required
          ></textarea>
          <div class="composer-actions">
            <small>Slash commands: /plan /agents /risk /ship /summary /selfupdate</small>
            <button type="submit">Send</button>
          </div>
        </form>
      </main>
    </div>

    <template id="messageTpl">
      <article class="message">
        <div class="meta"></div>
        <p class="content"></p>
      </article>
    </template>

    <script src="app.js"></script>
  </body>
</html>

'@

$files['app.js'] = @'
const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const status = document.getElementById('status');
const template = document.getElementById('messageTpl');
const projectNameInput = document.getElementById('projectName');
const profileInput = document.getElementById('profile');
const modelInput = document.getElementById('model');
const ollamaModeInput = document.getElementById('ollamaMode');
const ollamaModelInput = document.getElementById('ollamaModel');
const agentList = document.getElementById('agentList');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const focusList = document.getElementById('focusList');
const artifactList = document.getElementById('artifactList');

const memory = [];
const SELF_STATE_KEY = 'openbobs-self-update-state';

function loadSelfState() {
  try {
    const saved = localStorage.getItem(SELF_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {
    // no-op for demo mode
  }
  return { version: 1, runs: 0, learnedTopics: {} };
}

const selfUpdateState = loadSelfState();

function saveSelfState() {
  localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
}

const workflowTemplates = {
  mvp: 'Create an MVP sprint plan with architecture, prototype UX, integration tests, and launch checklist.',
  incident: 'Run incident response workflow: containment, impact analysis, remediation, and postmortem actions.',
  scaling: 'Prepare scale-readiness plan with bottleneck analysis, observability, and rollout controls.',
};

const agentCatalog = [
  { id: 'architect', name: 'System Architect', summary: 'Defines architecture and boundaries.', defaultOn: true, prompt: 'Design system components and API boundaries.' },
  { id: 'frontend', name: 'Frontend Specialist', summary: 'Owns UX and accessibility.', defaultOn: true, prompt: 'Propose UI structure, states, and a11y checks.' },
  { id: 'backend', name: 'Backend Engineer', summary: 'Builds services and persistence.', defaultOn: true, prompt: 'Define contracts, storage, and observability.' },
  { id: 'qa', name: 'QA Automation', summary: 'Builds deterministic test matrices.', defaultOn: true, prompt: 'Create unit/integration/e2e test priorities.' },
  { id: 'security', name: 'Security Reviewer', summary: 'Evaluates auth and threat surface.', defaultOn: false, prompt: 'Report threats and hardening checklist.' },
  { id: 'release', name: 'Release Manager', summary: 'Plans rollout and rollback strategy.', defaultOn: false, prompt: 'Provide go-live gates and rollback criteria.' },
  { id: 'selfupdate', name: 'Self-Updating Agent', summary: 'Learns recurring needs and refines prompts.', defaultOn: true, prompt: 'Track recurring patterns and recommend iterative improvements.' },
];

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function selectedAgents() {
  return agentCatalog.filter((agent) => document.getElementById(`agent-${agent.id}`)?.checked);
}

function topLearnedTopics(limit = 3) {
  return Object.entries(selfUpdateState.learnedTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, count]) => `${topic} (${count})`);
}

function updateSelfLearning(requestText) {
  selfUpdateState.runs += 1;
  const words = requestText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 5)
    .slice(0, 12);

  words.forEach((word) => {
    selfUpdateState.learnedTopics[word] = (selfUpdateState.learnedTopics[word] || 0) + 1;
  });

  if (selfUpdateState.runs % 3 === 0) {
    selfUpdateState.version += 1;
  }
  saveSelfState();
}

function selfUpdateSummary() {
  const topics = topLearnedTopics();
  return [
    `Version: v${selfUpdateState.version}`,
    `Runs: ${selfUpdateState.runs}`,
    `Top patterns: ${topics.join(', ') || 'none yet'}`,
    'Policy: Increase testing depth and tighten acceptance criteria on repeated topics.',
  ].join('\n');
}

function updateInsightPanels(activeAgents, requestText = 'No request yet') {
  timelineList.innerHTML = '';
  ['Scope locked', 'Architecture drafted', 'Build + tests', 'Release gates'].forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    timelineList.append(item);
  });

  focusList.innerHTML = '';
  [
    `Request: ${requestText.slice(0, 72)}${requestText.length > 72 ? '…' : ''}`,
    `Profile: ${profileInput.value}`,
    `Model: ${modelInput.value}`,
    `Runtime: ${ollamaModeInput.checked ? 'Offline Ollama' : 'Local simulation'}`,
    `Agents: ${activeAgents.map((agent) => agent.name).join(', ') || 'none selected'}`,
  ].forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    focusList.append(item);
  });

  artifactList.innerHTML = '';
  selfUpdateSummary().split('\n').forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    artifactList.append(item);
  });
}

function updateActiveAgentBadge() {
  const active = selectedAgents();
  activeAgentsBadge.textContent = `${active.length} agent${active.length === 1 ? '' : 's'} active`;
  updateInsightPanels(active);
}

function renderAgents() {
  agentList.innerHTML = '';
  agentCatalog.forEach((agent) => {
    const card = document.createElement('label');
    card.className = 'agent-card';
    card.innerHTML = `
      <input type="checkbox" id="agent-${agent.id}" ${agent.defaultOn ? 'checked' : ''} />
      <div>
        <strong>${agent.name}</strong>
        <small>${agent.summary}</small>
      </div>
    `;
    card.querySelector('input').addEventListener('change', updateActiveAgentBadge);
    agentList.append(card);
  });
  updateActiveAgentBadge();
}

function appendMessage(role, text, source = 'OpenBoBS') {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector('.message');
  article.classList.add(role);
  fragment.querySelector('.meta').textContent = `${source} • ${now()}`;
  fragment.querySelector('.content').textContent = text;
  messages.append(fragment);
  messages.scrollTop = messages.scrollHeight;
  memory.push({ role, source, text, timestamp: Date.now() });
}

function profileBehavior() {
  if (profileInput.value === 'creative') return 'Favor novel implementation ideas.';
  if (profileInput.value === 'strict') return 'Be concise, deterministic, and constrained.';
  return 'Balance ambition with practical delivery.';
}

async function checkOllamaHealth() {
  status.textContent = 'Checking Ollama…';
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    if (data.ok) {
      status.textContent = `Ollama ready • ${data.models.length} model(s) detected`;
    } else {
      status.textContent = `Ollama unavailable • fallback mode`;
    }
  } catch (_) {
    status.textContent = 'Ollama health check failed • fallback mode';
  }
}

function slashResponse(command) {
  const active = selectedAgents();
  if (command === '/summary') {
    return [
      'Conversation summary',
      `- Project: ${projectNameInput.value}`,
      `- Profile: ${profileInput.value}`,
      `- Model: ${modelInput.value}`,
      `- Runtime: ${ollamaModeInput.checked ? 'Offline Ollama' : 'Local simulation'}`,
      `- Messages: ${memory.length}`,
      `- Active agents: ${active.map((agent) => agent.name).join(', ') || 'none'}`,
    ].join('\n');
  }
  if (command === '/selfupdate') return `Self-updating agent memory\n${selfUpdateSummary()}`;
  if (command === '/plan') return 'Delivery plan\n1) Scope\n2) Architecture\n3) Build\n4) QA\n5) Release';
  if (command === '/agents') return ['Agent roster', ...agentCatalog.map((agent) => `- ${agent.name}: ${agent.summary}`)].join('\n');
  if (command === '/risk') return 'Risk matrix\n- Product scope drift\n- Coupling risk\n- Test coverage gaps\n- Rollout failure risk';
  if (command === '/ship') return 'Ship checklist\n- freeze scope\n- verify tests\n- confirm monitoring\n- publish notes\n- launch via staged flags';
  return null;
}

function localAgentResponse(requestText, active) {
  const sections = active.map((agent) => [
    `${agent.name} output`,
    `Goal: ${agent.prompt}`,
    `Input: ${requestText}`,
    `Profile policy: ${profileBehavior()}`,
  ].join('\n'));

  sections.push([
    'Orchestrator synthesis',
    `- Request: ${requestText}`,
    `- Runtime: ${ollamaModeInput.checked ? 'Offline Ollama requested' : 'Simulation mode'}`,
    `- Active agents: ${active.map((agent) => agent.name).join(', ')}`,
  ].join('\n'));

  return sections;
}

async function askOllama(requestText, active) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Selected agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self-updating agent state: ${selfUpdateSummary()}`,
    'Return output in sections for each agent and a final orchestrator synthesis.',
    `User request: ${requestText}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelInput.value,
      messages: [
        { role: 'system', content: 'You are OpenBoBS offline orchestrator. Keep output actionable.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Unknown Ollama error');
  return data.reply;
}

async function runWorkflow(text) {
  const active = selectedAgents();
  status.textContent = 'Running workflow…';

  if (active.some((agent) => agent.id === 'selfupdate')) {
    updateSelfLearning(text);
  }
  updateInsightPanels(active, text);

  const slash = slashResponse(text.trim());
  if (slash) {
    appendMessage('assistant', slash, 'Command Center');
    status.textContent = 'Ready • Local multi-agent simulation';
    return;
  }

  if (!active.length) {
    appendMessage('assistant', 'No agents are active. Enable at least one agent.', 'Orchestrator');
    status.textContent = 'Ready • Local multi-agent simulation';
    return;
  }

  if (ollamaModeInput.checked) {
    try {
      const ollamaReply = await askOllama(text, active);
      appendMessage('assistant', ollamaReply, 'Ollama Orchestrator');
      status.textContent = 'Ready • Offline Ollama response';
      return;
    } catch (error) {
      appendMessage('assistant', `Ollama fallback triggered: ${error.message}`, 'Runtime');
    }
  }

  localAgentResponse(text, active).forEach((section, index, arr) => {
    setTimeout(() => {
      appendMessage('assistant', section, index === arr.length - 1 ? 'Orchestrator' : active[index].name);
      if (index === arr.length - 1) status.textContent = 'Ready • Local multi-agent simulation';
    }, 220 * (index + 1));
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

document.querySelectorAll('[data-template]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = workflowTemplates[button.dataset.template];
    input.focus();
  });
});

document.getElementById('runWorkflowBtn').addEventListener('click', async () => {
  const text = input.value.trim() || 'Generate a complete build strategy for an OpenClaw-style advanced agent app.';
  if (!input.value.trim()) appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

document.getElementById('healthBtn').addEventListener('click', checkOllamaHealth);

document.getElementById('allAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => (document.getElementById(`agent-${agent.id}`).checked = true));
  updateActiveAgentBadge();
});

document.getElementById('clearAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => (document.getElementById(`agent-${agent.id}`).checked = false));
  updateActiveAgentBadge();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  messages.innerHTML = '';
  memory.length = 0;
  appendMessage('assistant', 'Chat cleared. Reconfigure agents and run a new workflow.');
});

document.getElementById('themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const exportPayload = {
    project: projectNameInput.value,
    profile: profileInput.value,
    model: modelInput.value,
    ollamaMode: ollamaModeInput.checked,
    ollamaModel: ollamaModelInput.value,
    selfUpdateState,
    activeAgents: selectedAgents().map((agent) => agent.id),
    memory,
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'openbobs-agent-conversation.json';
  anchor.click();
  URL.revokeObjectURL(url);
});

renderAgents();
updateInsightPanels(selectedAgents());
appendMessage('assistant', 'Welcome to OpenBoBS. Offline Ollama mode is enabled by default. Use /selfupdate to inspect learned patterns.');

'@

$files['styles.css'] = @'
:root {
  --bg: #0b1220;
  --panel: #111827;
  --surface: #1f2937;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --accent: #22d3ee;
  --danger: #fb7185;
  --border: #334155;
  --success: #34d399;
}

:root.light {
  --bg: #f8fafc;
  --panel: #ffffff;
  --surface: #eef2ff;
  --text: #0f172a;
  --muted: #475569;
  --accent: #0891b2;
  --danger: #be123c;
  --border: #d4d4d8;
  --success: #0f766e;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: radial-gradient(circle at top, #1e293b 0%, var(--bg) 45%);
  color: var(--text);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 360px 1fr;
}

.sidebar {
  border-right: 1px solid var(--border);
  padding: 1.2rem;
  background: color-mix(in srgb, var(--panel), black 10%);
  display: grid;
  align-content: start;
  gap: 1rem;
  overflow: auto;
}

.subtitle { color: var(--muted); margin-top: -0.4rem; }
h1, h2, h3, p { margin: 0; }
section { display: grid; gap: 0.6rem; }
section h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.hero-card {
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface), black 10%);
  border-radius: 0.9rem;
  padding: 0.6rem;
}

.hero-card img {
  width: 100%;
  border-radius: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--accent), transparent 65%);
}

.hero-card h3 { font-size: 0.95rem; }
.hero-card p { color: var(--muted); font-size: 0.84rem; }

.button-grid { display: grid; gap: 0.5rem; }

.switch-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text);
}

.switch-row input {
  width: auto;
}

.button-grid.compact { grid-template-columns: 1fr 1fr; }

button, input, select, textarea {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: 0.7rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
button { cursor: pointer; }
button:hover { border-color: var(--accent); }
.danger:hover { border-color: var(--danger); }
label { display: grid; gap: 0.35rem; font-size: 0.9rem; color: var(--muted); }

.agent-list { display: grid; gap: 0.45rem; }
.agent-card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.55rem;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  padding: 0.55rem;
  background: color-mix(in srgb, var(--surface), black 6%);
}
.agent-card input { width: auto; margin-top: 0.25rem; }
.agent-card strong { font-size: 0.88rem; color: var(--text); }
.agent-card small { font-size: 0.76rem; }

.chat-panel {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel), black 7%);
}

#status { color: var(--muted); font-size: 0.9rem; }
.badge {
  font-size: 0.75rem;
  border: 1px solid var(--success);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  color: var(--success);
}

.dashboard-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
}

.dashboard-strip article,
.insights-panel article {
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel), black 8%);
  border-radius: 0.85rem;
  padding: 0.65rem;
  display: grid;
  gap: 0.45rem;
}

.dashboard-strip img {
  width: 100%;
  border-radius: 0.6rem;
}

.dashboard-strip p,
.insights-panel p,
.timeline-list,
.focus-list {
  font-size: 0.82rem;
  color: var(--muted);
}

.insights-panel {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 0.8rem;
  padding: 0 1rem 1rem;
  border-bottom: 1px solid var(--border);
}

.timeline-list,
.focus-list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.3rem;
}

.messages {
  padding: 1rem;
  overflow-y: auto;
  display: grid;
  gap: 0.8rem;
  align-content: start;
}

.message {
  max-width: min(820px, 100%);
  padding: 0.8rem 1rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--panel), black 8%);
  border: 1px solid var(--border);
  display: grid;
  gap: 0.45rem;
}

.message.user {
  margin-left: auto;
  background: color-mix(in srgb, var(--accent), black 83%);
}

.meta { font-size: 0.78rem; color: var(--muted); }
.content { margin: 0; white-space: pre-wrap; line-height: 1.45; }

.composer {
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel), black 8%);
  padding: 1rem;
  display: grid;
  gap: 0.6rem;
}

.composer textarea { resize: vertical; min-height: 100px; }
.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
small { color: var(--muted); }

@media (max-width: 1200px) {
  .dashboard-strip,
  .insights-panel { grid-template-columns: 1fr; }
}

@media (max-width: 980px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 52vh;
  }
}

'@

$files['style.css'] = @'
:root {
  --bg: #0f172a;
  --panel: #111827;
  --surface: #1f2937;
  --text: #e5e7eb;
  --muted: #94a3b8;
  --accent: #22d3ee;
  --danger: #fb7185;
  --border: #334155;
}

:root.light {
  --bg: #f8fafc;
  --panel: #ffffff;
  --surface: #eef2ff;
  --text: #0f172a;
  --muted: #475569;
  --accent: #0891b2;
  --danger: #be123c;
  --border: #d4d4d8;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: radial-gradient(circle at top, #1e293b 0%, var(--bg) 45%);
  color: var(--text);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px 1fr;
}

.sidebar {
  border-right: 1px solid var(--border);
  padding: 1.2rem;
  background: color-mix(in srgb, var(--panel), black 10%);
  display: grid;
  gap: 1rem;
}

.subtitle { color: var(--muted); margin-top: -0.5rem; }
h1, h2, h3, p { margin: 0; }
section { display: grid; gap: 0.6rem; }
section h2 { font-size: 0.9rem; text-transform: uppercase; color: var(--muted); }

.button-grid { display: grid; gap: 0.5rem; }
button, input, select, textarea {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: 0.7rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: inherit;
}
button { cursor: pointer; }
button:hover { border-color: var(--accent); }
.danger:hover { border-color: var(--danger); }
label { display: grid; gap: 0.35rem; font-size: 0.9rem; color: var(--muted); }

.chat-panel { display: grid; grid-template-rows: auto 1fr auto; }
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel), black 7%);
}
#status { color: var(--muted); font-size: 0.9rem; }
.badge {
  font-size: 0.75rem;
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  color: var(--accent);
}

.messages {
  padding: 1rem;
  overflow-y: auto;
  display: grid;
  gap: 0.8rem;
  align-content: start;
}

.message {
  max-width: min(780px, 100%);
  padding: 0.8rem 1rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--panel), black 8%);
  border: 1px solid var(--border);
  display: grid;
  gap: 0.45rem;
}

.message.user {
  margin-left: auto;
  background: color-mix(in srgb, var(--accent), black 83%);
}

.meta { font-size: 0.78rem; color: var(--muted); }
.content { margin: 0; white-space: pre-wrap; line-height: 1.45; }

.composer {
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--panel), black 8%);
  padding: 1rem;
  display: grid;
  gap: 0.6rem;
}

.composer textarea { resize: vertical; min-height: 88px; }
.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
small { color: var(--muted); }

@media (max-width: 900px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { border-right: none; border-bottom: 1px solid var(--border); }
}

'@

$files['run.py'] = @'
#!/usr/bin/env python3
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', '4173'))
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434')


def ollama_chat(messages, model):
    payload = json.dumps({
        'model': model,
        'stream': False,
        'messages': messages,
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{OLLAMA_URL}/api/chat',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        body = json.loads(response.read().decode('utf-8'))
        message = body.get('message', {})
        return message.get('content', '')


def ollama_health():
    req = urllib.request.Request(f'{OLLAMA_URL}/api/tags', method='GET')
    with urllib.request.urlopen(req, timeout=4) as response:
        body = json.loads(response.read().decode('utf-8'))
        models = [m.get('name', '') for m in body.get('models', [])]
        return {'ok': True, 'models': models}


class Handler(SimpleHTTPRequestHandler):
    def _json(self, status, payload):
        data = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/api/health':
            try:
                self._json(200, ollama_health())
            except Exception as err:  # noqa: BLE001
                self._json(200, {'ok': False, 'error': str(err), 'models': []})
            return
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/chat':
            self._json(404, {'error': 'Not found'})
            return

        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length)

        try:
            payload = json.loads(raw.decode('utf-8'))
            messages = payload.get('messages', [])
            model = payload.get('model', 'llama3.1:8b')
            reply = ollama_chat(messages, model)
            self._json(200, {'ok': True, 'reply': reply})
        except urllib.error.URLError as err:
            self._json(200, {'ok': False, 'error': f'Ollama unavailable: {err}'})
        except Exception as err:  # noqa: BLE001
            self._json(500, {'ok': False, 'error': str(err)})


if __name__ == '__main__':
    print(f'OpenBoBS server starting on http://{HOST}:{PORT}')
    print(f'Offline Ollama endpoint: {OLLAMA_URL}')
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()

'@

$files['run.sh'] = @'
#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-4173}"
HOST="${HOST:-0.0.0.0}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

printf "Starting OpenBoBS on http://%s:%s\n" "$HOST" "$PORT"
printf "Using offline Ollama endpoint: %s\n" "$OLLAMA_URL"

if command -v ollama >/dev/null 2>&1; then
  if ! curl -fsS "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    printf "Ollama detected but not responding at %s (continuing with UI fallback mode).\n" "$OLLAMA_URL"
  fi
else
  printf "Ollama CLI not found (continuing with UI fallback mode).\n"
fi

exec env HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" python3 run.py

'@

$files['assets/agent-hub.svg'] = @'
<svg width="640" height="300" viewBox="0 0 640 300" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="640" height="300" rx="24" fill="#0F172A"/>
<circle cx="320" cy="150" r="46" fill="#22D3EE" fill-opacity="0.25"/>
<circle cx="178" cy="84" r="26" fill="#34D399" fill-opacity="0.3"/>
<circle cx="466" cy="84" r="26" fill="#818CF8" fill-opacity="0.3"/>
<circle cx="150" cy="212" r="22" fill="#F472B6" fill-opacity="0.32"/>
<circle cx="488" cy="212" r="22" fill="#F59E0B" fill-opacity="0.3"/>
<path d="M204 96L286 136" stroke="#67E8F9" stroke-width="4" stroke-linecap="round"/>
<path d="M438 96L354 136" stroke="#A5B4FC" stroke-width="4" stroke-linecap="round"/>
<path d="M172 202L278 162" stroke="#F9A8D4" stroke-width="4" stroke-linecap="round"/>
<path d="M468 202L362 162" stroke="#FCD34D" stroke-width="4" stroke-linecap="round"/>
<circle cx="320" cy="150" r="18" fill="#22D3EE"/>
</svg>

'@

$files['assets/architecture.svg'] = @'
<svg width="320" height="160" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="320" height="160" rx="16" fill="#111827"/>
<rect x="24" y="28" width="84" height="36" rx="8" fill="#334155"/>
<rect x="132" y="28" width="84" height="36" rx="8" fill="#334155"/>
<rect x="240" y="28" width="56" height="36" rx="8" fill="#334155"/>
<rect x="78" y="96" width="84" height="36" rx="8" fill="#0EA5E9" fill-opacity="0.45"/>
<rect x="186" y="96" width="84" height="36" rx="8" fill="#22D3EE" fill-opacity="0.45"/>
<path d="M66 64V84H120" stroke="#93C5FD" stroke-width="3"/>
<path d="M174 64V84H228" stroke="#67E8F9" stroke-width="3"/>
<path d="M268 64V84H228" stroke="#A5F3FC" stroke-width="3"/>
</svg>

'@

$files['assets/release.svg'] = @'
<svg width="320" height="160" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="320" height="160" rx="16" fill="#111827"/>
<path d="M46 112L98 72L146 94L204 46L274 60" stroke="#22D3EE" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="98" cy="72" r="8" fill="#34D399"/>
<circle cx="146" cy="94" r="8" fill="#818CF8"/>
<circle cx="204" cy="46" r="8" fill="#22D3EE"/>
<rect x="40" y="118" width="240" height="8" rx="4" fill="#334155"/>
</svg>

'@

$files['assets/testing.svg'] = @'
<svg width="320" height="160" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="320" height="160" rx="16" fill="#111827"/>
<rect x="30" y="34" width="260" height="22" rx="8" fill="#334155"/>
<rect x="30" y="68" width="260" height="22" rx="8" fill="#334155"/>
<rect x="30" y="102" width="260" height="22" rx="8" fill="#334155"/>
<circle cx="44" cy="45" r="6" fill="#34D399"/>
<circle cx="44" cy="79" r="6" fill="#22D3EE"/>
<circle cx="44" cy="113" r="6" fill="#818CF8"/>
<path d="M54 45H274" stroke="#86EFAC" stroke-width="2"/>
<path d="M54 79H244" stroke="#67E8F9" stroke-width="2"/>
<path d="M54 113H214" stroke="#A5B4FC" stroke-width="2"/>
</svg>

'@

foreach ($relativePath in $files.Keys) {
  $targetPath = Join-Path $Destination $relativePath
  $parent = Split-Path $targetPath -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  if ((Test-Path $targetPath) -and -not $Force) {
    Write-Host "Skipping existing file: $relativePath (use -Force to overwrite)"
    continue
  }
  [System.IO.File]::WriteAllText($targetPath, $files[$relativePath], [System.Text.Encoding]::UTF8)
  Write-Host "Wrote $relativePath"
}

Write-Host "OpenBoBS project scaffold created at: $Destination"
Write-Host 'Next steps:'
Write-Host '  1) cd <destination>'
Write-Host '  2) ./run.sh  (Linux/macOS) OR python run.py'
Write-Host '  3) Open http://localhost:4173'
