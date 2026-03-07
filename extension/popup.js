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
const dotBionic  = document.getElementById('dot-bionic');


// ── HELPER: Send message to content script in active tab ──────
async function sendToTab(message) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return chrome.tabs.sendMessage(tab.id, message);
}


// ── HELPER: Update status dot ──────────────────────────────────
function updateDot(isOn) {
  if (dotBionic) {
    dotBionic.classList.toggle('on', isOn);
  }
}


// ── HELPER: Update button appearance ───────────────────────────
function updateButton(isOn) {
  if (isOn) {
    bionicBtn.classList.add('active');
    bionicBtn.setAttribute('aria-pressed', 'true');
    bionicBtn.querySelector('.toggle-title').textContent = 'Disable Bionic Reading';
    togglePill.textContent = 'ON';
  } else {
    bionicBtn.classList.remove('active');
    bionicBtn.setAttribute('aria-pressed', 'false');
    bionicBtn.querySelector('.toggle-title').textContent = 'Enable Bionic Reading';
    togglePill.textContent = 'OFF';
  }
}


// ── BIONIC READING TOGGLE ─────────────────────────────────────
bionicBtn.addEventListener('click', async function() {
  bionicOn = !bionicOn;

  // Update UI immediately (feels instant)
  updateButton(bionicOn);
  updateDot(bionicOn);

  try {
    await sendToTab({
      action: 'toggleBionic',
      on: bionicOn
    });
  } catch (err) {
    // Messaging fails on chrome://, edge://, etc. — reset UI
    bionicOn = !bionicOn;
    updateButton(bionicOn);
    updateDot(bionicOn);
    console.warn('NeuroRead: Could not reach content script.', err);
  }
});
