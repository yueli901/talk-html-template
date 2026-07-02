/* ============================================================
   reveal.js configuration for the talk template
   - 1-D (linear) navigation over a section-stack structure
   - Beamer-style headline (top) + footline (bottom)
   - Esc overview grouped by section, navigable by scrolling
   Talk metadata comes from window.TALK (set in index.html).
   ============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  var TALK = window.TALK || {};

  Reveal.initialize({
    hash: true,
    controls: true,
    controlsLayout: 'edges',
    controlsBackArrows: 'visible',
    controlsTutorial: false,
    progress: false,
    slideNumber: false,             // our footline shows the page number
    center: true,
    transition: 'slide',
    backgroundTransition: 'fade',
    navigationMode: 'linear',       // 1-D: step through every slide in order
    hideInactiveCursor: true,
    hideCursorTime: 2500,
    overview: true,
    plugins: [RevealNotes, RevealHighlight, RevealZoom, RevealMenu, RevealChalkboard],

    keyboard: {                     // any arrow steps the linear sequence
      38: function () { Reveal.prev(); },   // up
      40: function () { Reveal.next(); }    // down
    },

    menu: {
      side: 'left', width: 'normal', numbers: true,
      titleSelector: 'h2', hideMissingTitles: true, markers: true,
      custom: false, themes: false, transitions: false,
      openButton: true, openSlideNumber: false, keyboard: true, sticky: false, autoOpen: false
    },
    chalkboard: {
      boardmarkerWidth: 3, chalkWidth: 5, chalkEffect: 0.6,
      color: ['rgba(0,62,116,1)', 'rgba(255,255,255,1)'],
      toggleChalkboardButton: false, toggleNotesButton: false
    }
  }).then(function () {
    renderMath();
    buildSectionIndex();
    updateChrome();
    Reveal.on('slidechanged', updateChrome);
    setupOverview();
    if (window.Narration) Narration.init();
    setupPdfButton();
    registerServiceWorker();
  });

  /* ---- section bookkeeping ---- */
  var sections = [];   // horizontal <section data-section="..."> stacks, in order
  function buildSectionIndex() {
    sections = Array.prototype.slice
      .call(document.querySelectorAll('.reveal > .slides > section[data-section]'));
  }
  function sectionOf(slide) {
    var stack = slide.closest('section[data-section]');
    return stack ? stack.getAttribute('data-section') : null;
  }
  function sectionPos(slide) {
    var stack = slide.closest('section[data-section]');
    var i = sections.indexOf(stack);
    return { k: i + 1, m: sections.length };
  }

  /* ---- Beamer chrome: headline + footline ---- */
  function updateChrome() {
    var hl = document.getElementById('headline');
    var fl = document.getElementById('footline');
    var s = Reveal.getCurrentSlide();
    if (!s || !hl || !fl) return;

    var plain = s.classList.contains('plain') || s.classList.contains('section-divider');
    var sec = sectionOf(s);
    if (plain || !sec) { hl.classList.add('hidden'); fl.classList.add('hidden'); return; }

    hl.classList.remove('hidden'); fl.classList.remove('hidden');
    var pos = sectionPos(s);
    hl.querySelector('.sec').textContent = sec;
    hl.querySelector('.prog').textContent = 'Section ' + pos.k + ' / ' + pos.m;

    var n = (typeof Reveal.getSlidePastCount === 'function' ? Reveal.getSlidePastCount() : 0) + 1;
    var N = Reveal.getTotalSlides();
    fl.querySelector('.a').textContent =
      (TALK.author || 'Presenter') + (TALK.institution ? ' (' + TALK.institution + ')' : '');
    fl.querySelector('.t').textContent = TALK.title || document.title;
    fl.querySelector('.d').textContent = (TALK.date ? TALK.date + '  ·  ' : '') + n + ' / ' + N;
  }

  /* ---- Esc overview: grouped by section, navigable by scrolling ---- */
  function setupOverview() {
    var lock = false;
    function onWheel(e) {
      e.preventDefault();
      if (lock) return; lock = true;
      window.setTimeout(function () { lock = false; }, 220);
      if (e.deltaY > 0 || e.deltaX > 0) Reveal.next(); else Reveal.prev();
    }
    Reveal.on('overviewshown', function () {
      document.body.classList.add('overview-active');
      document.getElementById('headline').classList.add('hidden');
      document.getElementById('footline').classList.add('hidden');
      window.addEventListener('wheel', onWheel, { passive: false });
    });
    Reveal.on('overviewhidden', function () {
      document.body.classList.remove('overview-active');
      window.removeEventListener('wheel', onWheel);
      updateChrome();
    });
  }

  /* ---- offline KaTeX ---- */
  function renderMath() {
    if (!window.renderMathInElement) return;
    renderMathInElement(document.querySelector('.reveal .slides'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ], throwOnError: false
    });
  }

  /* ---- floating "Download PDF": first slide only ---- */
  function setupPdfButton() {
    var btn = document.getElementById('dlPdf');
    if (!btn) return;
    function update() {
      var i = Reveal.getIndices();
      if (i.h === 0 && (i.v || 0) === 0) btn.classList.remove('hidden');
      else btn.classList.add('hidden');
    }
    Reveal.on('slidechanged', update); update();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  }
});
