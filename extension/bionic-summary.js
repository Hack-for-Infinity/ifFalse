// ============================================================
// NEUROREAD — bionic-summary.js
// ============================================================
// Applies all 7 Bionic Reading features to a given DOM element.
// Used by summary.html (extension page — content.js not injected).
// ============================================================

(function() {
  const SKIP_TAGS = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'INPUT', 'TEXTAREA', 'CODE', 'PRE'];
  let bionicSpans = [];

  function splitIntoSyllables(clean) {
    if (clean.length <= 8) return null;
    const vowels = 'aeiouAEIOU';
    const parts = [];
    let current = '';
    for (let i = 0; i < clean.length; i++) {
      current += clean[i];
      if (i < clean.length - 2 && vowels.includes(clean[i]) &&
          !vowels.includes(clean[i + 1]) && vowels.includes(clean[i + 2])) {
        parts.push(current);
        current = '';
      }
    }
    if (current) parts.push(current);
    return parts.length > 1 ? parts : null;
  }

  function addSyllableMarkers(word) {
    const leading = (word.match(/^[^a-zA-Z]*/) || [''])[0];
    const trailing = (word.match(/[^a-zA-Z]*$/) || [''])[0];
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (clean.length <= 8) return word;
    const syllables = splitIntoSyllables(clean);
    if (!syllables) return word;
    return leading + syllables.join('\u00B7') + trailing;
  }

  function boldWord(word) {
    if (!word || word.length === 0) return word;
    const processed = addSyllableMarkers(word);
    const boldLength = Math.max(1, Math.ceil(processed.length * 0.45));
    const boldPart = processed.slice(0, boldLength);
    const normalPart = processed.slice(boldLength);
    return '<b style="font-weight:700">' + boldPart + '</b>' + normalPart;
  }

  function tokenizeText(text) {
    return text.split(/(\s+)/);
  }

  function transformTextToBionic(text) {
    return tokenizeText(text).map(function(token) {
      if (/^\s*$/.test(token)) return token;
      return boldWord(token);
    }).join('');
  }

  function isInsideNeuroRead(el) {
    while (el) {
      if (el.getAttribute?.('data-neuroread') === 'true') return true;
      el = el.parentElement;
    }
    return false;
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (SKIP_TAGS.includes(parent.tagName.toUpperCase())) return true;
    if (isInsideNeuroRead(parent)) return true;
    return false;
  }

  function applyWordBolding(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function(node) {
      const span = document.createElement('span');
      span.innerHTML = transformTextToBionic(node.textContent);
      span.setAttribute('data-neuroread', 'true');
      if (node.parentNode) node.parentNode.replaceChild(span, node);
      bionicSpans.push({ span, original: node });
    });
  }

  // function injectFont() {
  //   const style = document.createElement('style');
  //   style.id = 'neuro-summary-font';
  //   style.textContent = `
  //     @import url('https://fonts.cdnfonts.com/css/opendyslexic');
  //     body { font-family: 'OpenDyslexic', Arial, sans-serif !important; }
  //   `;
  //   document.head.appendChild(style);
  // }

  function injectSpacing() {
    const style = document.createElement('style');
    style.id = 'neuro-summary-spacing';
    style.textContent = `
      .content p, .content li, .content h1, .content h2, .content h3, .content h4 {
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
        line-height: 1.8 !important;
      }
      .content p { margin-bottom: 2em !important; margin-top: 0.4em !important; }
      .content h1, .content h2, .content h3, .content h4 {
        margin-top: 1.4em !important; margin-bottom: 0.6em !important;
      }
      .content li { margin-bottom: 0.6em !important; }
    `;
    document.head.appendChild(style);
  }

  function applyLineHighlighter() {
    const bar = document.createElement('div');
    bar.id = 'neuro-line-highlight';
    bar.style.cssText = `
      position: fixed !important; left: 0 !important; width: 100% !important;
      height: 28px !important; background: rgba(255, 213, 0, 0.25) !important;
      pointer-events: none !important; z-index: 999998 !important;
      transition: top 0.05s ease !important; top: 0 !important;
    `;
    document.body.appendChild(bar);
    document.addEventListener('mousemove', function(e) {
      bar.style.top = (Math.floor(e.clientY / 28) * 28) + 'px';
    });
  }

  function applyProgressBar() {
    const bar = document.createElement('div');
    bar.id = 'neuro-progress-bar';
    bar.style.cssText = `
      position: fixed !important; top: 0 !important; left: 0 !important;
      width: 0% !important; height: 4px !important;
      background: linear-gradient(90deg, #3b5bdb, #7048e8) !important;
      z-index: 999999 !important; transition: width 0.1s ease !important;
    `;
    document.body.appendChild(bar);
    function update() {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      bar.style.width = (total <= 0 ? 100 : Math.min((scrolled / total) * 100, 100)) + '%';
    }
    window.addEventListener('scroll', update);
    update();
  }

  window.applyBionicToElement = function(root) {
    // injectFont();
    injectSpacing();
    applyWordBolding(root);
    applyLineHighlighter();
    applyProgressBar();
  };
})();
