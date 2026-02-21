const $ = (id) => document.getElementById(id);
const messages = $('messages');
const form = $('composer');
const input = $('input');
const status = $('status');
const template = $('messageTpl');
const projectNameInput = $('projectName') || { value: 'OpenBoBS' };
const profileInput = $('profile') || { value: 'balanced' };
const ollamaModeInput = $('ollamaMode');
const providerSelect = $('providerSelect');
const ollamaModelInput = $('ollamaModel');
const ollamaConnection = $('ollamaConnection');
const autonomyModeInput = $('autonomyMode');
const autonomyCyclesInput = $('autonomyCycles');
const autoRunIntervalInput = $('autoRunInterval');
const autoRunStatus = $('autoRunStatus');
const webSearchQueryInput = $('webSearchQuery');
const searchResults = $('searchResults');
const botNameInput = $('botName');
const botRoleInput = $('botRole');
const botPromptInput = $('botPrompt');
const agentImportUrlInput = $('agentImportUrl');
const agentEditor = $('agentEditor');
const agentLibraryList = $('agentLibraryList');
const historyList = $('historyList');
const metricsList = $('metricsList');
const learningList = $('learningList');
const botPackGrid = $('botPackGrid');
const agentList = $('agentList');
const taskGrid = $('taskGrid');
const activeAgentsBadge = $('activeAgentsBadge');
const timelineList = $('timelineList');
const progressList = $('progressList');
const terminalOutput = $('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const HISTORY_KEY = 'openbobs-workflow-history';
let autoRunTimer = null;
let autoRunRunning = false;
let providersCache = [];
const memory = [];

const workflowTemplates = {
  mvp: { label: 'MVP Launch', summary: 'Build, test, deploy path.', prompt: 'Create deterministic MVP architecture, delivery, and launch plan.' },
  incident: { label: 'Incident Flow', summary: 'Contain and remediate.', prompt: 'Run incident response with containment, impact analysis, and remediation.' },
  scaling: { label: 'Scale Readiness', summary: 'Performance and rollout.', prompt: 'Deliver scale readiness with bottlenecks, observability, and staged rollout.' },
  governance: { label: 'Governance Audit', summary: 'Policy and controls.', prompt: 'Generate governance and compliance remediation action plan.' },
};

const botPacks = [
  { name: 'Platform Architect', role: 'Distributed system planning', prompt: 'Define scalable boundaries, contracts, and migration strategy.' },
  { name: 'Ops Autopilot', role: 'Deployment and SRE lead', prompt: 'Create SLOs, runbooks, and failure recovery automation.' },
  { name: 'Security Reviewer', role: 'Threat and control analysis', prompt: 'Map attack surfaces and prioritize deterministic hardening backlog.' },
  { name: 'Product Strategist', role: 'Outcome-driven roadmap', prompt: 'Translate requirements into measurable milestones and release sequencing.' },
  { name: 'Quality Commander', role: 'Verification lead', prompt: 'Produce layered unit/integration/e2e checks with release gates.' },
];

const agentCatalog = [
  { id: 'architect', name: 'System Architect', defaultOn: true, prompt: 'Define deterministic architecture and contracts.' },
  { id: 'frontend', name: 'Frontend Specialist', defaultOn: true, prompt: 'Deliver polished, accessible, professional UI.' },
  { id: 'backend', name: 'Backend Engineer', defaultOn: true, prompt: 'Guarantee stable backend execution and APIs.' },
  { id: 'qa', name: 'QA Automation', defaultOn: true, prompt: 'Enforce repeatable test coverage and checks.' },
  { id: 'selfupdate', name: 'Self-Updating Agent', defaultOn: true, prompt: 'Track memory and iterate response quality over time.' },
];

const loadJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return fallback;
};

const selfUpdateState = loadJson(SELF_STATE_KEY, { version: 1, runs: 0, learnedTopics: {}, adaptivePolicy: 'Baseline deterministic policy.' });
const workflowHistory = loadJson(HISTORY_KEY, []);

const saveSelfState = () => localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
const saveHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify(workflowHistory.slice(0, 20)));
const selectedAgents = () => agentCatalog.filter((agent) => document.getElementById(`agent-${agent.id}`)?.checked);
const bindClick = (id, handler) => {
  const el = $(id);
  if (el) el.addEventListener('click', handler);
};

function appendMessage(role, content, author = role === 'user' ? 'You' : 'OpenBoBS') {
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  node.querySelector('.meta').textContent = `${author} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  node.querySelector('.content').textContent = content;
  messages.append(node);
  messages.scrollTop = messages.scrollHeight;
  memory.push({ role, author, content, at: new Date().toISOString() });
}

const terminalLog = (line) => {
  terminalOutput.textContent += `[${new Date().toLocaleTimeString()}] ${line}\n`;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
};

function updateSelfLearning(text) {
  selfUpdateState.runs += 1;
  const terms = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 4).slice(0, 12);
  terms.forEach((topic) => {
    selfUpdateState.learnedTopics[topic] = (selfUpdateState.learnedTopics[topic] || 0) + 1;
  });
  if (selfUpdateState.runs % 3 === 0) selfUpdateState.version += 1;
  const top = Object.entries(selfUpdateState.learnedTopics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  selfUpdateState.adaptivePolicy = top.length
    ? `Bias planning toward recurring concerns: ${top.join(', ')}.`
    : 'Baseline deterministic policy.';
  saveSelfState();
  renderLearning();
}

function renderLearning() {
  const top = Object.entries(selfUpdateState.learnedTopics).sort((a, b) => b[1] - a[1]).slice(0, 6);
  learningList.innerHTML = '';
  learningList.insertAdjacentHTML('beforeend', `<li>Version: v${selfUpdateState.version}</li>`);
  learningList.insertAdjacentHTML('beforeend', `<li>Runs: ${selfUpdateState.runs}</li>`);
  learningList.insertAdjacentHTML('beforeend', `<li>Policy: ${selfUpdateState.adaptivePolicy}</li>`);
  top.forEach(([topic, count]) => learningList.insertAdjacentHTML('beforeend', `<li>${topic}: ${count}</li>`));
}

async function refreshOllamaStatus() {
  try {
    const response = await fetch('/api/ollama/status');
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || 'status unavailable');

    providersCache = payload.providers || [];
    if (providerSelect) {
      const currentProvider = providerSelect.value || 'ollama-local';
      providerSelect.innerHTML = '';
      providersCache.forEach((provider) => {
        const opt = document.createElement('option');
        opt.value = provider.id;
        opt.textContent = provider.available ? provider.label : `${provider.label} (unavailable)`;
        if (!provider.available) opt.disabled = true;
        if (provider.id === currentProvider) opt.selected = true;
        providerSelect.append(opt);
      });
      if (!providerSelect.value && providersCache.length) {
        const fallback = providersCache.find((provider) => provider.available) || providersCache[0];
        providerSelect.value = fallback.id;
      }
    }

    const models = payload.ollama?.models?.length ? payload.ollama.models : ['llama3.1:8b'];
    const currentModel = ollamaModelInput.value;
    ollamaModelInput.innerHTML = '';
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === currentModel) opt.selected = true;
      ollamaModelInput.append(opt);
    });

    const connected = Boolean(payload.ollama?.connected);
    ollamaConnection.textContent = connected
      ? `Ollama connected • ${models.length} model(s) ready • Provider routing available`
      : 'Ollama offline • fallback providers available';
    ollamaConnection.style.color = connected ? 'var(--accent-soft)' : 'var(--warning, #f7c86a)';
  } catch (err) {
    ollamaConnection.textContent = `Offline fallback • ${err.message}`;
    ollamaConnection.style.color = 'var(--danger)';
  }
}

async function refreshAgentLibrary() {
  const response = await fetch('/api/agents/library');
  const payload = await response.json();
  agentLibraryList.innerHTML = '';
  if (!payload.items?.length) {
    agentLibraryList.innerHTML = '<li>No imported agents yet.</li>';
    return;
  }
  payload.items.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="library-edit" data-file="${item.file}">Edit</button> <strong>${item.name}</strong> <a href="${item.downloadUrl}" download>Download</a>`;
    li.dataset.content = JSON.stringify(item.content, null, 2);
    agentLibraryList.append(li);
  });
}

async function importAgent() {
  const url = agentImportUrlInput.value.trim();
  if (!url) return;
  terminalLog(`Importing agent from ${url}`);
  const response = await fetch('/api/agents/import', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
  });
  const payload = await response.json();
  appendMessage('assistant', payload.ok ? `Imported agent: ${payload.name}` : `Import failed: ${payload.error}`, 'Agent Library');
  await refreshAgentLibrary();
  await refreshMetrics();
}

async function saveEditedAgent() {
  const raw = agentEditor.value.trim();
  if (!raw) return;
  try {
    const agent = JSON.parse(raw);
    const response = await fetch('/api/agents/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent })
    });
    const payload = await response.json();
    appendMessage('assistant', payload.ok ? `Saved agent: ${payload.name}` : `Save failed: ${payload.error}`, 'Agent Library');
    await refreshAgentLibrary();
    await refreshMetrics();
  } catch (err) {
    appendMessage('assistant', `Invalid JSON: ${err.message}`, 'Agent Library');
  }
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

function renderBotPacks() {
  botPackGrid.innerHTML = '';
  botPacks.forEach((pack, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `Pack ${idx + 1}`;
    btn.title = `${pack.name}: ${pack.role}`;
    btn.addEventListener('click', () => {
      botNameInput.value = pack.name;
      botRoleInput.value = pack.role;
      botPromptInput.value = pack.prompt;
      createBotAgent();
    });
    botPackGrid.append(btn);
  });
}

function createBotAgent() {
  const name = botNameInput.value.trim();
  const role = botRoleInput.value.trim();
  const prompt = botPromptInput.value.trim();
  if (!name || !role || !prompt) return;
  const id = `custom-${Date.now()}`;
  agentCatalog.push({ id, name, defaultOn: true, prompt: `${role}. ${prompt}` });
  renderAgents();
  document.getElementById(`agent-${id}`).checked = true;
  updateActiveAgentBadge();
  appendMessage('assistant', `New agent created: ${name}`, 'Creator');
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

function addHistoryEntry(task, mode = 'manual') {
  workflowHistory.unshift({ task, at: new Date().toISOString(), mode });
  while (workflowHistory.length > 20) workflowHistory.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = workflowHistory.length ? '' : '<li>No runs yet.</li>';
  workflowHistory.slice(0, 8).forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="history-replay" data-history-index="${idx}">Replay</button> ${new Date(item.at).toLocaleString()} • ${item.task.slice(0, 70)}`;
    historyList.append(li);
  });
}

function refreshTimeline() {
  timelineList.innerHTML = '';
  ['Request captured', 'Agent composition', 'Execution', 'Self-learning update', 'Deployment summary'].forEach((step) => {
    timelineList.insertAdjacentHTML('beforeend', `<li>${step}</li>`);
  });
}

function renderProgress(active) {
  progressList.innerHTML = '';
  active.forEach((agent) => {
    progressList.insertAdjacentHTML('beforeend', `<div class="progress-row"><span>${agent.name}</span><div class="bar"><i id="bar-${agent.id}"></i></div><em id="pct-${agent.id}">0%</em></div>`);
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
      }, 120 + idx * 24);
    });
  });
}

const profilePolicy = () => ({ balanced: 'Practical quality gates.', creative: 'Ambitious alternatives.', strict: 'Deterministic controls and acceptance criteria.' }[profileInput.value]);

async function askOllama(task, active, cycle, totalCycles) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profilePolicy()}`,
    `Self-Learning: ${selfUpdateState.adaptivePolicy}`,
    `Cycle: ${cycle}/${totalCycles}`,
    `Agents: ${active.map((a) => a.name).join(', ')}`,
    `Task: ${task}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: providerSelect?.value || 'ollama-local',
      model: ollamaModelInput.value || 'llama3.1:8b',
      messages: [{ role: 'system', content: 'You are an enterprise AI deployment orchestrator.' }, { role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Ollama unavailable');
  return data.reply;
}

function localFallback(task, active, cycle, totalCycles) {
  return [
    `Cycle ${cycle}/${totalCycles}`,
    `Adaptive policy: ${selfUpdateState.adaptivePolicy}`,
    ...active.map((a) => `${a.name}\n- ${a.prompt}\n- Task: ${task}`),
    'Deployment summary\nOffline deterministic fallback completed.',
  ].join('\n\n');
}

async function runWorkflow(text) {
  const active = selectedAgents();
  if (!active.length) {
    appendMessage('assistant', 'No agents enabled.', 'Orchestrator');
    return;
  }
  status.textContent = 'Running workflow...';
  terminalLog(`Workflow: ${text}`);
  addHistoryEntry(text, 'manual');
  updateSelfLearning(text);
  refreshTimeline();
  renderProgress(active);
  await progressRunner(active);

  const totalCycles = autonomyModeInput.checked ? Math.min(8, Math.max(1, Number(autonomyCyclesInput.value || 1))) : 1;
  let output = '';
  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    try {
      output = ollamaModeInput.checked ? await askOllama(text, active, cycle, totalCycles) : localFallback(text, active, cycle, totalCycles);
    } catch (e) {
      terminalLog(`Ollama error: ${e.message}`);
      output = localFallback(text, active, cycle, totalCycles);
    }
  }
  appendMessage('assistant', output, 'Orchestrator');
  status.textContent = `Ready • v${selfUpdateState.version}`;
  await refreshMetrics();
}

async function refreshMetrics() {
  try {
    const response = await fetch('/api/runtime/metrics');
    const payload = await response.json();
    metricsList.innerHTML = '';
    Object.entries(payload.metrics || {}).forEach(([k, v]) => metricsList.insertAdjacentHTML('beforeend', `<li>${k}: ${v}</li>`));
    metricsList.insertAdjacentHTML('beforeend', `<li>uptimeSeconds: ${payload.uptimeSeconds ?? 'n/a'}</li>`);
  } catch {
    metricsList.innerHTML = '<li>Metrics unavailable.</li>';
  }
}

function slashResponse(text) {
  const cmd = text.trim().toLowerCase();
  if (cmd === '/help') return 'Commands\n/help /plan /agents /risk /ship /summary /selfupdate /playbooks /metrics /botpacks';
  if (cmd === '/metrics') return Array.from(metricsList.querySelectorAll('li')).map((li) => li.textContent).join('\n');
  if (cmd === '/botpacks') return botPacks.map((p) => `${p.name}: ${p.role}`).join('\n');
  if (cmd === '/playbooks') return Object.values(workflowTemplates).map((p) => `${p.label}: ${p.summary}`).join('\n');
  if (cmd === '/selfupdate') return `Version v${selfUpdateState.version}\nPolicy: ${selfUpdateState.adaptivePolicy}`;
  if (cmd === '/plan') return 'Plan\n1) Scope\n2) Build\n3) Validate\n4) Deploy';
  if (cmd === '/agents') return agentCatalog.map((a) => `- ${a.name}`).join('\n');
  if (cmd === '/risk') return 'Risk\n- scope drift\n- coverage gaps\n- rollout regression';
  if (cmd === '/ship') return 'Ship\n- freeze\n- test\n- monitor\n- rollout';
  if (cmd === '/summary') return `Project: ${projectNameInput.value}\nProfile: ${profileInput.value}\n${selfUpdateState.adaptivePolicy}`;
  return null;
}

function startAutoRun() {
  if (autoRunTimer || autoRunRunning) return;
  const seconds = Math.max(10, Number(autoRunIntervalInput.value || 60) || 60);
  autoRunIntervalInput.value = String(seconds);
  autoRunTimer = setInterval(async () => {
    if (autoRunRunning) return;
    autoRunRunning = true;
    const text = input.value.trim() || workflowTemplates.mvp.prompt;
    appendMessage('user', text, 'Auto-Runner');
    try {
      await runWorkflow(text);
    } finally {
      autoRunRunning = false;
    }
  }, seconds * 1000);
  autoRunStatus.textContent = `Auto-run active every ${seconds}s.`;
  $('startAutoBtn').disabled = true;
  $('stopAutoBtn').disabled = false;
  appendMessage('assistant', `Auto-run started every ${seconds}s.`, 'Autonomy');
}

function stopAutoRun() {
  if (autoRunTimer) clearInterval(autoRunTimer);
  autoRunTimer = null;
  autoRunRunning = false;
  autoRunStatus.textContent = 'Auto-run idle.';
  $('startAutoBtn').disabled = false;
  $('stopAutoBtn').disabled = true;
  appendMessage('assistant', 'Auto-run stopped.', 'Autonomy');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const slash = slashResponse(text);
  if (slash) {
    appendMessage('assistant', slash, 'Command Center');
    input.value = '';
    return;
  }
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

bindClick('runWorkflowBtn', async () => {
  const text = input.value.trim() || workflowTemplates.mvp.prompt;
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

bindClick('healthBtn', async () => {
  await refreshOllamaStatus();
  await refreshMetrics();
});
bindClick('importAgentBtn', importAgent);
bindClick('refreshAgentLibraryBtn', refreshAgentLibrary);
bindClick('saveEditedAgentBtn', saveEditedAgent);
bindClick('webSearchBtn', async () => {
  const query = webSearchQueryInput.value.trim();
  if (!query) return;
  const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const payload = await response.json();
  searchResults.innerHTML = '';
  (payload.results || []).forEach((r) => searchResults.insertAdjacentHTML('beforeend', `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a></li>`));
});
bindClick('createBotBtn', createBotAgent);
bindClick('allAgentsBtn', () => { agentCatalog.forEach((a) => { const cb = document.getElementById(`agent-${a.id}`); if (cb) cb.checked = true; }); updateActiveAgentBadge(); });
bindClick('clearAgentsBtn', () => { agentCatalog.forEach((a) => { const cb = document.getElementById(`agent-${a.id}`); if (cb) cb.checked = false; }); updateActiveAgentBadge(); });
bindClick('clearBtn', () => { messages.innerHTML = ''; terminalOutput.textContent = ''; memory.length = 0; });
bindClick('themeBtn', () => document.documentElement.classList.toggle('light'));
bindClick('startAutoBtn', startAutoRun);
bindClick('stopAutoBtn', stopAutoRun);

historyList.addEventListener('click', async (event) => {
  const btn = event.target.closest('.history-replay');
  if (!btn) return;
  const item = workflowHistory[Number(btn.dataset.historyIndex)];
  if (!item) return;
  appendMessage('user', item.task, 'Replay');
  await runWorkflow(item.task);
});

agentLibraryList.addEventListener('click', (event) => {
  const btn = event.target.closest('.library-edit');
  if (!btn) return;
  const li = btn.closest('li');
  agentEditor.value = li?.dataset.content || '';
});

bindClick('exportBtn', () => {
  const payload = {
    project: projectNameInput.value,
    profile: profileInput.value,
    ollamaMode: ollamaModeInput.checked,
    ollamaModel: ollamaModelInput.value,
    autonomyMode: autonomyModeInput.checked,
    autonomyCycles: autonomyCyclesInput.value,
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
renderBotPacks();
renderAgents();
renderHistory();
refreshTimeline();
renderLearning();
refreshMetrics();
refreshOllamaStatus();
refreshAgentLibrary();
stopAutoRun();
setInterval(refreshMetrics, 15000);
terminalLog('Dashboard online.');
appendMessage('assistant', 'OpenBoBS ready: create/import/edit/deploy AI agents with offline Ollama connection status and autonomous execution.');
