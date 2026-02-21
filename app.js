const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const status = document.getElementById('status');
const template = document.getElementById('messageTpl');
const projectNameInput = document.getElementById('projectName');
const profileInput = document.getElementById('profile');
const ollamaModeInput = document.getElementById('ollamaMode');
const ollamaModelInput = document.getElementById('ollamaModel');
const agentList = document.getElementById('agentList');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const progressList = document.getElementById('progressList');
const terminalOutput = document.getElementById('terminalOutput');

const SELF_STATE_KEY = 'openbobs-self-update-state';
const memory = [];

const workflowTemplates = {
  mvp: 'Create an MVP sprint plan with architecture, polished UI, tests, and deployment checklist.',
  incident: 'Run incident response workflow: containment, blast-radius, remediation, and postmortem.',
  scaling: 'Prepare scaling readiness tasks with bottleneck fixes, observability, and staged rollout.',
  security: 'Perform security hardening with threat model, auth checks, secrets hygiene, and audit logs.',
};

const agentCatalog = [
  { id: 'architect', name: 'System Architect', defaultOn: true, prompt: 'Design modular boundaries and data contracts.' },
  { id: 'frontend', name: 'Frontend Specialist', defaultOn: true, prompt: 'Improve usability, visual clarity, and accessibility.' },
  { id: 'backend', name: 'Backend Engineer', defaultOn: true, prompt: 'Deliver API reliability and robust runtime behavior.' },
  { id: 'qa', name: 'QA Automation', defaultOn: true, prompt: 'Define deterministic quality checks and regression safety.' },
  { id: 'release', name: 'Release Manager', defaultOn: true, prompt: 'Create release plan with rollback and observability.' },
  { id: 'selfupdate', name: 'Self-Updating Agent', defaultOn: true, prompt: 'Learn recurring needs and improve future prompts.' },
];

function loadSelfState() {
  try {
    const saved = localStorage.getItem(SELF_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_) {
    // Demo mode fallback.
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

function profileBehavior() {
  return {
    balanced: 'Balance speed with quality gates and practical scope.',
    creative: 'Prefer ambitious UX and alternative implementation options.',
    strict: 'Prioritize deterministic tests, risk controls, and release discipline.',
  }[profileInput.value];
}

function updateSelfLearning(requestText) {
  selfUpdateState.runs += 1;
  requestText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 12)
    .forEach((topic) => {
      selfUpdateState.learnedTopics[topic] = (selfUpdateState.learnedTopics[topic] || 0) + 1;
    });

  if (selfUpdateState.runs % 3 === 0) {
    selfUpdateState.version += 1;
  }
  saveSelfState();
}

function selfUpdateSummary() {
  const topTopics = Object.entries(selfUpdateState.learnedTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic, count]) => `${topic}(${count})`)
    .join(', ');

  return `v${selfUpdateState.version} • runs:${selfUpdateState.runs} • learned:${topTopics || 'none yet'}`;
}

function refreshTimeline() {
  timelineList.innerHTML = '';
  ['Scope accepted', 'Agent planning', 'Build + verify', 'Release approval'].forEach((step) => {
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
    if (!active.length) {
      resolve();
      return;
    }

    let finished = 0;
    active.forEach((agent, index) => {
      let value = 0;
      const timer = setInterval(() => {
        value = Math.min(100, value + 8 + Math.floor(Math.random() * 11));
        const bar = document.getElementById(`bar-${agent.id}`);
        const pct = document.getElementById(`pct-${agent.id}`);
        if (bar) bar.style.width = `${value}%`;
        if (pct) pct.textContent = `${value}%`;

        if (value >= 100) {
          clearInterval(timer);
          terminalLog(`${agent.name} completed stage ${index + 1}/${active.length}.`);
          finished += 1;
          if (finished === active.length) {
            resolve();
          }
        }
      }, 140 + index * 20);
    });
  });
}

function slashResponse(text) {
  const command = text.toLowerCase();
  if (command === '/selfupdate') {
    return `Self-updating agent\n${selfUpdateSummary()}`;
  }
  if (command === '/plan') {
    return 'Plan\n1) Scope\n2) Design\n3) Build\n4) Validate\n5) Release';
  }
  if (command === '/agents') {
    return ['Agents', ...agentCatalog.map((agent) => `- ${agent.name}`)].join('\n');
  }
  if (command === '/risk') {
    return 'Risk controls\n- Scope drift\n- Test gaps\n- Integration failures\n- Rollout regressions';
  }
  if (command === '/ship') {
    return 'Ship checklist\n- Freeze scope\n- Green tests\n- Monitoring checks\n- Staged rollout';
  }
  if (command === '/summary') {
    return `Workspace summary\nProject: ${projectNameInput.value}\nProfile: ${profileInput.value}\n${selfUpdateSummary()}`;
  }
  return null;
}

async function askOllama(requestText, active) {
  const prompt = [
    `Project: ${projectNameInput.value}`,
    `Profile: ${profileInput.value}`,
    `Policy: ${profileBehavior()}`,
    `Agents: ${active.map((agent) => agent.name).join(', ')}`,
    `Self updater: ${selfUpdateSummary()}`,
    'Respond with concise sections per agent and final orchestrator summary.',
    `Task: ${requestText}`,
  ].join('\n');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModelInput.value,
      messages: [
        { role: 'system', content: 'You are the OpenClaw OpenBoBS orchestrator. Keep output clean and practical.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || 'Ollama unavailable');
  }
  return data.reply;
}

function localFallback(requestText, active) {
  return [
    ...active.map((agent) => `${agent.name}\n- Goal: ${agent.prompt}\n- Task: ${requestText}\n- Profile: ${profileBehavior()}`),
    `Orchestrator\nDeliverables ready with professional GUI, real-time status, and deployment support.`,
  ].join('\n\n');
}

async function checkOllamaHealth() {
  status.textContent = 'Checking Ollama health...';
  terminalLog('Health check requested.');
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    if (payload.ok) {
      appendMessage('assistant', `Ollama is online. Models: ${payload.models.join(', ') || 'none detected'}`, 'Runtime');
      status.textContent = 'Ollama online';
      terminalLog('Ollama health check succeeded.');
    } else {
      appendMessage('assistant', `Ollama health warning: ${payload.error}`, 'Runtime');
      status.textContent = 'Ollama unavailable';
      terminalLog(`Ollama health warning: ${payload.error}`);
    }
  } catch (error) {
    appendMessage('assistant', `Health check failed: ${error.message}`, 'Runtime');
    status.textContent = 'Health check failed';
    terminalLog(`Health check failed: ${error.message}`);
  }
}

async function runWorkflow(text) {
  const active = selectedAgents();
  status.textContent = 'Workflow running...';
  terminalLog(`Workflow started for: ${text}`);

  const slash = slashResponse(text.trim());
  if (slash) {
    appendMessage('assistant', slash, 'Command Center');
    status.textContent = 'Ready • command completed';
    terminalLog('Command center response completed.');
    return;
  }

  if (!active.length) {
    appendMessage('assistant', 'No agents selected. Enable at least one agent.', 'Orchestrator');
    status.textContent = 'Ready • no agents selected';
    terminalLog('Workflow aborted: no active agents.');
    return;
  }

  updateSelfLearning(text);
  refreshTimeline();
  renderProgress(active);
  await progressRunner(active);

  let reply;
  if (ollamaModeInput.checked) {
    try {
      terminalLog(`Calling Ollama model: ${ollamaModelInput.value}`);
      reply = await askOllama(text, active);
      terminalLog('Ollama response received.');
    } catch (error) {
      terminalLog(`Ollama failed: ${error.message}`);
      reply = localFallback(text, active);
    }
  } else {
    reply = localFallback(text, active);
    terminalLog('Using local simulation mode.');
  }

  appendMessage('assistant', reply, 'OpenClaw Orchestrator');
  status.textContent = `Ready • ${selfUpdateSummary()}`;
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

document.getElementById('healthBtn').addEventListener('click', checkOllamaHealth);

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
  memory.length = 0;
  terminalOutput.textContent = '';
  appendMessage('assistant', 'Workspace cleared and ready.');
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
    selfUpdateState,
    activeAgents: selectedAgents().map((agent) => agent.id),
    memory,
    terminal: terminalOutput.textContent,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'openbobs-session.json';
  anchor.click();
  URL.revokeObjectURL(url);
});

renderAgents();
refreshTimeline();
terminalLog('Dashboard ready.');
appendMessage('assistant', 'OpenBoBS dashboard is live. Choose a pre-done task or type a custom request.');
