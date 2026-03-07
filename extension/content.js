// ============================================================
// NEUROREAD — content.js
// ============================================================
// Injected into every webpage automatically by Chrome.
// Sits silently until the user clicks "Enable Bionic Reading" in the popup.
// When activated, transforms the DOM in place — same tab, same URL, no reload.
//
// SUB-FEATURE 1 — WORD BOLD ANCHORING (Bionic Reading core)
// Problem: Dyslexic readers lose their place. Words blur together.
// Solution: Bold the first 45% of every word. Creates visual anchors.
// ============================================================


// ── GLOBAL STATE ─────────────────────────────────────────────
// Tracks whether Bionic Reading is currently active on this page.
let bionicActive = false;

// Stores every span we created and its original text node.
// Required for perfect reversal — we put the original nodes back.
let bionicSpans = [];

// Sub-Feature 3 — OpenDyslexic font: injected style element for removal
let fontStyleEl = null;


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
 * Transforms a single word using Bionic Reading.
 * @param {string} word - A single word (no spaces)
 * @returns {string} - HTML with first 45% wrapped in <b>
 */
function boldWord(word) {
  if (!word || word.length === 0) return word;

  // First 45% of characters become the "anchor" — minimum 1 character
  const boldLength = Math.max(1, Math.ceil(word.length * 0.45));
  const boldPart = word.slice(0, boldLength);
  const normalPart = word.slice(boldLength);

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
// SUB-FEATURE 3 — OPENDYSLEXIC FONT
// ============================================================
// Problem: Letters b/d/p/q flip and look identical when rotated.
// Solution: OpenDyslexic — every letter has a weighted bottom.
// The brain's visual cortex stops attempting to rotate letters.
// Created by Abelardo Gonzalez. Free, open source.
// ============================================================

function applyOpenDyslexicFont() {
  const style = document.createElement('style');
  style.id = 'neuro-font-style';
  style.textContent = `
    @import url('https://fonts.cdnfonts.com/css/opendyslexic');
    body.neuro-font-active,
    body.neuro-font-active *:not(code):not(pre):not(kbd):not(samp) {
      font-family: 'OpenDyslexic', Arial, sans-serif !important;
    }
  `;
  document.head.appendChild(style);
  fontStyleEl = style;
  document.body.classList.add('neuro-font-active');
}

function removeOpenDyslexicFont() {
  if (fontStyleEl?.parentNode) {
    fontStyleEl.parentNode.removeChild(fontStyleEl);
  }
  fontStyleEl = null;
  document.body.classList.remove('neuro-font-active');
}


// ============================================================
// MESSAGE LISTENER
// ============================================================
// popup.js sends messages. We receive and execute.
// Chrome messaging bridges the popup (extension UI) and the page (content script).

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  if (message.action === 'toggleBionic') {
    if (message.on) {
      applyOpenDyslexicFont();  // Sub-Feature 3 — font first
      applyWordBolding();       // Sub-Feature 1 — then bold
      bionicActive = true;
    } else {
      removeWordBolding();
      removeOpenDyslexicFont();
      bionicActive = false;
    }
    sendResponse({ success: true, active: bionicActive });
  }

  if (message.action === 'getState') {
    sendResponse({ active: bionicActive });
  }

  // Keep channel open for async response
  return true;
});
