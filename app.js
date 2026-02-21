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
const botNameInput = document.getElementById('botName');
const botRoleInput = document.getElementById('botRole');
const botPromptInput = document.getElementById('botPrompt');
const webSearchQueryInput = document.getElementById('webSearchQuery');
const searchResults = document.getElementById('searchResults');
const historyList = document.getElementById('historyList');
const metricsList = document.getElementById('metricsList');
const botPackGrid = document.getElementById('botPackGrid');
const agentImportUrlInput = document.getElementById('agentImportUrl');
const agentLibraryList = document.getElementById('agentLibraryList');

const agentList = document.getElementById('agentList');
const taskGrid = document.getElementById('taskGrid');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const progressList = document.getElementById('progressList');
const terminalOutput = document.getElementById('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const HISTORY_KEY = 'openbobs-workflow-history';
const memory = [];

const workflowTemplates = {
  mvp: { label: 'MVP Sprint', summary: 'PRD, architecture, UI skeleton, test plan, release gates.', prompt: 'Build an enterprise MVP plan with deterministic architecture, UX milestones, tests, and release criteria.' },
  incident: { label: 'Incident Response', summary: 'Containment, blast radius, remediation, postmortem controls.', prompt: 'Execute incident response with detection, containment, remediation, and hardening actions.' },
  scaling: { label: 'Scale Readiness', summary: 'Bottlenecks, observability, rollout safety and load strategy.', prompt: 'Create scale readiness package with throughput plan, observability, and staged rollout controls.' },
  security: { label: 'Security Hardening', summary: 'Threat model, auth controls, secrets and audit improvements.', prompt: 'Produce security hardening backlog with threat model, auth checks, secrets handling, and audits.' },
};

const botPacks = [
  { name: 'Red Team Commander', role: 'Adversarial simulation planner', prompt: 'Generate phased recon-to-report testing strategy with strict safety boundaries and evidence checkpoints.' },
  { name: 'Blue Team Defender', role: 'Detection and hardening lead', prompt: 'Create SIEM detections, containment playbooks, and preventative controls for discovered risks.' },
  { name: 'Compliance Auditor', role: 'Policy and controls verification', prompt: 'Map findings to ISO/SOC2 style controls and provide remediation ownership matrix.' },
  { name: 'SRE Reliability Chief', role: 'Availability and incident resilience', prompt: 'Define SLOs, runbooks, failure modes, and staged rollback policies.' },
  { name: 'Data Privacy Officer', role: 'Data governance and privacy', prompt: 'Assess PII handling, retention, and lawful processing controls with action items.' },
];

const agentCatalog = [
  { id: 'architect', name: 'System Architect', defaultOn: true, prompt: 'Define deterministic architecture and contracts.' },
  { id: 'frontend', name: 'Frontend Specialist', defaultOn: true, prompt: 'Deliver polished, accessible, professional UI.' },
  { id: 'backend', name: 'Backend Engineer', defaultOn: true, prompt: 'Guarantee stable backend execution and APIs.' },
  { id: 'qa', name: 'QA Automation', defaultOn: true, prompt: 'Enforce repeatable test coverage and checks.' },
  { id: 'ops', name: 'Platform Operations', defaultOn: true, prompt: 'Provide deployment reliability and runtime controls.' },
  { id: 'selfupdate', name: 'Self-Updating Agent', defaultOn: true, prompt: 'Track memory and iterate response quality over time.' },
];

const loadJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return fallback;
};

const selfUpdateState = loadJson(SELF_STATE_KEY, { version: 1, runs: 0, learnedTopics: {} });
const workflowHistory = loadJson(HISTORY_KEY, []);
const saveSelfState = () => localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
const saveHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify(workflowHistory.slice(0, 20)));
const selectedAgents = () => agentCatalog.filter((agent) => document.getElementById(`agent-${agent.id}`)?.checked);

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
  historyList.innerHTML = workflowHistory.length ? '' : '<li>No runs yet.</li>';
  workflowHistory.slice(0, 8).forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="history-replay" data-history-index="${idx}">Replay</button> ${new Date(item.at).toLocaleString()} • ${item.task.slice(0, 70)}`;
    historyList.append(li);
  });
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
    li.innerHTML = `<strong>${item.name}</strong> (${item.file}) <a href="${item.downloadUrl}" download>Download</a>`;
    agentLibraryList.append(li);
  });
}

async function importAgent() {
  const url = agentImportUrlInput.value.trim();
  if (!url) return;
  terminalLog(`Importing agent from: ${url}`);
  const response = await fetch('/api/agents/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const payload = await response.json();
  if (payload.ok) {
    appendMessage('assistant', `Imported agent: ${payload.name}\nFile: ${payload.file}`, 'Agent Library');
    await refreshAgentLibrary();
  } else {
    appendMessage('assistant', `Agent import failed: ${payload.error}`, 'Agent Library');
  }
  await refreshMetrics();
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

function renderBotPacks() {
  botPackGrid.innerHTML = '';
  botPacks.forEach((pack, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `Load ${idx + 1}`;
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
  if (cmd === '/help') return 'Commands\n/help /plan /agents /risk /ship /summary /selfupdate /playbooks /metrics /botpacks';
  if (cmd === '/plan') return 'Plan\n1) Scope\n2) Architecture\n3) Build\n4) QA\n5) Release';
  if (cmd === '/agents') return ['Agents', ...agentCatalog.map((a) => `- ${a.name}`)].join('\n');
  if (cmd === '/risk') return 'Risk matrix\n- Scope creep\n- Integration drift\n- Coverage gaps\n- Rollout regressions';
  if (cmd === '/ship') return 'Ship checklist\n- Freeze scope\n- Green checks\n- Validate monitoring\n- Staged rollout';
  if (cmd === '/summary') return `Summary\nProject: ${projectNameInput.value}\nProfile: ${profileInput.value}\n${selfSummary()}`;
  if (cmd === '/selfupdate') return `Self updater\n${selfSummary()}`;
  if (cmd === '/playbooks') return ['Playbooks', ...Object.values(workflowTemplates).map((p) => `- ${p.label}: ${p.summary}`)].join('\n');
  if (cmd === '/botpacks') return ['Bot packs', ...botPacks.map((p) => `- ${p.name}: ${p.role}`)].join('\n');
  if (cmd === '/metrics') return Array.from(metricsList.querySelectorAll('li')).map((li) => li.textContent).join('\n') || 'No metrics yet.';
  return null;
}

const profilePolicy = () => ({ balanced: 'Practical quality gates.', creative: 'Ambitious UX within guardrails.', strict: 'Deterministic controls and explicit acceptance criteria.' }[profileInput.value]);

async function askOllama(task, active, cycle, totalCycles) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profilePolicy()}`,
    `Cycle: ${cycle}/${totalCycles}`,
    `Agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self-memory: ${selfSummary()}`,
    `Task: ${task}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelInput.value,
      messages: [
        { role: 'system', content: 'You are OpenBoBS deterministic orchestrator. Produce clean structured output with enterprise controls.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  if (!data.ok) throw new Error(data.error || 'Ollama unavailable');
  return data.reply;
}

function localFallback(task, active, cycle, totalCycles) {
  return [
    `Cycle ${cycle}/${totalCycles}`,
    ...active.map((agent) => `${agent.name}\n- ${agent.prompt}\n- Task: ${task}\n- Policy: ${profilePolicy()}`),
    'Orchestrator\nDeterministic local fallback completed with release-oriented deliverables.',
  ].join('\n\n');
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

function createBotAgent() {
  const name = botNameInput.value.trim();
  const role = botRoleInput.value.trim();
  const prompt = botPromptInput.value.trim();
  if (!name || !role || !prompt) return;
  const id = `custom-${Date.now()}`;
  agentCatalog.push({ id, name, defaultOn: true, prompt: `${role}. ${prompt}` });
  renderAgents();
  document.getElementById(`agent-${id}`).checked = true;
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

  const totalCycles = autonomyModeInput.checked ? Math.min(5, Math.max(1, Number(autonomyCyclesInput.value || 1))) : 1;
  let finalOutput = '';

  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    try {
      finalOutput = ollamaModeInput.checked ? await askOllama(text, active, cycle, totalCycles) : localFallback(text, active, cycle, totalCycles);
    } catch (error) {
      terminalLog(`Cycle ${cycle}/${totalCycles} Ollama error: ${error.message}`);
      finalOutput = localFallback(text, active, cycle, totalCycles);
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

document.getElementById('healthBtn').addEventListener('click', async () => {
  status.textContent = 'Checking runtime health...';
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    appendMessage('assistant', payload.ok ? `Ollama healthy. Models: ${payload.models.join(', ') || 'none found'}` : `Ollama unavailable: ${payload.error}`, 'Runtime');
  } catch (error) {
    appendMessage('assistant', `Health check failed: ${error.message}`, 'Runtime');
  }
  await refreshMetrics();
});

document.getElementById('webSearchBtn').addEventListener('click', runWebSearch);
document.getElementById('createBotBtn').addEventListener('click', createBotAgent);
document.getElementById('importAgentBtn').addEventListener('click', importAgent);
document.getElementById('refreshAgentLibraryBtn').addEventListener('click', refreshAgentLibrary);

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
refreshMetrics();
refreshAgentLibrary();
setInterval(refreshMetrics, 15000);
terminalLog('Dashboard online. Enterprise mode active.');
appendMessage('assistant', 'OpenBoBS ready. Import agents from Sabrina, use library download links, and orchestrate with advanced bot packs.');
