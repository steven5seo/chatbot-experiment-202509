const SETTINGS_STORAGE_KEY = 'llm-chatbot-settings';
const API_KEY_STORAGE_KEY = 'llm-chatbot-api-key';
const THEME_STORAGE_KEY = 'llm-chatbot-theme';

const DEFAULT_SETTINGS = {
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.7,
};

const state = {
  messages: [],
  loadingMessageEl: null,
  settings: { ...DEFAULT_SETTINGS },
  apiKey: '',
};

const dom = {
  body: document.body,
  themeToggle: document.querySelector('#themeToggle'),
  messages: document.querySelector('#messages'),
  chatForm: document.querySelector('#chatForm'),
  chatInput: document.querySelector('#userMessage'),
  sendButton: document.querySelector('#sendButton'),
  settingsForm: document.querySelector('#settingsForm'),
  apiKeyInput: document.querySelector('#apiKey'),
  rememberKeyCheckbox: document.querySelector('#rememberKey'),
  apiBaseInput: document.querySelector('#apiBase'),
  modelInput: document.querySelector('#model'),
  temperatureInput: document.querySelector('#temperature'),
  resetSettingsButton: document.querySelector('#resetSettings'),
  messageTemplate: document.querySelector('#messageTemplate'),
  loadingTemplate: document.querySelector('#loadingTemplate'),
};

init();

function init() {
  restoreTheme();
  restoreSettings();
  attachEventListeners();
  autoResizeTextarea(dom.chatInput);
  dom.chatInput.focus();
}

function attachEventListeners() {
  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.chatForm.addEventListener('submit', handleSendMessage);
  dom.chatInput.addEventListener('input', () => autoResizeTextarea(dom.chatInput));
  dom.settingsForm.addEventListener('submit', handleSettingsSubmit);
  dom.resetSettingsButton.addEventListener('click', resetSettings);
}

function restoreTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = storedTheme || (prefersDark ? 'dark' : 'light');
  setTheme(theme);
}

function toggleTheme() {
  const nextTheme = dom.body.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

function setTheme(theme) {
  dom.body.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function restoreSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY));
    if (savedSettings) {
      state.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    }
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      state.apiKey = atob(savedKey);
      dom.apiKeyInput.value = state.apiKey;
      dom.rememberKeyCheckbox.checked = true;
    }
  } catch (error) {
    console.warn('Unable to restore saved settings', error);
  }

  dom.apiBaseInput.value = state.settings.apiBase;
  dom.modelInput.value = state.settings.model;
  dom.temperatureInput.value = state.settings.temperature;
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  state.settings = {
    apiBase: (formData.get('apiBase') || DEFAULT_SETTINGS.apiBase).trim() || DEFAULT_SETTINGS.apiBase,
    model: (formData.get('model') || DEFAULT_SETTINGS.model).trim() || DEFAULT_SETTINGS.model,
    temperature: clamp(parseFloat(formData.get('temperature')), 0, 2, DEFAULT_SETTINGS.temperature),
  };

  state.apiKey = dom.apiKeyInput.value.trim();

  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));

  if (dom.rememberKeyCheckbox.checked && state.apiKey) {
    localStorage.setItem(API_KEY_STORAGE_KEY, btoa(state.apiKey));
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }

  flashMessage('Settings saved');
}

function resetSettings() {
  state.settings = { ...DEFAULT_SETTINGS };
  state.apiKey = '';

  dom.apiBaseInput.value = DEFAULT_SETTINGS.apiBase;
  dom.modelInput.value = DEFAULT_SETTINGS.model;
  dom.temperatureInput.value = DEFAULT_SETTINGS.temperature;
  dom.apiKeyInput.value = '';
  dom.rememberKeyCheckbox.checked = false;

  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem(API_KEY_STORAGE_KEY);

  flashMessage('Settings reset');
}

async function handleSendMessage(event) {
  event.preventDefault();
  const messageText = dom.chatInput.value.trim();
  if (!messageText) return;

  if (!state.apiKey && !dom.apiKeyInput.value.trim()) {
    flashMessage('Please provide your API key in the settings panel.');
    return;
  }

  state.apiKey = dom.apiKeyInput.value.trim() || state.apiKey;

  const userMessage = { role: 'user', content: messageText };
  state.messages.push(userMessage);
  appendMessage(userMessage);
  dom.chatInput.value = '';
  autoResizeTextarea(dom.chatInput);
  dom.chatInput.focus();

  setLoading(true);
  toggleComposerDisabled(true);

  try {
    const assistantMessage = await fetchAssistantReply();
    state.messages.push(assistantMessage);
    appendMessage(assistantMessage);
  } catch (error) {
    console.error(error);
    appendMessage({
      role: 'assistant',
      content: formatErrorMessage(error),
      isError: true,
    });
  } finally {
    setLoading(false);
    toggleComposerDisabled(false);
  }
}

function appendMessage(message) {
  const element = dom.messageTemplate.content.firstElementChild.cloneNode(true);
  element.classList.add(`message--${message.role}`);
  if (message.isError) {
    element.classList.add('message--error');
  }
  element.querySelector('.message__role').textContent =
    message.role.charAt(0).toUpperCase() + message.role.slice(1);
  element.querySelector('.message__text').textContent = message.content;
  dom.messages.appendChild(element);
  element.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setLoading(isLoading) {
  if (isLoading) {
    if (!state.loadingMessageEl) {
      const loadingEl = dom.loadingTemplate.content.firstElementChild.cloneNode(true);
      dom.messages.appendChild(loadingEl);
      loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      state.loadingMessageEl = loadingEl;
    }
  } else if (state.loadingMessageEl) {
    state.loadingMessageEl.remove();
    state.loadingMessageEl = null;
  }
}

async function fetchAssistantReply() {
  const payload = {
    model: state.settings.model,
    messages: state.messages,
    temperature: state.settings.temperature,
  };

  const url = buildChatUrl(state.settings.apiBase);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await safeJson(response);
    const errorMessage = errorBody?.error?.message || response.statusText || 'Unknown error';
    throw new Error(`Request failed (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error('The API response did not include any message content.');
  }

  return { role: 'assistant', content: message };
}

function buildChatUrl(apiBase) {
  const trimmed = (apiBase || DEFAULT_SETTINGS.apiBase).replace(/\/$/, '');
  return trimmed.endsWith('/chat/completions')
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function safeJson(response) {
  return response
    .clone()
    .json()
    .catch(() => null);
}

function toggleComposerDisabled(disabled) {
  dom.chatInput.disabled = disabled;
  dom.sendButton.disabled = disabled;
}

function flashMessage(text) {
  const notification = document.createElement('div');
  notification.className = 'toast';
  notification.textContent = text;
  document.body.appendChild(notification);
  requestAnimationFrame(() => notification.classList.add('toast--visible'));
  setTimeout(() => {
    notification.classList.remove('toast--visible');
    notification.addEventListener('transitionend', () => notification.remove(), {
      once: true,
    });
  }, 2200);
}

function formatErrorMessage(error) {
  return `⚠️ Oops! Something went wrong.\n${error.message}`;
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function clamp(value, min, max, fallback) {
  if (Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}
