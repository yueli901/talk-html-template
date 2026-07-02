/* ============================================================
   reveal.js configuration for the talk template
   - 1-D (linear) navigation: any arrow = prev / next
   - no progress bar, slide number shown (current / total)
   - offline KaTeX, menu (ToC), chalkboard (pen), speaker notes, zoom
   ============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  Reveal.initialize({
    hash: true,
    controls: true,
    controlsLayout: 'edges',
    controlsBackArrows: 'visible',
    controlsTutorial: false,
    progress: false,               // no progress bar (requested)
    slideNumber: 'c/t',            // "current / total"
    showSlideNumber: 'all',
    center: true,
    transition: 'slide',
    backgroundTransition: 'fade',
    navigationMode: 'linear',      // 1-D: up/down/left/right all step the sequence
    hideInactiveCursor: true,
    hideCursorTime: 2500,
    plugins: [RevealNotes, RevealHighlight, RevealZoom, RevealMenu, RevealChalkboard],

    menu: {
      side: 'left',
      width: 'normal',
      numbers: true,
      titleSelector: 'h1, h2, h3.toc',
      hideMissingTitles: true,
      markers: true,
      custom: false, themes: false, themesInSubmenu: false, transitions: false,
      openButton: true,            // hamburger = navigation panel
      openSlideNumber: false,
      keyboard: true,
      sticky: false,
      autoOpen: false
    },

    chalkboard: {
      boardmarkerWidth: 3,
      chalkWidth: 5,
      chalkEffect: 0.6,
      color: ['rgba(0,62,116,1)', 'rgba(255,255,255,1)'],
      toggleChalkboardButton: false,   // use keyboard 'c' — keeps the UI clean
      toggleNotesButton: false         // keyboard 'b'
    }
  }).then(function () {
    renderMath();
    if (window.Narration) Narration.init();
    setupPdfButton();
    registerServiceWorker();
  });

  /* ---- offline KaTeX rendering (all slides live in the DOM at once) ---- */
  function renderMath() {
    if (!window.renderMathInElement) return;
    renderMathInElement(document.querySelector('.reveal .slides'), {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }

  /* ---- floating "Download PDF" button: visible on the first slide only ---- */
  function setupPdfButton() {
    var btn = document.getElementById('dlPdf');
    if (!btn) return;
    function update() {
      var i = Reveal.getIndices();
      if (i.h === 0 && (i.v || 0) === 0) btn.classList.remove('hidden');
      else btn.classList.add('hidden');
    }
    Reveal.on('slidechanged', update);
    update();
  }

  /* ---- offline support ---- */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
});
