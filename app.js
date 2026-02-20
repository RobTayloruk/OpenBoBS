const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const status = document.getElementById('status');
const template = document.getElementById('messageTpl');
const projectNameInput = document.getElementById('projectName');
const profileInput = document.getElementById('profile');
const modelInput = document.getElementById('model');
const agentList = document.getElementById('agentList');
const activeAgentsBadge = document.getElementById('activeAgentsBadge');
const timelineList = document.getElementById('timelineList');
const focusList = document.getElementById('focusList');
const artifactList = document.getElementById('artifactList');

const memory = [];

const workflowTemplates = {
  mvp: 'Create an MVP sprint plan with architecture, prototype UX, integration tests, and launch checklist.',
  incident: 'Run incident response workflow: containment, impact analysis, remediation, and postmortem actions.',
  scaling: 'Prepare scale-readiness plan with bottleneck analysis, observability, and rollout controls.',
};

const agentCatalog = [
  {
    id: 'architect',
    name: 'System Architect',
    summary: 'Defines architecture, data flow, and boundaries.',
    defaultOn: true,
    prompt: 'Design system components, API boundaries, and delivery milestones.',
  },
  {
    id: 'frontend',
    name: 'Frontend Specialist',
    summary: 'Owns UX flows, interaction quality, and accessibility.',
    defaultOn: true,
    prompt: 'Propose component structure, states, and accessibility checks.',
  },
  {
    id: 'backend',
    name: 'Backend Engineer',
    summary: 'Builds services, persistence, and integration reliability.',
    defaultOn: true,
    prompt: 'Define service contracts, storage shape, and observability approach.',
  },
  {
    id: 'qa',
    name: 'QA Automation',
    summary: 'Builds deterministic test matrices and smoke coverage.',
    defaultOn: true,
    prompt: 'Create prioritized tests across unit, integration, and e2e.',
  },
  {
    id: 'security',
    name: 'Security Reviewer',
    summary: 'Evaluates auth, secrets, and attack-surface controls.',
    defaultOn: false,
    prompt: 'Report top threats, mitigations, and hardening checklist.',
  },
  {
    id: 'release',
    name: 'Release Manager',
    summary: 'Plans rollout stages, rollback strategy, and launch metrics.',
    defaultOn: false,
    prompt: 'Provide go-live gates, feature flag plan, and rollback criteria.',
  },
];

const cannedActions = {
  feature: 'Build an OpenClaw-style app with all core features and advanced agents. Include architecture, UX, tests, and release plan.',
  refactor: 'Refactor a monolithic assistant app into a multi-agent orchestrated platform with clear ownership and quality gates.',
  audit: 'Audit the product for security, reliability, accessibility, and deployment risk. Return actionable fixes.',
  release: 'Create a release-ready checklist with staging verification, monitoring signals, and rollback instructions.',
};

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function selectedAgents() {
  return agentCatalog.filter((agent) => {
    const checkbox = document.getElementById(`agent-${agent.id}`);
    return checkbox && checkbox.checked;
  });
}

function updateInsightPanels(activeAgents, requestText = 'No request yet') {
  const timelineSteps = [
    'Scope and acceptance criteria locked',
    'Architecture and interface contracts drafted',
    'Implementation and test slices executed',
    'Security and release gates approved',
  ];
  timelineList.innerHTML = '';
  timelineSteps.forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    timelineList.append(item);
  });

  focusList.innerHTML = '';
  const focusItems = [
    `Request: ${requestText.slice(0, 72)}${requestText.length > 72 ? '…' : ''}`,
    `Profile: ${profileInput.value}`,
    `Model: ${modelInput.value}`,
    `Agents: ${activeAgents.map((agent) => agent.name).join(', ') || 'none selected'}`,
  ];
  focusItems.forEach((line) => {
    const item = document.createElement('li');
    item.textContent = line;
    focusList.append(item);
  });

  artifactList.innerHTML = '';
  ['Architecture spec draft', 'Test strategy matrix', 'Release checklist', 'Risk register'].forEach((artifact) => {
    const item = document.createElement('li');
    item.textContent = artifact;
    artifactList.append(item);
  });
}

function updateActiveAgentBadge() {
  const active = selectedAgents();
  const activeCount = active.length;
  activeAgentsBadge.textContent = `${activeCount} agent${activeCount === 1 ? '' : 's'} active`;
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
    const checkbox = card.querySelector('input');
    checkbox.addEventListener('change', updateActiveAgentBadge);
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
  const profile = profileInput.value;
  if (profile === 'creative') return 'Favor novel implementation ideas with differentiated UX.';
  if (profile === 'strict') return 'Be concise, deterministic, and implementation-constrained.';
  return 'Balance ambition with practical, incremental delivery.';
}

function slashResponse(command) {
  const active = selectedAgents();
  if (command === '/summary') {
    return [
      'Conversation summary',
      `- Project: ${projectNameInput.value}`,
      `- Profile: ${profileInput.value}`,
      `- Model: ${modelInput.value}`,
      `- Messages: ${memory.length}`,
      `- Active agents: ${active.map((agent) => agent.name).join(', ') || 'none'}`,
    ].join('\n');
  }
  if (command === '/plan') {
    return [
      'Delivery plan',
      '1) Confirm target user journeys and feature scope',
      '2) Generate architecture and ownership map by agent',
      '3) Build vertical slices with tests at each slice',
      '4) Perform security + accessibility hardening',
      '5) Execute staged rollout with metrics and rollback',
    ].join('\n');
  }
  if (command === '/agents') {
    return ['Agent roster', ...agentCatalog.map((agent) => `- ${agent.name}: ${agent.summary}`)].join('\n');
  }
  if (command === '/risk') {
    return [
      'Risk matrix',
      '- Product risk: undefined requirements → mitigate with acceptance criteria per feature',
      '- Technical risk: tight coupling → mitigate with modular service contracts',
      '- Quality risk: missing regression tests → mitigate with CI smoke gate',
      '- Ops risk: unsafe rollout → mitigate with canary + rollback playbook',
    ].join('\n');
  }
  if (command === '/ship') {
    return [
      'Ship checklist',
      '- Freeze scope and lock release branch',
      '- Verify high-priority test matrix',
      '- Validate analytics, logs, and alerts',
      '- Publish changelog + runbook',
      '- Launch with feature flags and monitor KPIs',
    ].join('\n');
  }
  return null;
}

function buildAgentOutput(agent, requestText) {
  return [
    `${agent.name} output`,
    `Goal: ${agent.prompt}`,
    `Input: ${requestText}`,
    `Profile policy: ${profileBehavior()}`,
    `Project context: ${projectNameInput.value}`,
    'Actionable next step: draft implementation tasks and acceptance criteria for this area.',
  ].join('\n');
}

function orchestrateResponse(requestText) {
  const slash = slashResponse(requestText.trim());
  if (slash) {
    return [{ source: 'Command Center', text: slash }];
  }

  const active = selectedAgents();
  if (!active.length) {
    return [
      {
        source: 'Orchestrator',
        text: 'No agents are active. Enable at least one advanced agent to run a workflow.',
      },
    ];
  }

  const sections = active.map((agent) => ({
    source: agent.name,
    text: buildAgentOutput(agent, requestText),
  }));

  const synthesis = [
    'Orchestrator synthesis',
    `- Request: ${requestText}`,
    `- Model: ${modelInput.value}`,
    `- Active agents: ${active.map((agent) => agent.name).join(', ')}`,
    '- Unified plan:',
    '  1) Confirm architecture and interfaces',
    '  2) Implement one user-facing vertical slice',
    '  3) Add test automation and security checks',
    '  4) Prepare release controls and monitoring',
  ].join('\n');

  sections.push({ source: 'Orchestrator', text: synthesis });
  return sections;
}

function runWorkflow(text) {
  status.textContent = 'Running multi-agent workflow…';
  const outputs = orchestrateResponse(text);
  updateInsightPanels(selectedAgents(), text);
  outputs.forEach((item, index) => {
    setTimeout(() => {
      appendMessage('assistant', item.text, item.source);
      if (index === outputs.length - 1) {
        status.textContent = 'Ready • Local multi-agent simulation';
      }
    }, 260 * (index + 1));
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text, 'You');
  input.value = '';
  runWorkflow(text);
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = cannedActions[button.dataset.action];
    input.focus();
  });
});

document.querySelectorAll('[data-template]').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = workflowTemplates[button.dataset.template];
    input.focus();
  });
});

document.getElementById('runWorkflowBtn').addEventListener('click', () => {
  const text = input.value.trim() || 'Generate a complete build strategy for an OpenClaw-style advanced agent app.';
  if (!input.value.trim()) {
    appendMessage('user', text, 'You');
  }
  input.value = '';
  runWorkflow(text);
});

document.getElementById('allAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    const checkbox = document.getElementById(`agent-${agent.id}`);
    checkbox.checked = true;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearAgentsBtn').addEventListener('click', () => {
  agentCatalog.forEach((agent) => {
    const checkbox = document.getElementById(`agent-${agent.id}`);
    checkbox.checked = false;
  });
  updateActiveAgentBadge();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  messages.innerHTML = '';
  memory.length = 0;
  appendMessage('assistant', 'Chat cleared. Reconfigure agents and run a new workflow.', 'OpenBoBS');
});

document.getElementById('themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const exportPayload = {
    project: projectNameInput.value,
    profile: profileInput.value,
    model: modelInput.value,
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
appendMessage(
  'assistant',
  'Welcome to OpenBoBS. Enable agents and describe your goal to generate an OpenClaw-style execution plan.',
  'OpenBoBS'
);
