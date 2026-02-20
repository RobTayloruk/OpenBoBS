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
