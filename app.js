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
const kaliResults = document.getElementById('kaliResults');

const agentList = document.getElementById('agentList');
const taskGrid = document.getElementById('taskGrid');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const progressList = document.getElementById('progressList');
const terminalOutput = document.getElementById('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const memory = [];

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
const selfUpdateState = loadSelfState();
const saveSelfState = () => localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
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

async function askOllama(task, active, cycle, totalCycles) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profilePolicy()}`,
    `Cycle: ${cycle}/${totalCycles}`,
    `Agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self-memory: ${selfSummary()}`,
    'Return concise enterprise output per agent plus final orchestration summary and acceptance criteria.',
    `Task: ${task}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelInput.value,
      messages: [
        { role: 'system', content: 'You are OpenBoBS deterministic orchestrator. Produce clean structured output.' },
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
}

async function runWebSearch() {
  const query = webSearchQueryInput.value.trim();
  if (!query) return;
  terminalLog(`Running web search for: ${query}`);
  const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const payload = await response.json();
  searchResults.innerHTML = '';
  if (!payload.ok || !payload.results?.length) {
    const item = document.createElement('li');
    item.textContent = `Search failed: ${payload.error || 'no results'}`;
    searchResults.append(item);
    return;
  }
  payload.results.forEach((result) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.title}</a>`;
    searchResults.append(item);
  });
}

async function scanKaliTools() {
  terminalLog('Scanning Kali tool availability.');
  const response = await fetch('/api/kali/tools');
  const payload = await response.json();
  kaliResults.innerHTML = '';
  payload.tools.forEach((tool) => {
    const li = document.createElement('li');
    li.textContent = `${tool.name}: ${tool.installed ? 'installed' : 'not installed'} (${tool.check})`;
    kaliResults.append(li);
  });
}

async function runKaliTool(tool) {
  terminalLog(`Launching Kali tool check: ${tool}`);
  const response = await fetch('/api/kali/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool }) });
  const payload = await response.json();
  appendMessage('assistant', payload.ok ? `${tool} launched:\n${payload.output}` : `${tool} failed: ${payload.error}`, 'Kali Runner');
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
  const active = selectedAgents();
  if (!active.length) {
    appendMessage('assistant', 'No agents enabled. Select at least one agent to continue.', 'Orchestrator');
    return;
  }

  status.textContent = 'Running workflow...';
  terminalLog(`Workflow request: ${text}`);
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
document.getElementById('scanKaliBtn').addEventListener('click', scanKaliTools);
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

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = {
    project: projectNameInput.value,
    profile: profileInput.value,
    ollamaMode: ollamaModeInput.checked,
    ollamaModel: ollamaModelInput.value,
    autonomyMode: autonomyModeInput.checked,
    autonomyCycles: autonomyCyclesInput.value,
    selfUpdateState,
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
terminalLog('Dashboard online. Deterministic runtime active.');
appendMessage('assistant', 'OpenBoBS is ready. Use a playbook, bot creator, web search, or Kali tool checks.');
scanKaliTools();
