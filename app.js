const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const status = document.getElementById('status');
const template = document.getElementById('messageTpl');
const projectNameInput = document.getElementById('projectName');
const profileInput = document.getElementById('profile');
const ollamaModeInput = document.getElementById('ollamaMode');
const ollamaModelInput = document.getElementById('ollamaModel');
const autonomyModeInput = document.getElementById('autonomyMode');
const autonomyCyclesInput = document.getElementById('autonomyCycles');
const allowKaliLaunchesInput = document.getElementById('allowKaliLaunches');
const botNameInput = document.getElementById('botName');
const botRoleInput = document.getElementById('botRole');
const botPromptInput = document.getElementById('botPrompt');
const webSearchQueryInput = document.getElementById('webSearchQuery');
const searchResults = document.getElementById('searchResults');
const kaliResults = document.getElementById('kaliResults');
const kaliCatalogSummary = document.getElementById('kaliCatalogSummary');
const historyList = document.getElementById('historyList');
const metricsList = document.getElementById('metricsList');

const agentList = document.getElementById('agentList');
const taskGrid = document.getElementById('taskGrid');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const progressList = document.getElementById('progressList');
const terminalOutput = document.getElementById('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const HISTORY_KEY = 'openbobs-workflow-history';
const memory = [];
let currentToolContext = null;

const workflowTemplates = {
  mvp: { label: 'MVP Sprint', summary: 'PRD, architecture, UI skeleton, test plan, release gates.', prompt: 'Build an enterprise MVP plan with deterministic architecture, UX milestones, tests, and release criteria.' },
  incident: { label: 'Incident Response', summary: 'Containment, blast radius, remediation, postmortem controls.', prompt: 'Execute incident response with detection, containment, remediation, and hardening actions.' },
  scaling: { label: 'Scale Readiness', summary: 'Bottlenecks, observability, rollout safety and load strategy.', prompt: 'Create scale readiness package with throughput plan, observability, and staged rollout controls.' },
  security: { label: 'Security Hardening', summary: 'Threat model, auth controls, secrets and audit improvements.', prompt: 'Produce security hardening backlog with threat model, auth checks, secrets handling, and audits.' },
};

const agentCatalog = [
  { id: 'architect', name: 'System Architect', defaultOn: true, prompt: 'Define deterministic architecture and contracts.' },
  { id: 'frontend', name: 'Frontend Specialist', defaultOn: true, prompt: 'Deliver polished, accessible, professional UI.' },
  { id: 'backend', name: 'Backend Engineer', defaultOn: true, prompt: 'Guarantee stable backend execution and APIs.' },
  { id: 'qa', name: 'QA Automation', defaultOn: true, prompt: 'Enforce repeatable test coverage and checks.' },
  { id: 'ops', name: 'Platform Operations', defaultOn: true, prompt: 'Provide deployment reliability and runtime controls.' },
  { id: 'selfupdate', name: 'Self-Updating Agent', defaultOn: true, prompt: 'Track memory and iterate response quality over time.' },
];

function loadSelfState() {
  try {
    const saved = localStorage.getItem(SELF_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return { version: 1, runs: 0, learnedTopics: {} };
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return [];
}

const selfUpdateState = loadSelfState();
const workflowHistory = loadHistory();
const saveSelfState = () => localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
const saveHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify(workflowHistory.slice(0, 20)));
const selectedAgents = () => agentCatalog.filter((agent) => document.getElementById(`agent-${agent.id}`)?.checked);

function profilePolicy() {
  return { balanced: 'Practical quality gates.', creative: 'Ambitious UX within guardrails.', strict: 'Deterministic controls and explicit acceptance criteria.' }[profileInput.value];
}

function appendMessage(role, content, author = role === 'user' ? 'You' : 'OpenBoBS') {
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector('.meta').textContent = `${author} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  node.querySelector('.content').textContent = content;
  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
  memory.push({ role, author, content, at: new Date().toISOString() });
}

function terminalLog(line) {
  terminalOutput.textContent += `[${new Date().toLocaleTimeString()}] ${line}\n`;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function addHistoryEntry(task, mode = 'manual') {
  workflowHistory.unshift({ task, at: new Date().toISOString(), mode });
  while (workflowHistory.length > 20) workflowHistory.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  workflowHistory.slice(0, 8).forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="history-replay" data-history-index="${idx}">Replay</button> ${new Date(item.at).toLocaleString()} • ${item.task.slice(0, 70)}`;
    historyList.append(li);
  });
  if (!workflowHistory.length) historyList.innerHTML = '<li>No runs yet.</li>';
}

async function refreshMetrics() {
  try {
    const response = await fetch('/api/runtime/metrics');
    const payload = await response.json();
    metricsList.innerHTML = '';
    Object.entries(payload.metrics || {}).forEach(([k, v]) => {
      const li = document.createElement('li');
      li.textContent = `${k}: ${v}`;
      metricsList.append(li);
    });
    metricsList.insertAdjacentHTML('beforeend', `<li>uptimeSeconds: ${payload.uptimeSeconds ?? 'n/a'}</li>`);
  } catch {
    metricsList.innerHTML = '<li>Metrics unavailable.</li>';
  }
}

function updateSelfLearning(text) {
  selfUpdateState.runs += 1;
  text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((word) => word.length > 4).slice(0, 12).forEach((topic) => {
    selfUpdateState.learnedTopics[topic] = (selfUpdateState.learnedTopics[topic] || 0) + 1;
  });
  if (selfUpdateState.runs % 3 === 0) selfUpdateState.version += 1;
  saveSelfState();
}

function selfSummary() {
  const topics = Object.entries(selfUpdateState.learnedTopics).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => `${name}(${count})`).join(', ');
  return `v${selfUpdateState.version} • runs:${selfUpdateState.runs} • learned:${topics || 'none yet'}`;
}

function renderTaskGrid() {
  taskGrid.innerHTML = '';
  Object.values(workflowTemplates).forEach((item) => {
    const card = document.createElement('button');
    card.className = 'task-card';
    card.type = 'button';
    card.innerHTML = `<strong>${item.label}</strong><small>${item.summary}</small><span>Run 1-click</span>`;
    card.addEventListener('click', async () => {
      appendMessage('user', item.prompt, 'Playbook');
      addHistoryEntry(item.prompt, 'playbook');
      await runWorkflow(item.prompt);
    });
    taskGrid.append(card);
  });
}

function renderAgents() {
  agentList.innerHTML = '';
  agentCatalog.forEach((agent) => {
    const card = document.createElement('label');
    card.className = 'agent-card';
    card.innerHTML = `<input type="checkbox" id="agent-${agent.id}" ${agent.defaultOn ? 'checked' : ''} /><div><strong>${agent.name}</strong><small>${agent.prompt}</small></div>`;
    card.querySelector('input').addEventListener('change', updateActiveAgentBadge);
    agentList.append(card);
  });
  updateActiveAgentBadge();
}

function updateActiveAgentBadge() {
  const active = selectedAgents();
  activeAgentsBadge.textContent = `${active.length} agent${active.length === 1 ? '' : 's'} active`;
}

function refreshTimeline() {
  timelineList.innerHTML = '';
  ['Request captured', 'Plan generated', 'Agent execution', 'Validation + synthesis', 'Release-ready output'].forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    timelineList.append(item);
  });
}

function renderProgress(active) {
  progressList.innerHTML = '';
  active.forEach((agent) => {
    const row = document.createElement('div');
    row.className = 'progress-row';
    row.innerHTML = `<span>${agent.name}</span><div class="bar"><i id="bar-${agent.id}"></i></div><em id="pct-${agent.id}">0%</em>`;
    progressList.append(row);
  });
}

function progressRunner(active) {
  return new Promise((resolve) => {
    if (!active.length) return resolve();
    let done = 0;
    active.forEach((agent, idx) => {
      let value = 0;
      const tick = setInterval(() => {
        value = Math.min(100, value + 9 + Math.floor(Math.random() * 8));
        const bar = document.getElementById(`bar-${agent.id}`);
        const pct = document.getElementById(`pct-${agent.id}`);
        if (bar) bar.style.width = `${value}%`;
        if (pct) pct.textContent = `${value}%`;
        if (value >= 100) {
          clearInterval(tick);
          terminalLog(`${agent.name} complete (${idx + 1}/${active.length}).`);
          done += 1;
          if (done === active.length) resolve();
        }
      }, 130 + idx * 22);
    });
  });
}

function slashResponse(text) {
  const cmd = text.trim().toLowerCase();
  if (cmd === '/plan') return 'Plan\n1) Scope\n2) Architecture\n3) Build\n4) QA\n5) Release';
  if (cmd === '/agents') return ['Agents', ...agentCatalog.map((a) => `- ${a.name}`)].join('\n');
  if (cmd === '/risk') return 'Risk matrix\n- Scope creep\n- Integration drift\n- Coverage gaps\n- Rollout regressions';
  if (cmd === '/ship') return 'Ship checklist\n- Freeze scope\n- Green checks\n- Validate monitoring\n- Staged rollout';
  if (cmd === '/summary') return `Summary\nProject: ${projectNameInput.value}\nProfile: ${profileInput.value}\n${selfSummary()}`;
  if (cmd === '/selfupdate') return `Self updater\n${selfSummary()}`;
  if (cmd === '/playbooks') return ['Playbooks', ...Object.values(workflowTemplates).map((p) => `- ${p.label}: ${p.summary}`)].join('\n');
  if (cmd === '/metrics') return Array.from(metricsList.querySelectorAll('li')).map((li) => li.textContent).join('\n') || 'No metrics yet.';
  if (cmd === '/help') return 'Commands\n/plan /agents /risk /ship /summary /selfupdate /playbooks /metrics /help';
  return null;
}

async function loadAgentToolContext(activeAgents) {
  const response = await fetch('/api/agent/tools-context', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeAgents: activeAgents.map((agent) => agent.name) }),
  });
  const payload = await response.json();
  currentToolContext = payload;
  return payload;
}

async function askOllama(task, active, cycle, totalCycles, toolContext) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profilePolicy()}`,
    `Cycle: ${cycle}/${totalCycles}`,
    `Agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self-memory: ${selfSummary()}`,
    `Kali tool context (inventory + safe runnable): ${JSON.stringify(toolContext?.tooling || {})}`,
    'Return concise enterprise output per agent plus final orchestration summary and acceptance criteria.',
    `Task: ${task}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModelInput.value, messages: [{ role: 'system', content: 'You are OpenBoBS deterministic orchestrator. Produce clean structured output.' }, { role: 'user', content: prompt }] }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Ollama unavailable');
  return data.reply;
}

function localFallback(task, active, cycle, totalCycles, toolContext) {
  return [
    `Cycle ${cycle}/${totalCycles}`,
    `Kali inventory installed: ${toolContext?.tooling?.installedCount ?? 0}`,
    `Kali safe runnable: ${toolContext?.tooling?.safeRunnableTools?.join(', ') || 'none'}`,
    ...active.map((agent) => `${agent.name}\n- ${agent.prompt}\n- Task: ${task}\n- Policy: ${profilePolicy()}`),
    'Orchestrator\nDeterministic local fallback completed with release-oriented deliverables.',
  ].join('\n\n');
}

async function checkHealth() {
  status.textContent = 'Checking runtime health...';
  terminalLog('Runtime health check started.');
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    appendMessage('assistant', payload.ok ? `Ollama healthy. Models: ${payload.models.join(', ') || 'none found'}` : `Ollama unavailable: ${payload.error}`, 'Runtime');
    status.textContent = payload.ok ? 'Runtime healthy' : 'Runtime fallback mode';
  } catch (error) {
    appendMessage('assistant', `Health check failed: ${error.message}`, 'Runtime');
  }
  await refreshMetrics();
}

async function runWebSearch() {
  const query = webSearchQueryInput.value.trim();
  if (!query) return;
  terminalLog(`Running web search for: ${query}`);
  const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const payload = await response.json();
  searchResults.innerHTML = '';
  if (!payload.ok || !payload.results?.length) {
    searchResults.innerHTML = `<li>Search failed: ${payload.error || 'no results'}</li>`;
    return;
  }
  payload.results.forEach((result) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.title}</a>`;
    searchResults.append(item);
  });
  await refreshMetrics();
}

async function refreshKaliCatalog() {
  const response = await fetch('/api/kali/tools');
  const payload = await response.json();
  kaliResults.innerHTML = '';
  const installed = payload.tools.filter((tool) => tool.installed);
  const safe = installed.filter((tool) => tool.safeRunnable);
  kaliCatalogSummary.textContent = `Catalog: ${payload.tools.length} listed • installed: ${installed.length} • safe runnable: ${safe.length}`;
  payload.tools.slice(0, 14).forEach((tool) => {
    const li = document.createElement('li');
    li.textContent = `${tool.name}: ${tool.installed ? 'installed' : 'not installed'} • ${tool.safeRunnable ? 'safe-run' : 'inventory-only'}`;
    kaliResults.append(li);
  });
  await refreshMetrics();
}

async function runKaliTool(tool) {
  if (!allowKaliLaunchesInput.checked) {
    appendMessage('assistant', 'Kali launch blocked by guardrail. Enable "Allow Kali tool launch commands" first.', 'Kali Runner');
    return;
  }
  terminalLog(`Launching Kali tool check: ${tool}`);
  const response = await fetch('/api/kali/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool }) });
  const payload = await response.json();
  appendMessage('assistant', payload.ok ? `${tool} launched:\n${payload.output}` : `${tool} failed: ${payload.error}`, 'Kali Runner');
  await refreshMetrics();
}

function createBotAgent() {
  const id = `custom-${Date.now()}`;
  const name = botNameInput.value.trim();
  const role = botRoleInput.value.trim();
  const prompt = botPromptInput.value.trim();
  if (!name || !role || !prompt) return;
  agentCatalog.push({ id, name, defaultOn: true, prompt: `${role}. ${prompt}` });
  renderAgents();
  document.getElementById(`agent-${id}`).checked = true;
  updateActiveAgentBadge();
  appendMessage('assistant', `New bot agent created: ${name}\nRole: ${role}\nPrompt: ${prompt}`, 'Bot Creator');
}

async function runWorkflow(text) {
  const slash = slashResponse(text);
  if (slash) {
    appendMessage('assistant', slash, 'Command Center');
    return;
  }

  const active = selectedAgents();
  if (!active.length) {
    appendMessage('assistant', 'No agents enabled. Select at least one agent to continue.', 'Orchestrator');
    return;
  }

  status.textContent = 'Running workflow...';
  terminalLog(`Workflow request: ${text}`);
  addHistoryEntry(text, 'manual');
  updateSelfLearning(text);
  refreshTimeline();
  renderProgress(active);
  await progressRunner(active);

  const toolContext = await loadAgentToolContext(active);
  const totalCycles = autonomyModeInput.checked ? Math.min(5, Math.max(1, Number(autonomyCyclesInput.value || 1))) : 1;
  let finalOutput = '';

  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    try {
      finalOutput = ollamaModeInput.checked
        ? await askOllama(text, active, cycle, totalCycles, toolContext)
        : localFallback(text, active, cycle, totalCycles, toolContext);
    } catch (error) {
      terminalLog(`Cycle ${cycle}/${totalCycles} Ollama error: ${error.message}`);
      finalOutput = localFallback(text, active, cycle, totalCycles, toolContext);
    }
  }

  appendMessage('assistant', finalOutput, 'OpenClaw Orchestrator');
  status.textContent = `Ready • ${selfSummary()}`;
  await refreshMetrics();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

document.getElementById('runWorkflowBtn').addEventListener('click', async () => {
  const text = input.value.trim() || workflowTemplates.mvp.prompt;
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

document.getElementById('healthBtn').addEventListener('click', checkHealth);
document.getElementById('webSearchBtn').addEventListener('click', runWebSearch);
document.getElementById('scanKaliBtn').addEventListener('click', refreshKaliCatalog);
document.getElementById('refreshKaliCatalogBtn').addEventListener('click', refreshKaliCatalog);
document.querySelectorAll('.kali-run-btn').forEach((btn) => btn.addEventListener('click', () => runKaliTool(btn.dataset.kaliTool)));
document.getElementById('createBotBtn').addEventListener('click', createBotAgent);

document.getElementById('allAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    const cb = document.getElementById(`agent-${agent.id}`);
    if (cb) cb.checked = true;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    const cb = document.getElementById(`agent-${agent.id}`);
    if (cb) cb.checked = false;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  messages.innerHTML = '';
  terminalOutput.textContent = '';
  memory.length = 0;
  appendMessage('assistant', 'Session cleared.');
});

document.getElementById('themeBtn').addEventListener('click', () => document.documentElement.classList.toggle('light'));

historyList.addEventListener('click', async (event) => {
  const btn = event.target.closest('.history-replay');
  if (!btn) return;
  const idx = Number(btn.dataset.historyIndex);
  const item = workflowHistory[idx];
  if (!item) return;
  appendMessage('user', item.task, 'Replay');
  await runWorkflow(item.task);
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = {
    project: projectNameInput.value,
    profile: profileInput.value,
    ollamaMode: ollamaModeInput.checked,
    ollamaModel: ollamaModelInput.value,
    autonomyMode: autonomyModeInput.checked,
    autonomyCycles: autonomyCyclesInput.value,
    guardrails: { allowKaliLaunches: allowKaliLaunchesInput.checked },
    toolContext: currentToolContext,
    selfUpdateState,
    workflowHistory,
    activeAgents: selectedAgents().map((a) => a.id),
    memory,
    terminal: terminalOutput.textContent,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'openbobs-session.json';
  a.click();
  URL.revokeObjectURL(url);
});

renderTaskGrid();
renderAgents();
refreshTimeline();
renderHistory();
refreshMetrics();
setInterval(refreshMetrics, 15000);
terminalLog('Dashboard online. Deterministic runtime active.');
appendMessage('assistant', 'OpenBoBS is ready. Use playbooks, bot creator, web search, safe Kali catalog, history replay, and runtime metrics.');
refreshKaliCatalog();
