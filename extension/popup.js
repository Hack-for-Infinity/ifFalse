// ============================================================
// NEUROREAD — popup.js
// ============================================================
// Controls the extension popup panel.
// Bionic Reading toggle, Summarize, Auth (login/register).
// ============================================================

const API_BASE = 'https://neuroread.khaldosh.dev';

let bionicOn = false;
let focusOn = false;
let hasToken = false;

const bionicBtn = document.getElementById('bionicBtn');
const togglePill = document.getElementById('togglePill');
const focusBtn = document.getElementById('focusBtn');
const focusPill = document.getElementById('focusPill');
const summarizeBtn = document.getElementById('summarizeBtn');
const summarizeLabel = document.getElementById('summarizeLabel');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authStatus = document.getElementById('authStatus');
const authStatusRegister = document.getElementById('authStatusRegister');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const authLoggedOut = document.getElementById('authLoggedOut');
const authLoggedIn = document.getElementById('authLoggedIn');
const profileName = document.getElementById('profileName');
const loginTrigger = document.getElementById('loginTrigger');
const logoutBtn = document.getElementById('logoutBtn');
const loginFormWrap = document.getElementById('loginFormWrap');
const registerFormWrap = document.getElementById('registerFormWrap');
const liveRegion = document.getElementById('liveRegion');

// ── BACKGROUND TAB STATE (restore on reload) ──────────────────
async function updateBackgroundTabState() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.runtime.sendMessage({
      action: 'updateTabState',
      tabId: tab.id,
      state: { bionic: bionicOn, focus: focusOn }
    }).catch(() => {});
  }
}

// ── SCREEN READER ANNOUNCEMENTS (WCAG 4.1.3) ─────────────────
function announce(message) {
  if (liveRegion) {
    liveRegion.textContent = '';
    setTimeout(() => { liveRegion.textContent = message; }, 100);
  }
}

// ── HELPER: Send message to content script (never throws) ──────
async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { error: 'NO_TAB' };
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('chrome-extension://')) {
    return { error: 'RESTRICTED_PAGE' };
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (err) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await new Promise(r => setTimeout(r, 150));
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (injectErr) {
      if (injectErr.message?.includes('Cannot access') || injectErr.message?.includes('restricted')) {
        return { error: 'RESTRICTED_PAGE' };
      }
      return { error: 'RECEIVING_END', message: err.message };
    }
  }
}

// ── HELPER: Update button appearance ─────────────────────────
function updateButton(isOn) {
  if (!bionicBtn || !togglePill) return;
  if (isOn) {
    bionicBtn.classList.add('active');
    bionicBtn.setAttribute('aria-pressed', 'true');
    bionicBtn.setAttribute('aria-label', 'Disable Bionic Reading. Currently on.');
    const title = bionicBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Disable Bionic Reading';
    togglePill.textContent = 'ON';
    announce('Bionic Reading enabled');
  } else {
    bionicBtn.classList.remove('active');
    bionicBtn.setAttribute('aria-pressed', 'false');
    bionicBtn.setAttribute('aria-label', 'Enable Bionic Reading. Bold first half of words to aid focus. Currently off.');
    const title = bionicBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Enable Bionic Reading';
    togglePill.textContent = 'OFF';
    announce('Bionic Reading disabled');
  }
}

function updateFocusButton(isOn) {
  if (!focusBtn || !focusPill) return;
  if (isOn) {
    focusBtn.classList.add('active');
    focusBtn.setAttribute('aria-pressed', 'true');
    focusBtn.setAttribute('aria-label', 'Disable Focus Mode. Currently on.');
    const title = focusBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Disable Focus Mode';
    focusPill.textContent = 'ON';
    announce('Focus Mode enabled');
  } else {
    focusBtn.classList.remove('active');
    focusBtn.setAttribute('aria-pressed', 'false');
    focusBtn.setAttribute('aria-label', 'Enable Focus Mode. Clean reading view. Currently off.');
    const title = focusBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Focus Mode';
    focusPill.textContent = 'OFF';
    announce('Focus Mode disabled');
  }
}

// ── AUTH ─────────────────────────────────────────────────────
function setAuthStatus(msg, isError = false) {
  for (const el of [authStatus, authStatusRegister]) {
    if (el) {
      el.textContent = msg || '';
      el.style.color = isError ? '#c00' : '#40c057';
    }
  }
  if (msg) announce(msg);
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.[0]?.msg || 'Login failed');
  }
  const data = await res.json();
  await chrome.storage.local.set({ token: data.access_token, email });
  return data;
}

async function register(username, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.[0]?.msg || 'Registration failed');
  }
  const data = await res.json();
  return data;
}

function updateAuthUI() {
  if (authLoggedOut) authLoggedOut.classList.toggle('hidden', hasToken);
  if (authLoggedIn) authLoggedIn.classList.toggle('hidden', !hasToken);
  if (profileName && hasToken) {
    chrome.storage.local.get('email', ({ email }) => {
      profileName.textContent = email || 'Account';
    });
  }
  if (!hasToken) {
    loginFormWrap?.classList.add('hidden');
    registerFormWrap?.classList.add('hidden');
  }
}

function updateSummarizeUI() {
  if (summarizeBtn && summarizeLabel) {
    if (hasToken) {
      summarizeBtn.disabled = false;
      summarizeBtn.classList.add('active');
      summarizeBtn.setAttribute('aria-label', 'Summarize this page');
      summarizeLabel.textContent = 'Summarize this page';
    } else {
      summarizeBtn.disabled = true;
      summarizeBtn.classList.remove('active');
      summarizeBtn.setAttribute('aria-label', 'Summarize this page. Log in to enable.');
      summarizeLabel.textContent = 'Log in to summarize';
    }
  }
}

// ── SYNC UI ON POPUP OPEN ────────────────────────────────────
async function syncUIWithPage() {
  const { token } = await chrome.storage.local.get('token');
  hasToken = !!token;
  updateSummarizeUI();
  updateAuthUI();

  const res = await sendToTab({ action: 'getState' });
  bionicOn = res?.error ? false : (res?.active ?? false);
  updateButton(bionicOn);

  const focusRes = await sendToTab({ action: 'getFocusState' });
  focusOn = focusRes?.error ? false : (focusRes?.active ?? false);
  updateFocusButton(focusOn);
}

// ── BIONIC READING TOGGLE ────────────────────────────────────
bionicBtn?.addEventListener('click', async function() {
  if (!bionicBtn) return;
  bionicOn = !bionicOn;
  updateButton(bionicOn);
  const res = await sendToTab({ action: 'toggleBionic', on: bionicOn });
  if (res?.error) {
    bionicOn = !bionicOn;
    updateButton(bionicOn);
    console.warn('NeuroRead: Could not reach content script.', res.error);
  } else {
    updateBackgroundTabState();
  }
});

// ── FOCUS MODE TOGGLE ────────────────────────────────────────
focusBtn?.addEventListener('click', async function() {
  if (!focusBtn) return;
  focusOn = !focusOn;
  updateFocusButton(focusOn);
  const res = await sendToTab({ action: 'toggleFocus', on: focusOn });
  if (res?.error) {
    focusOn = !focusOn;
    updateFocusButton(focusOn);
    console.warn('NeuroRead: Could not reach content script.', res.error);
  } else {
    updateBackgroundTabState();
  }
});

// ── SUMMARIZE ────────────────────────────────────────────────
summarizeBtn?.addEventListener('click', async function() {
  if (!summarizeBtn || !hasToken || summarizeBtn.disabled) return;

  summarizeBtn.disabled = true;
  summarizeLabel.textContent = 'Summarizing...';
  announce('Summarizing page...');

  const pageRes = await sendToTab({ action: 'getPageContent' });
  if (pageRes?.error) {
    summarizeLabel.textContent = 'Summarize this page';
    summarizeBtn.disabled = false;
    if (pageRes.error === 'RESTRICTED_PAGE') {
      setAuthStatus('This page cannot be accessed (chrome://, PDF, etc.). Try a regular website.', true);
    } else if (pageRes.error === 'NO_TAB' || pageRes.error === 'RECEIVING_END') {
      setAuthStatus('Refresh the page, then try again. Or open a regular website (not chrome://).', true);
    } else {
      setAuthStatus('Could not get page content. Try refreshing.', true);
    }
    return;
  }

  try {
    const { url, content } = pageRes;
    const res = await chrome.runtime.sendMessage({
      action: 'summarize',
      payload: { url, content }
    });

    if (res?.success) {
      summarizeLabel.textContent = 'Summarize this page';
      announce('Summary ready. Opening summary page.');
      window.close();
    } else {
      throw new Error(res?.error || 'Summarization failed');
    }
  } catch (err) {
    summarizeLabel.textContent = 'Summarize this page';
    summarizeBtn.disabled = false;
    if (err.message === 'AUTH_REQUIRED' || err.message === 'SESSION_EXPIRED') {
      hasToken = false;
      updateSummarizeUI();
      updateAuthUI();
      setAuthStatus('Session expired. Please log in again.', true);
      loginFormWrap?.classList.remove('hidden');
    } else {
      setAuthStatus(err.message || 'Could not summarize.', true);
    }
  }
});

// ── AUTH FORMS ───────────────────────────────────────────────
loginTrigger?.addEventListener('click', () => {
  loginFormWrap?.classList.toggle('hidden');
  if (!registerFormWrap?.classList.contains('hidden')) registerFormWrap.classList.add('hidden');
  setAuthStatus('');
});

logoutBtn?.addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'email']);
  hasToken = false;
  updateSummarizeUI();
  updateAuthUI();
  announce('Logged out');
});

showRegister?.addEventListener('click', (e) => {
  e.preventDefault();
  loginFormWrap?.classList.add('hidden');
  registerFormWrap?.classList.remove('hidden');
  setAuthStatus('');
});

showLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  registerFormWrap?.classList.add('hidden');
  loginFormWrap?.classList.remove('hidden');
  setAuthStatus('');
});

loginBtn?.addEventListener('click', async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) {
    setAuthStatus('Enter email and password.', true);
    return;
  }
  loginBtn.disabled = true;
  setAuthStatus('Logging in...');
  try {
    await login(email, password);
    hasToken = true;
    updateSummarizeUI();
    updateAuthUI();
    loginFormWrap?.classList.add('hidden');
    setAuthStatus('Logged in!');
  } catch (err) {
    setAuthStatus(err.message || 'Login failed.', true);
  } finally {
    loginBtn.disabled = false;
  }
});

registerBtn?.addEventListener('click', async function() {
  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  if (!username || !email || !password) {
    setAuthStatus('Fill all fields.', true);
    return;
  }
  registerBtn.disabled = true;
  setAuthStatus('Registering...');
  try {
    await register(username, email, password);
    setAuthStatus('Registered! Now log in.');
    registerFormWrap?.classList.add('hidden');
    loginFormWrap?.classList.remove('hidden');
  } catch (err) {
    setAuthStatus(err.message || 'Registration failed.', true);
  } finally {
    registerBtn.disabled = false;
  }
});

// Run when popup opens (catch prevents "Uncaught (in promise)" in console)
syncUIWithPage().catch(() => {});
