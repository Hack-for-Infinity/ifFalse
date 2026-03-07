// ============================================================
// NEUROREAD — content.js
// ============================================================
// Wrapped in IIFE to avoid "Identifier already declared" when
// executeScript re-injects this file into the same page.
// ============================================================
if (window.__neuroReadInit) return;
window.__neuroReadInit = true;
(function() {
'use strict';

// ── GLOBAL STATE ─────────────────────────────────────────────
// Tracks whether Bionic Reading is currently active on this page.
let bionicActive = false;

// Stores every span we created and its original text node.
// Required for perfect reversal — we put the original nodes back.
let bionicSpans = [];

// Sub-Feature 2 — Line Highlighter: bar element and mousemove handler
let lineHighlightEl = null;
let mouseMoveHandler = null;

// Sub-Feature 3 — OpenDyslexic font: injected style element for removal
let fontStyleEl = null;

// Sub-Feature 4 — Reading Progress Bar: bar element and scroll handler
let progressBarEl = null;
let scrollHandler = null;

// Sub-Feature 5 — Letter Spacing: injected style element
let spacingStyleEl = null;

// Sub-Feature 7 — Paragraph Breathing: injected style element
let paraStyleEl = null;

// Focus Mode — first subfeature: core reading view
let focusActive = false;
let focusWrapper = null;
let focusExitBtn = null;
let focusWikiMode = false;
let focusSavedContent = null;
let focusSavedParent = null;
let focusSavedNext = null;
let focusHiddenNodes = [];

// ============================================================
// FOCUS MODE — FIRST SUBFEATURE (core reading view)
// ============================================================
// Wikipedia: extract only main content for full width control.
// Other sites: wrap entire page.
// ============================================================

function applyFocusMode() {
  if (focusActive) return;
  const body = document.body;
  if (!body) return;

  const isWiki = /wikipedia\.org|wikimedia\.org|wikimediafoundation\.org/.test(window.location.hostname);
  let mainContent = null;

  if (isWiki) {
    mainContent = document.getElementById('mw-content-text') ||
      document.getElementById('bodyContent') ||
      document.querySelector('.mw-parser-output');
  }

  focusWrapper = document.createElement('div');
  focusWrapper.className = 'neuro-focus-wrapper';
  focusWrapper.id = 'neuro-focus-content';
  focusWrapper.style.cssText = 'max-width:min(95vw,1600px)!important;width:95%!important;margin:0 auto!important;padding:48px 64px!important;box-sizing:border-box!important;';

  if (isWiki && mainContent) {
    focusWikiMode = true;
    focusSavedContent = mainContent;
    focusSavedParent = mainContent.parentNode;
    focusSavedNext = mainContent.nextSibling;
    focusWrapper.appendChild(mainContent);
    body.appendChild(focusWrapper);
    focusHiddenNodes = [];
    for (let i = 0; i < body.children.length; i++) {
      const c = body.children[i];
      if (c !== focusWrapper && c.id !== 'neuro-focus-content') {
        if (c.style.display !== 'none') {
          c.dataset.neuroFocusHidden = '1';
          c.style.display = 'none';
          focusHiddenNodes.push(c);
        }
      }
    }
  } else {
    focusWikiMode = false;
    while (body.firstChild) {
      const child = body.firstChild;
      if (child.id === 'neuro-focus-content' || child.classList?.contains('neuro-focus-exit')) continue;
      focusWrapper.appendChild(child);
    }
    body.appendChild(focusWrapper);
  }

  focusExitBtn = document.createElement('button');
  focusExitBtn.className = 'neuro-focus-exit';
  focusExitBtn.textContent = 'Exit Focus';
  focusExitBtn.setAttribute('aria-label', 'Exit Focus Mode');
  focusExitBtn.addEventListener('click', exitFocusMode);
  body.appendChild(focusExitBtn);

  body.classList.add('neuro-focus-active');
  focusActive = true;
}

function exitFocusMode() {
  if (!focusActive || !focusWrapper) return;
  const body = document.body;
  if (!body) return;

  body.classList.remove('neuro-focus-active');
  if (focusExitBtn?.parentNode) focusExitBtn.parentNode.removeChild(focusExitBtn);
  focusExitBtn = null;

  if (focusWikiMode && focusSavedContent && focusSavedParent) {
    focusWrapper.removeChild(focusSavedContent);
    if (focusSavedNext) {
      focusSavedParent.insertBefore(focusSavedContent, focusSavedNext);
    } else {
      focusSavedParent.appendChild(focusSavedContent);
    }
    for (const el of focusHiddenNodes) {
      el.style.display = '';
      delete el.dataset.neuroFocusHidden;
    }
    focusSavedContent = null;
    focusSavedParent = null;
    focusSavedNext = null;
    focusHiddenNodes = [];
    focusWikiMode = false;
  } else {
    while (focusWrapper.firstChild) {
      body.insertBefore(focusWrapper.firstChild, focusWrapper);
    }
  }

  if (focusWrapper.parentNode) focusWrapper.parentNode.removeChild(focusWrapper);
  focusWrapper = null;
  focusActive = false;
}

// ============================================================
// SUB-FEATURE 1 — WORD BOLD ANCHORING
// ============================================================
// The core of Bionic Reading. Every word gets its first 45% bolded.
// The bold letters create a visual entry point — the eye is pulled
// to the start of each word. The brain pattern-matches the rest.
//
// Algorithm:
// 1. TreeWalker finds every text node in the page (skips script/style/etc)
// 2. For each text node: split into words + whitespace, bold first 45% of each word
// 3. Replace text node with a span containing the transformed HTML
// 4. Store (span, originalNode) for reversal
// ============================================================

/**
 * Splits word into syllables (VCV pattern). Words > 8 chars only.
 * @param {string} clean - Word without punctuation
 * @returns {string[]|null} - Syllables or null if no split
 */
function splitIntoSyllables(clean) {
  if (clean.length <= 8) return null;
  const vowels = 'aeiouAEIOU';
  const parts = [];
  let current = '';
  for (let i = 0; i < clean.length; i++) {
    current += clean[i];
    if (i < clean.length - 2 &&
        vowels.includes(clean[i]) &&
        !vowels.includes(clean[i + 1]) &&
        vowels.includes(clean[i + 2])) {
      parts.push(current);
      current = '';
    }
  }
  if (current) parts.push(current);
  return parts.length > 1 ? parts : null;
}

/**
 * Adds syllable markers (·) to long words. Preserves punctuation.
 */
function addSyllableMarkers(word) {
  const leading = (word.match(/^[^a-zA-Z]*/) || [''])[0];
  const trailing = (word.match(/[^a-zA-Z]*$/) || [''])[0];
  const clean = word.replace(/[^a-zA-Z]/g, '');
  if (clean.length <= 8) return word;
  const syllables = splitIntoSyllables(clean);
  if (!syllables) return word;
  return leading + syllables.join('\u00B7') + trailing;
}

/**
 * Transforms a single word using Bionic Reading.
 * @param {string} word - A single word (no spaces)
 * @returns {string} - HTML with first 45% wrapped in <b>
 */
function boldWord(word) {
  if (!word || word.length === 0) return word;

  // Sub-Feature 6: Add syllable markers to long words first
  const processed = addSyllableMarkers(word);

  // First 45% of characters become the "anchor" — minimum 1 character
  const boldLength = Math.max(1, Math.ceil(processed.length * 0.45));
  const boldPart = processed.slice(0, boldLength);
  const normalPart = processed.slice(boldLength);

  return '<b style="font-weight:700">' + boldPart + '</b>' + normalPart;
}


/**
 * Splits text into tokens: words and whitespace blocks.
 * Preserves exact whitespace (newlines, tabs, multiple spaces) for perfect reversal.
 * @param {string} text - Raw text from a DOM text node
 * @returns {string[]} - Alternating [word, whitespace, word, whitespace, ...]
 */
function tokenizeText(text) {
  // split(/(\s+)/) keeps delimiters: "hello\n  world" → ["hello", "\n  ", "world"]
  return text.split(/(\s+)/);
}


/**
 * Transforms a full text node into Bionic Reading HTML.
 * Handles words, whitespace, and mixed content correctly.
 * @param {string} text - Full text content of the node
 * @returns {string} - HTML string with bolded word anchors
 */
function transformTextToBionic(text) {
  const tokens = tokenizeText(text);

  return tokens.map(function(token) {
    // Whitespace-only token — keep exactly as is (preserves newlines, tabs)
    if (/^\s*$/.test(token)) {
      return token;
    }
    // Word token — apply Bionic Reading
    return boldWord(token);
  }).join('');
}


/**
 * Checks if a DOM element should be skipped (script, style, etc.)
 * We never modify non-readable content.
 */
const SKIP_TAGS = [
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'SELECT',
  'BUTTON', 'CODE', 'PRE', 'KBD', 'VAR', 'SAMP', 'MATH', 'SVG', 'CANVAS'
];

/** Check if element is inside any NeuroRead-transformed container */
function isInsideNeuroRead(element) {
  let el = element;
  while (el) {
    if (el.getAttribute?.('data-neuroread') === 'true') return true;
    el = el.parentElement;
  }
  return false;
}

function shouldSkipNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;

  const tag = parent.tagName.toUpperCase();
  if (SKIP_TAGS.includes(tag)) return true;

  // Skip text inside our own spans (e.g. inside <b> within our span)
  if (isInsideNeuroRead(parent)) return true;

  return false;
}


/**
 * APPLY — Transforms every readable word on the page.
 * Uses TreeWalker to find text nodes. Collects them first, then modifies,
 * because modifying DOM while walking breaks the walker.
 */
function applyWordBolding() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        // Skip pure whitespace nodes (nothing to bold)
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // CRITICAL: Collect all nodes BEFORE modifying DOM.
  // Modifying while walking would invalidate the walker.
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(function(node) {
    const originalText = node.textContent;
    const transformedHTML = transformTextToBionic(originalText);

    // Create span with our transformed content
    const span = document.createElement('span');
    span.innerHTML = transformedHTML;
    span.setAttribute('data-neuroread', 'true');

    // Replace original text node with our span
    if (node.parentNode) {
      node.parentNode.replaceChild(span, node);
    }

    // Store for reversal — we need the original text node
    // (it's now detached from DOM but we keep a reference)
    bionicSpans.push({ span: span, original: node });
  });

  bionicActive = true;
}


/**
 * REMOVE — Restores the page to its exact original state.
 * Replaces every span we created with the original text node.
 */
function removeWordBolding() {
  bionicSpans.forEach(function(item) {
    if (item.span?.parentNode) {
      item.span.parentNode.replaceChild(item.original, item.span);
    }
  });
  bionicSpans = [];
}


// ============================================================
// SUB-FEATURE 2 — LINE HIGHLIGHTER
// ============================================================
// Problem: Eye loses place between lines. Attention hijacked mid-sentence.
// Solution: Translucent bar follows mouse Y, snaps to 28px grid.
// Like a physical reading ruler — works on every website on the internet.
// ============================================================

function applyLineHighlighter() {
  const bar = document.createElement('div');
  bar.id = 'neuro-line-highlight';

  bar.style.cssText = `
    position: fixed !important;
    left: 0 !important;
    width: 100% !important;
    height: 28px !important;
    background: rgba(255, 213, 0, 0.25) !important;
    border-top: 1px solid rgba(255, 193, 7, 0.3) !important;
    border-bottom: 1px solid rgba(255, 193, 7, 0.3) !important;
    pointer-events: none !important;
    z-index: 999998 !important;
    transition: top 0.05s ease !important;
    top: 0px !important;
  `;

  document.body.appendChild(bar);
  lineHighlightEl = bar;

  mouseMoveHandler = function(e) {
    const snappedTop = Math.floor(e.clientY / 28) * 28;
    bar.style.top = snappedTop + 'px';
  };

  document.addEventListener('mousemove', mouseMoveHandler);
}

function removeLineHighlighter() {
  if (lineHighlightEl?.parentNode) {
    lineHighlightEl.parentNode.removeChild(lineHighlightEl);
  }
  lineHighlightEl = null;

  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }
}


// ============================================================
// SUB-FEATURE 3 — OPENDYSLEXIC FONT
// ============================================================
// Problem: Letters b/d/p/q flip and look identical when rotated.
// Solution: OpenDyslexic — every letter has a weighted bottom.
// The brain's visual cortex stops attempting to rotate letters.
// Created by Abelardo Gonzalez. Free, open source.
// ============================================================

// function applyOpenDyslexicFont() {
//   const style = document.createElement('style');
//   style.id = 'neuro-font-style';
//   style.textContent = `
//     @import url('https://fonts.cdnfonts.com/css/opendyslexic');
//     body.neuro-font-active,
//     body.neuro-font-active *:not(code):not(pre):not(kbd):not(samp) {
//       font-family: 'OpenDyslexic', Arial, sans-serif !important;
//     }
//   `;
//   document.head.appendChild(style);
//   fontStyleEl = style;
//   document.body.classList.add('neuro-font-active');
// }

function removeOpenDyslexicFont() {
  if (fontStyleEl?.parentNode) {
    fontStyleEl.parentNode.removeChild(fontStyleEl);
  }
  fontStyleEl = null;
  document.body.classList.remove('neuro-font-active');
}


// ============================================================
// SUB-FEATURE 4 — READING PROGRESS BAR
// ============================================================
// Problem: Content feels infinite. No sense of progress. ADHD brain disengages.
// Solution: Thin bar at top fills as user scrolls. Micro-dopamine signal.
// ============================================================

function applyProgressBar() {
  const bar = document.createElement('div');
  bar.id = 'neuro-progress-bar';

  bar.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 0% !important;
    height: 4px !important;
    background: linear-gradient(90deg, #3b5bdb, #7048e8) !important;
    z-index: 999999 !important;
    transition: width 0.1s ease !important;
    border-radius: 0 2px 2px 0 !important;
  `;

  document.body.appendChild(bar);
  progressBarEl = bar;

  scrollHandler = function() {
    const scrolled = window.scrollY;
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (totalHeight <= 0) {
      bar.style.width = '100%';
      return;
    }

    const percent = (scrolled / totalHeight) * 100;
    bar.style.width = Math.min(percent, 100) + '%';
  };

  window.addEventListener('scroll', scrollHandler);
  scrollHandler(); // Initial position

}

function removeProgressBar() {
  if (progressBarEl?.parentNode) {
    progressBarEl.parentNode.removeChild(progressBarEl);
  }
  progressBarEl = null;

  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
}


// ============================================================
// SUB-FEATURE 5 — LETTER SPACING ENHANCER
// ============================================================
// Problem: Dense letter spacing causes words to blur together.
// Solution: +0.05em letter-spacing, +0.1em word-spacing, 1.8 line-height.
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
    body.neuro-spacing-active h3,
    body.neuro-spacing-active h4 {
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
  if (spacingStyleEl?.parentNode) {
    spacingStyleEl.parentNode.removeChild(spacingStyleEl);
  }
  spacingStyleEl = null;
  document.body.classList.remove('neuro-spacing-active');
}


// ============================================================
// SUB-FEATURE 7 — PARAGRAPH BREATHING SPACE
// ============================================================
// Problem: Dense paragraphs trigger visual overwhelm.
// Solution: More margin between blocks so the page breathes.
// ============================================================

function applyParagraphSpacing() {
  const style = document.createElement('style');
  style.id = 'neuro-paragraph-style';
  style.textContent = `
    body.neuro-para-active p {
      margin-bottom: 2em !important;
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
  if (paraStyleEl?.parentNode) {
    paraStyleEl.parentNode.removeChild(paraStyleEl);
  }
  paraStyleEl = null;
  document.body.classList.remove('neuro-para-active');
}


// ============================================================
// MESSAGE LISTENER
// ============================================================
// popup.js sends messages. We receive and execute.
// Chrome messaging bridges the popup (extension UI) and the page (content script).

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  if (message.action === 'toggleBionic') {
    if (message.on) {
      applyWordBolding();  // Sub-Feature 1 only — Word Bold Anchoring
      bionicActive = true;
    } else {
      removeWordBolding();
      bionicActive = false;
    }
    sendResponse({ success: true, active: bionicActive });
  }

  if (message.action === 'getState') {
    sendResponse({ active: bionicActive });
  }

  if (message.action === 'getPageContent') {
    const url = window.location.href;
    const content = document.body.innerText.slice(0, 50000);
    sendResponse({ url, content });
  }

  if (message.action === 'toggleFocus') {
    if (message.on) {
      applyFocusMode();
      focusActive = true;
    } else {
      exitFocusMode();
    }
    sendResponse({ success: true, active: focusActive });
  }

  if (message.action === 'getFocusState') {
    sendResponse({ active: focusActive });
  }

  if (message.action === 'restoreState') {
    const state = message.state || {};
    if (state.bionic) {
      applyWordBolding();
      bionicActive = true;
    }
    if (state.focus) {
      applyFocusMode();
      focusActive = true;
    }
    sendResponse({ success: true });
  }

  return true;
});

chrome.runtime.sendMessage({ action: 'getTabState' }, (response) => {
  const state = response?.state || {};
  if (state.bionic) {
    applyWordBolding();
    bionicActive = true;
  }
  if (state.focus) {
    applyFocusMode();
    focusActive = true;
  }
});

})();

