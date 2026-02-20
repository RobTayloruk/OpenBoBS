const messages = document.getElementById('messages');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const status = document.getElementById('status');
const template = document.getElementById('messageTpl');

const memory = [];

const cannedActions = {
  prompt: 'Create a high-level product brief for a coding assistant web app with MVP scope and launch checklist.',
  refactor: 'Suggest a safe refactor strategy for a complex module with minimal regressions.',
  bug: 'List likely bug hotspots in a typical Node/React full-stack app and how to detect them quickly.',
  tests: 'Generate a pragmatic testing plan across unit, integration, and end-to-end tests.',
};

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, text) {
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector('.message');
  article.classList.add(role);
  fragment.querySelector('.meta').textContent = `${role === 'user' ? 'You' : 'OpenBoBS'} • ${now()}`;
  fragment.querySelector('.content').textContent = text;
  messages.append(fragment);
  messages.scrollTop = messages.scrollHeight;
  memory.push({ role, text, timestamp: Date.now() });
}

function profileBehavior() {
  const profile = document.getElementById('profile').value;
  if (profile === 'creative') return 'Provide imaginative alternatives and UX polish ideas.';
  if (profile === 'strict') return 'Be concise, explicit, and include implementation constraints.';
  return 'Balance product ideas with practical delivery steps.';
}

function handleSlashCommand(text) {
  if (text === '/summary') {
    return `Conversation summary:\n- Messages: ${memory.length}\n- Project: ${document.getElementById('projectName').value}\n- Focus: ${profileBehavior()}`;
  }
  if (text === '/plan') {
    return 'Suggested plan:\n1) Define MVP and UX goals\n2) Build chat + command features\n3) Add exports and settings\n4) Validate with quick tests\n5) Ship docs + deployment.';
  }
  if (text === '/ship') {
    return 'Ship checklist:\n- Run smoke tests\n- Check mobile layout\n- Verify export flow\n- Publish release notes\n- Push tagged build.';
  }
  return null;
}

function generateResponse(text) {
  const slash = handleSlashCommand(text.trim());
  if (slash) return slash;

  return [
    `You asked: "${text}"`,
    `Project: ${document.getElementById('projectName').value}`,
    `Mode: ${document.getElementById('profile').value}`,
    profileBehavior(),
    'Feature ideas to surpass ClawDBot:',
    '- Multi-profile responses (strict/creative/balanced)',
    '- Command shortcuts (/summary, /plan, /ship)',
    '- One-click export + theme toggle + quick action prompts',
  ].join('\n');
}

function simulateReply(text) {
  status.textContent = 'Thinking…';
  setTimeout(() => {
    appendMessage('assistant', generateResponse(text));
    status.textContent = 'Ready • Local demo mode';
  }, 500);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  appendMessage('user', text);
  input.value = '';
  simulateReply(text);
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const prompt = cannedActions[button.dataset.action];
    input.value = prompt;
    input.focus();
  });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  messages.innerHTML = '';
  memory.length = 0;
  appendMessage('assistant', 'Chat cleared. Ready for a new build cycle.');
});

document.getElementById('themeBtn').addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(memory, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'openbobs-conversation.json';
  anchor.click();
  URL.revokeObjectURL(url);
});

appendMessage('assistant', 'Welcome to OpenBoBS. Describe what you want to build, debug, or ship.');
