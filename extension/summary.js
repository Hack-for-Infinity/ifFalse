// ============================================================
// NEUROREAD — summary.js
// ============================================================
// Loads summary from chrome.storage.session, renders markdown, applies Bionic.
// ============================================================

(async function() {
  const contentEl = document.getElementById('summaryContent');
  const urlEl = document.getElementById('originalUrl');

  const { lastSummary } = await chrome.storage.session.get('lastSummary');

  if (!lastSummary?.summary_text) {
    contentEl.innerHTML = '<div class="error">No summary found. Summarize a page from the extension.</div>';
    contentEl.classList.remove('loading');
    return;
  }

  urlEl.href = lastSummary.original_url || '#';
  urlEl.textContent = lastSummary.original_url || 'Original page';

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function parseMarkdown(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    const listItems = [];
    function flushList() {
      if (listItems.length) {
        out.push('<ul>' + listItems.join('') + '</ul>');
        listItems.length = 0;
      }
    }
    function inline(s) {
      return escapeHtml(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flushList(); out.push(''); continue; }
      const h = t.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushList();
        out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
        continue;
      }
      if (/^[-*+]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
        const content = t.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
        listItems.push('<li>' + inline(content) + '</li>');
        continue;
      }
      flushList();
      out.push('<p>' + inline(t) + '</p>');
    }
    flushList();
    return out.join('\n');
  }

  const html = parseMarkdown(lastSummary.summary_text);
  contentEl.innerHTML = html;
  contentEl.classList.remove('loading');

  // Apply Bionic Reading to the content
  if (typeof applyBionicToElement === 'function') {
    applyBionicToElement(contentEl);
  }
})();

// ── AUTH (summary page) ───────────────────────────────────────
(function() {
  const API_BASE = 'https://neuroread.khaldosh.dev';
  const profileEl = document.getElementById('summaryProfileName');
  const logoutBtn = document.getElementById('summaryLogoutBtn');
  const loginBtn = document.getElementById('summaryLoginBtn');
  const loginForm = document.getElementById('summaryLoginForm');
  const loginEmail = document.getElementById('summaryLoginEmail');
  const loginPassword = document.getElementById('summaryLoginPassword');
  const loginSubmit = document.getElementById('summaryLoginSubmit');
  const statusEl = document.getElementById('summaryLoginStatus');

  function setStatus(msg, isError) {
    if (statusEl) {
      statusEl.textContent = msg || '';
      statusEl.style.color = isError ? '#c00' : '#40c057';
    }
  }

  async function updateAuthUI() {
    const { token, email } = await chrome.storage.local.get(['token', 'email']);
    const loggedIn = !!token;
    if (profileEl) {
      profileEl.textContent = email || 'Account';
      profileEl.classList.toggle('hidden', !loggedIn);
    }
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);
    if (loginBtn) loginBtn.classList.toggle('hidden', loggedIn);
  }

  loginBtn?.addEventListener('click', () => {
    loginForm?.classList.toggle('hidden');
  });

  logoutBtn?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['token', 'email']);
    updateAuthUI();
    loginForm?.classList.add('hidden');
  });

  loginSubmit?.addEventListener('click', async () => {
    const email = loginEmail?.value?.trim();
    const password = loginPassword?.value;
    if (!email || !password) {
      setStatus('Enter email and password.', true);
      return;
    }
    loginSubmit.disabled = true;
    setStatus('Logging in...');
    try {
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
      setStatus('Logged in!');
      loginForm?.classList.add('hidden');
      updateAuthUI();
    } catch (err) {
      setStatus(err.message || 'Login failed', true);
    } finally {
      loginSubmit.disabled = false;
    }
  });

  updateAuthUI();
})();
