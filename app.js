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
const agentList = document.getElementById('agentList');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const progressList = document.getElementById('progressList');
const terminalOutput = document.getElementById('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const memory = [];

const workflowTemplates = {
  mvp: 'Build an enterprise MVP plan with deterministic architecture, UX milestones, tests, and release criteria.',
  incident: 'Execute incident response with detection, containment, remediation, and hardening actions.',
  scaling: 'Create scale readiness package with throughput plan, observability, and staged rollout controls.',
  security: 'Produce security hardening backlog with threat model, auth checks, secrets handling, and audits.',
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
  } catch (_) {
    // fallback
  }
  return { version: 1, runs: 0, learnedTopics: {} };
}

const selfUpdateState = loadSelfState();

function saveSelfState() {
  localStorage.setItem(SELF_STATE_KEY, JSON.stringify(selfUpdateState));
}

function selectedAgents() {
  return agentCatalog.filter((agent) => document.getElementById(`agent-${agent.id}`)?.checked);
}

function profilePolicy() {
  return {
    balanced: 'Prioritize practical value while preserving quality gates.',
    creative: 'Provide stronger UX differentiation with bounded risk.',
    strict: 'Use deterministic controls and explicit acceptance criteria.',
  }[profileInput.value];
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
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 14)
    .forEach((topic) => {
      selfUpdateState.learnedTopics[topic] = (selfUpdateState.learnedTopics[topic] || 0) + 1;
    });

  if (selfUpdateState.runs % 3 === 0) selfUpdateState.version += 1;
  saveSelfState();
}

function selfSummary() {
  const topics = Object.entries(selfUpdateState.learnedTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name}(${count})`)
    .join(', ');
  return `v${selfUpdateState.version} • runs:${selfUpdateState.runs} • learned:${topics || 'none yet'}`;
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
        <small>${agent.prompt}</small>
      </div>
    `;
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
  [
    'Request captured',
    'Deterministic planning generated',
    'Agent execution complete',
    'Final synthesis and export-ready output',
  ].forEach((step) => {
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
        value = Math.min(100, value + 10 + Math.floor(Math.random() * 7));
        const bar = document.getElementById(`bar-${agent.id}`);
        const pct = document.getElementById(`pct-${agent.id}`);
        if (bar) bar.style.width = `${value}%`;
        if (pct) pct.textContent = `${value}%`;
        if (value >= 100) {
          clearInterval(tick);
          terminalLog(`${agent.name} finished segment ${idx + 1}/${active.length}`);
          done += 1;
          if (done === active.length) resolve();
        }
      }, 120 + idx * 25);
    });
  });
}

function slashResponse(text) {
  const cmd = text.trim().toLowerCase();
  if (cmd === '/plan') return 'Plan\n1) Scope\n2) Architecture\n3) Build\n4) QA\n5) Release';
  if (cmd === '/agents') return ['Agents', ...agentCatalog.map((a) => `- ${a.name}`)].join('\n');
  if (cmd === '/risk') return 'Risk matrix\n- Scope creep\n- Dependency risk\n- Test coverage gaps\n- Runtime regressions';
  if (cmd === '/ship') return 'Ship checklist\n- Freeze scope\n- Green tests\n- Verify observability\n- Rollout in stages';
  if (cmd === '/summary') return `Summary\nProject: ${projectNameInput.value}\nProfile: ${profileInput.value}\n${selfSummary()}`;
  if (cmd === '/selfupdate') return `Self updater\n${selfSummary()}`;
  return null;
}

async function askOllama(task, active, cycle, totalCycles) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profilePolicy()}`,
    `Cycle: ${cycle}/${totalCycles}`,
    `Agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self-memory: ${selfSummary()}`,
    'Return concise enterprise output per agent plus final orchestration summary.',
    `Task: ${task}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelInput.value,
      messages: [
        { role: 'system', content: 'You are OpenBoBS deterministic orchestrator. Keep results actionable and structured.' },
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
    'Orchestrator\nDeterministic fallback completed with offline-safe local execution.',
  ].join('\n\n');
}

async function checkHealth() {
  status.textContent = 'Checking runtime health...';
  terminalLog('Runtime health check started.');
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    if (payload.ok) {
      appendMessage('assistant', `Ollama healthy. Models: ${payload.models.join(', ') || 'none found'}`, 'Runtime');
      status.textContent = 'Runtime healthy';
      terminalLog('Ollama health check OK.');
    } else {
      appendMessage('assistant', `Ollama unavailable: ${payload.error}`, 'Runtime');
      status.textContent = 'Runtime fallback mode';
      terminalLog(`Ollama unavailable: ${payload.error}`);
    }
  } catch (error) {
    appendMessage('assistant', `Health check failed: ${error.message}`, 'Runtime');
    status.textContent = 'Runtime check failed';
    terminalLog(`Health check failed: ${error.message}`);
  }
}

async function runWorkflow(text) {
  const active = selectedAgents();
  if (!active.length) {
    appendMessage('assistant', 'No agents enabled. Select at least one agent to continue.', 'Orchestrator');
    return;
  }

  const slash = slashResponse(text);
  if (slash) {
    appendMessage('assistant', slash, 'Command Center');
    terminalLog('Command center executed.');
    return;
  }

  status.textContent = 'Running workflow...';
  terminalLog(`Workflow request: ${text}`);
  updateSelfLearning(text);
  refreshTimeline();
  renderProgress(active);
  await progressRunner(active);

  const autonomyEnabled = autonomyModeInput.checked;
  const totalCycles = autonomyEnabled ? Math.min(5, Math.max(1, Number(autonomyCyclesInput.value || 1))) : 1;
  let finalOutput = '';

  for (let cycle = 1; cycle <= totalCycles; cycle += 1) {
    terminalLog(`Cycle ${cycle}/${totalCycles} started.`);
    try {
      if (ollamaModeInput.checked) {
        finalOutput = await askOllama(text, active, cycle, totalCycles);
        terminalLog(`Cycle ${cycle}/${totalCycles} completed via Ollama.`);
      } else {
        finalOutput = localFallback(text, active, cycle, totalCycles);
        terminalLog(`Cycle ${cycle}/${totalCycles} completed via local mode.`);
      }
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

document.querySelectorAll('[data-template]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = workflowTemplates[button.dataset.template];
    input.focus();
  });
});

document.getElementById('runWorkflowBtn').addEventListener('click', async () => {
  const text = input.value.trim() || workflowTemplates.mvp;
  appendMessage('user', text, 'You');
  input.value = '';
  await runWorkflow(text);
});

document.getElementById('healthBtn').addEventListener('click', checkHealth);

document.getElementById('allAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    document.getElementById(`agent-${agent.id}`).checked = true;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    document.getElementById(`agent-${agent.id}`).checked = false;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  messages.innerHTML = '';
  terminalOutput.textContent = '';
  memory.length = 0;
  appendMessage('assistant', 'Session cleared.');
});

document.getElementById('themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
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

renderAgents();
refreshTimeline();
terminalLog('Dashboard online. Deterministic runtime active.');
appendMessage('assistant', 'OpenBoBS is ready. Select a prebuilt task or enter a custom objective.');
