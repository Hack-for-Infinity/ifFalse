// ============================================================
// NEUROREAD — content.js
// Injected into every webpage automatically.
// Contains all 7 Bionic Reading transformation engines.
// Waits silently until popup.js sends a command.
// ============================================================


// ── GLOBAL STATE ─────────────────────────────────────────────
// Tracks whether bionic reading is currently active
let bionicActive = false;

// Stores original DOM nodes so we can perfectly reverse changes
let bionicSpans    = [];  // for word bold anchoring
let syllableSpans  = [];  // for syllable markers
let lineHighlightEl  = null;  // the line highlight bar element
let progressBarEl    = null;  // the progress bar element
let fontStyleEl      = null;  // the injected font style tag
let spacingStyleEl   = null;  // the injected spacing style tag
let paraStyleEl      = null;  // the injected paragraph style tag
let mouseMoveHandler = null;  // stored so we can remove it
let scrollHandler    = null;  // stored so we can remove it


// ============================================================
// SUB-FEATURE 1 — WORD BOLD ANCHORING
// Problem solved: Eye loses place. Words blur. No anchor.
// How: TreeWalker finds every text node → bold first 45%
// ============================================================

function applyWordBolding() {

  // TreeWalker scans the entire DOM for text nodes only
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {

        // Get the parent element's tag name
        const tag = node.parentElement
          ? node.parentElement.tagName.toUpperCase()
          : '';

        // Skip non-readable elements entirely
        const skipTags = [
          'SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT',
          'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE',
          'KBD', 'VAR', 'SAMP', 'MATH', 'SVG'
        ];

        if (skipTags.includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip if already processed by us
        if (node.parentElement &&
            node.parentElement.getAttribute('data-neuroread') === 'true') {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip pure whitespace nodes
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_SKIP;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // Collect ALL valid text nodes before modifying DOM
  // (modifying DOM while walking breaks the walker)
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  // Transform each text node
  textNodes.forEach(function(node) {

    // Split text into words (preserve spaces)
    const words = node.textContent.split(' ');

    // Build HTML with bolded first 45% of each word
    const transformedHTML = words.map(function(word) {

      // Skip empty strings from double spaces
      if (!word || word.trim() === '') return word;

      // Calculate bold length — minimum 1 character
      const boldLength = Math.max(1, Math.ceil(word.length * 0.45));

      const boldPart   = word.slice(0, boldLength);
      const normalPart = word.slice(boldLength);

      // Return bolded word
      return '<b style="font-weight:700">'
        + boldPart + '</b>' + normalPart;

    }).join(' ');

    // Create replacement span
    const span = document.createElement('span');
    span.innerHTML = transformedHTML;
    span.setAttribute('data-neuroread', 'true');

    // Replace original text node with our span
    if (node.parentNode) {
      node.parentNode.replaceChild(span, node);
    }

    // Store for reversal — keep original node reference
    bionicSpans.push({
      span: span,
      original: node
    });
  });
}


function removeWordBolding() {
  // Replace every span back with its original text node
  bionicSpans.forEach(function(item) {
    if (item.span && item.span.parentNode) {
      item.span.parentNode.replaceChild(item.original, item.span);
    }
  });
  // Clear the storage array
  bionicSpans = [];
}


// ============================================================
// SUB-FEATURE 2 — LINE HIGHLIGHTER
// Problem solved: Eye loses place between lines.
// How: Fixed bar follows mouse Y position, snaps to line grid
// ============================================================

function applyLineHighlighter() {

  // Create the highlight bar element
  const bar = document.createElement('div');
  bar.id = 'neuro-line-highlight';

  // Style it as a full-width translucent bar
  bar.style.cssText = `
    position: fixed !important;
    left: 0 !important;
    width: 100% !important;
    height: 28px !important;
    background: rgba(255, 213, 0, 0.2) !important;
    border-top: 1px solid rgba(255, 193, 7, 0.3) !important;
    border-bottom: 1px solid rgba(255, 193, 7, 0.3) !important;
    pointer-events: none !important;
    z-index: 999998 !important;
    transition: top 0.05s ease !important;
    top: 0px !important;
  `;

  document.body.appendChild(bar);
  lineHighlightEl = bar;

  // Mouse move handler — snap to 28px grid to avoid jitter
  mouseMoveHandler = function(e) {
    const snappedTop = Math.floor(e.clientY / 28) * 28;
    bar.style.top = snappedTop + 'px';
  };

  // Listen for mouse movement on the entire document
  document.addEventListener('mousemove', mouseMoveHandler);
}


function removeLineHighlighter() {
  // Remove the bar from DOM
  if (lineHighlightEl && lineHighlightEl.parentNode) {
    lineHighlightEl.parentNode.removeChild(lineHighlightEl);
  }
  lineHighlightEl = null;

  // Remove the event listener
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }
}


// ============================================================
// SUB-FEATURE 3 — OPENDYSLEXIC FONT
// Problem solved: Letters b/d/p/q flip and look identical.
// How: Inject style tag that loads and applies OpenDyslexic
// ============================================================

function applyOpenDyslexicFont() {

  // Create a style element that loads OpenDyslexic font
  // and applies it to every element on the page
  const style = document.createElement('style');
  style.id = 'neuro-font-style';
  style.textContent = `
    @import url('https://fonts.cdnfonts.com/css/opendyslexic');

    body.neuro-font-active,
    body.neuro-font-active *:not(code):not(pre):not(.neuro-line-highlight) {
      font-family: 'OpenDyslexic', Arial, sans-serif !important;
    }
  `;

  document.head.appendChild(style);
  fontStyleEl = style;

  // Add class to body to activate the font
  document.body.classList.add('neuro-font-active');
}


function removeOpenDyslexicFont() {
  // Remove the style tag
  if (fontStyleEl && fontStyleEl.parentNode) {
    fontStyleEl.parentNode.removeChild(fontStyleEl);
  }
  fontStyleEl = null;

  // Remove the activating class
  document.body.classList.remove('neuro-font-active');
}


// ============================================================
// SUB-FEATURE 4 — READING PROGRESS BAR
// Problem solved: Content feels infinite. No sense of progress.
// How: Fixed bar at top fills as user scrolls through page
// ============================================================

function applyProgressBar() {

  // Create the progress bar element
  const bar = document.createElement('div');
  bar.id = 'neuro-progress-bar';

  // Style it as a thin bar fixed at very top of viewport
  bar.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 0% !important;
    height: 4px !important;
    background: linear-gradient(
      90deg, #3b5bdb, #7048e8
    ) !important;
    z-index: 999999 !important;
    transition: width 0.1s ease !important;
    border-radius: 0 2px 2px 0 !important;
  `;

  document.body.appendChild(bar);
  progressBarEl = bar;

  // Scroll handler — calculates scroll percentage
  scrollHandler = function() {
    const scrolled = window.scrollY;
    const totalHeight = document.body.scrollHeight - window.innerHeight;

    // Prevent division by zero on short pages
    if (totalHeight <= 0) {
      bar.style.width = '100%';
      return;
    }

    const percent = (scrolled / totalHeight) * 100;
    bar.style.width = Math.min(percent, 100) + '%';
  };

  // Listen for scroll events
  window.addEventListener('scroll', scrollHandler);

  // Set initial position
  scrollHandler();
}


function removeProgressBar() {
  // Remove bar from DOM
  if (progressBarEl && progressBarEl.parentNode) {
    progressBarEl.parentNode.removeChild(progressBarEl);
  }
  progressBarEl = null;

  // Remove scroll listener
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
}


// ============================================================
// SUB-FEATURE 5 — LETTER AND WORD SPACING
// Problem solved: Letters crowd together. Words blur.
// How: Inject style that increases letter and word spacing
// ============================================================

function applyLetterSpacing() {

  const style = document.createElement('style');
  style.id = 'neuro-spacing-style';
  style.textContent = `
    body.neuro-spacing-active p,
    body.neuro-spacing-active li,
    body.neuro-spacing-active td,
    body.neuro-spacing-active span,
    body.neuro-spacing-active div,
    body.neuro-spacing-active h1,
    body.neuro-spacing-active h2,
    body.neuro-spacing-active h3 {
      letter-spacing: 0.05em !important;
      word-spacing: 0.1em !important;
      line-height: 1.8 !important;
    }
  `;

  document.head.appendChild(style);
  spacingStyleEl = style;

  document.body.classList.add('neuro-spacing-active');
}


function removeLetterSpacing() {
  if (spacingStyleEl && spacingStyleEl.parentNode) {
    spacingStyleEl.parentNode.removeChild(spacingStyleEl);
  }
  spacingStyleEl = null;
  document.body.classList.remove('neuro-spacing-active');
}


// ============================================================
// SUB-FEATURE 6 — SYLLABLE BOUNDARY MARKERS
// Problem solved: Long words cause full stop mid-reading.
// How: Words over 8 chars get middle dots between syllables
// ============================================================

// Simple syllable splitter based on vowel-consonant patterns
function splitIntoSyllables(word) {
  // Remove punctuation for processing, keep for display
  const clean = word.replace(/[^a-zA-Z]/g, '');
  if (clean.length <= 8) return null; // only process long words

  const vowels = 'aeiouAEIOU';
  const parts  = [];
  let   current = '';

  for (let i = 0; i < clean.length; i++) {
    current += clean[i];

    // Split after vowel followed by consonant followed by vowel
    if (
      i < clean.length - 2 &&
      vowels.includes(clean[i]) &&
      !vowels.includes(clean[i + 1]) &&
      vowels.includes(clean[i + 2])
    ) {
      parts.push(current);
      current = '';
    }
  }

  if (current) parts.push(current);

  // Only return split if we actually found multiple syllables
  return parts.length > 1 ? parts : null;
}


function applySyllableMarkers() {

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const tag = node.parentElement
          ? node.parentElement.tagName.toUpperCase()
          : '';

        const skipTags = [
          'SCRIPT','STYLE','NOSCRIPT','INPUT',
          'TEXTAREA','CODE','PRE','B','BUTTON'
        ];

        // Skip already-processed bionic spans
        if (node.parentElement &&
            node.parentElement.getAttribute('data-neuroread') === 'true') {
          return NodeFilter.FILTER_REJECT;
        }

        if (skipTags.includes(tag)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(function(node) {
    const words = node.textContent.split(' ');
    let modified = false;

    const newWords = words.map(function(word) {
      const syllables = splitIntoSyllables(word);
      if (syllables) {
        modified = true;
        // Join syllables with a middle dot · (U+00B7)
        return syllables.join('\u00B7');
      }
      return word;
    });

    if (modified) {
      const span = document.createElement('span');
      span.textContent = newWords.join(' ');
      span.setAttribute('data-neuroread-syllable', 'true');

      if (node.parentNode) {
        node.parentNode.replaceChild(span, node);
      }

      syllableSpans.push({ span: span, original: node });
    }
  });
}


function removeSyllableMarkers() {
  syllableSpans.forEach(function(item) {
    if (item.span && item.span.parentNode) {
      item.span.parentNode.replaceChild(item.original, item.span);
    }
  });
  syllableSpans = [];
}


// ============================================================
// SUB-FEATURE 7 — PARAGRAPH BREATHING SPACE
// Problem solved: Dense paragraphs trigger visual overwhelm.
// How: Increase paragraph margins so content breathes
// ============================================================

function applyParagraphSpacing() {

  const style = document.createElement('style');
  style.id = 'neuro-paragraph-style';
  style.textContent = `
    body.neuro-para-active p {
      margin-bottom: 1.8em !important;
      margin-top: 0.4em !important;
    }

    body.neuro-para-active h1,
    body.neuro-para-active h2,
    body.neuro-para-active h3,
    body.neuro-para-active h4 {
      margin-top: 1.4em !important;
      margin-bottom: 0.6em !important;
    }

    body.neuro-para-active li {
      margin-bottom: 0.6em !important;
      line-height: 1.8 !important;
    }
  `;

  document.head.appendChild(style);
  paraStyleEl = style;

  document.body.classList.add('neuro-para-active');
}


function removeParagraphSpacing() {
  if (paraStyleEl && paraStyleEl.parentNode) {
    paraStyleEl.parentNode.removeChild(paraStyleEl);
  }
  paraStyleEl = null;
  document.body.classList.remove('neuro-para-active');
}


// ============================================================
// MASTER CONTROLLER — applyAllBionic / removeAllBionic
// Fires all 7 sub-features in one call
// ============================================================

function applyAllBionic() {
  applyWordBolding();       // Sub-feature 1
  applyLineHighlighter();   // Sub-feature 2
  applyOpenDyslexicFont();  // Sub-feature 3
  applyProgressBar();       // Sub-feature 4
  applyLetterSpacing();     // Sub-feature 5
  applySyllableMarkers();   // Sub-feature 6
  applyParagraphSpacing();  // Sub-feature 7
  bionicActive = true;
}

function removeAllBionic() {
  removeWordBolding();       // Sub-feature 1
  removeLineHighlighter();   // Sub-feature 2
  removeOpenDyslexicFont();  // Sub-feature 3
  removeProgressBar();       // Sub-feature 4
  removeLetterSpacing();     // Sub-feature 5
  removeSyllableMarkers();   // Sub-feature 6
  removeParagraphSpacing();  // Sub-feature 7
  bionicActive = false;
}


// ============================================================
// GET PAGE TEXT — for AI Summariser (Feature 3)
// Returns first 4000 chars of visible page text
// ============================================================

function getPageText() {
  return document.body.innerText.slice(0, 4000);
}


// ============================================================
// MESSAGE LISTENER
// Receives commands from popup.js
// Chrome messaging bridges the popup world and page world
// ============================================================

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  if (message.action === 'toggleBionic') {
    if (message.on) {
      applyAllBionic();
    } else {
      removeAllBionic();
    }
    sendResponse({ success: true, active: bionicActive });
  }

  if (message.action === 'getText') {
    sendResponse({ text: getPageText() });
  }

  // Return true to keep message channel open for async
  return true;
});