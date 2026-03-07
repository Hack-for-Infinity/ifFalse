// ============================================================
// NEUROREAD — background.js
// ============================================================
// Service worker for API calls, token storage, and tab state.
// Handles summarize requests and tab state for restore-on-reload.
// ============================================================

const API_BASE = 'https://neuroread.khaldosh.dev';
const tabState = new Map(); // tabId -> { bionic, focus }

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const state = tabState.get(tabId);
    if (state) {
      chrome.tabs.sendMessage(tabId, { action: 'restoreState', state }).catch(() => {});
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'summarize') {
    handleSummarize(message.payload).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  if (message.action === 'updateTabState') {
    const tabId = sender.tab ? sender.tab.id : message.tabId;
    if (tabId) tabState.set(tabId, message.state);
    sendResponse({ success: true });
  }
  if (message.action === 'getTabState') {
    const tabId = message.tabId || sender.tab?.id;
    const state = tabId ? tabState.get(tabId) || { bionic: false, focus: false } : { bionic: false, focus: false };
    sendResponse({ state });
  }
  return true;
});

async function handleSummarize({ url, content }) {
  const { token } = await chrome.storage.local.get('token');
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const res = await fetch(`${API_BASE}/summarize/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      url: url || null,
      content: content || '',
      preferred_length: 'medium'
    })
  });

  if (res.status === 401) {
    await chrome.storage.local.remove('token');
    throw new Error('SESSION_EXPIRED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const detail = errData.detail?.[0]?.msg || res.statusText;
    throw new Error(detail);
  }

  const data = await res.json();
  await chrome.storage.session.set({
    lastSummary: {
      summary_text: data.summary_text,
      original_url: data.original_url,
      summary_length: data.summary_length
    }
  });

  chrome.tabs.create({ url: chrome.runtime.getURL('summary.html') });
  return { success: true };
}
