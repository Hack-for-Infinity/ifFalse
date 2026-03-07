// ============================================================
// NEUROREAD — popup.js
// ============================================================
// Controls the extension popup panel.
// Cannot directly access webpage content — uses Chrome messaging
// to send commands to content.js in the active tab.
//
// SUB-FEATURE 1 — Word Bold Anchoring
// One button toggles Bionic Reading on/off.
// ============================================================


// ── STATE ─────────────────────────────────────────────────────
let bionicOn = false;


// ── ELEMENT REFERENCES ───────────────────────────────────────
const bionicBtn  = document.getElementById('bionicBtn');
const togglePill = document.getElementById('togglePill');


// ── HELPER: Send message to content script in active tab ──────
// If content script isn't loaded (e.g. page opened before extension install),
// inject it first, then send.
async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) throw new Error('No active tab');

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (err) {
    // Content script not injected — inject it, then retry
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}


// ── HELPER: Update button appearance ───────────────────────────
function updateButton(isOn) {
  if (!bionicBtn || !togglePill) return;
  if (isOn) {
    bionicBtn.classList.add('active');
    bionicBtn.setAttribute('aria-pressed', 'true');
    const title = bionicBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Disable Bionic Reading';
    togglePill.textContent = 'ON';
  } else {
    bionicBtn.classList.remove('active');
    bionicBtn.setAttribute('aria-pressed', 'false');
    const title = bionicBtn.querySelector('.toggle-title');
    if (title) title.textContent = 'Enable Bionic Reading';
    togglePill.textContent = 'OFF';
  }
}


// ── SYNC UI ON POPUP OPEN ─────────────────────────────────────
// Popup is recreated each time it opens — fetch actual state from content script
async function syncUIWithPage() {
  try {
    const res = await sendToTab({ action: 'getState' });
    bionicOn = res?.active ?? false;
  } catch {
    bionicOn = false;
  }
  updateButton(bionicOn);
}

// Run when popup opens
syncUIWithPage();


// ── BIONIC READING TOGGLE ─────────────────────────────────────
bionicBtn.addEventListener('click', async function() {
  if (!bionicBtn) return;

  bionicOn = !bionicOn;

  // Update UI immediately (feels instant)
  updateButton(bionicOn);

  try {
    await sendToTab({
      action: 'toggleBionic',
      on: bionicOn
    });
  } catch (err) {
    // Fails on chrome://, edge://, extensions page — reset UI
    bionicOn = !bionicOn;
    updateButton(bionicOn);
    console.warn('NeuroRead: Could not reach content script.', err);
  }
});
