/* ============================================================
   Narration playback (load-only, no recording)
   - fetches narration/manifest.json on load
   - manifest = { "base": "<object-storage base URL or ''>",
                  "clips": { "<slideIndex>": "relative/or/name.m4a", ... } }
   - if any clips exist, shows the "Play narrated" button
   - playback plays the current slide's clip, then auto-advances;
     slides without a clip dwell briefly then advance
   - manual navigation while playing re-syncs to the current slide
   NOTE: if `base` is an object-storage URL, that bucket must send
         CORS headers allowing this page's origin.
   ============================================================ */
var Narration = (function () {
  var base = '', clips = {}, audio = null, playing = false, btn = null, dwellMs = 2500;

  function urlFor(h) {
    var rel = clips[String(h)];
    return rel ? (base + rel) : null;
  }

  async function init() {
    btn = document.getElementById('playNarrated');
    if (!btn) return;
    try {
      var res = await fetch('narration/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('no manifest');
      var m = await res.json();
      base = m.base || '';
      clips = m.clips || {};
      if (typeof m.dwellMs === 'number') dwellMs = m.dwellMs;
    } catch (e) { clips = {}; }

    if (Object.keys(clips).length > 0) {
      btn.classList.remove('hidden');
      btn.addEventListener('click', toggle);
      Reveal.on('slidechanged', function () { if (playing) playCurrent(); });
    } else {
      btn.classList.add('hidden');   // graceful: no narration available
    }
  }

  function toggle() { playing ? stop() : start(); }

  function start() {
    playing = true;
    btn.classList.add('playing');
    setLabel('Pause');
    var h = Reveal.getIndices().h;
    if (urlFor(h)) {
      playCurrent();
    } else {
      var keys = Object.keys(clips).map(Number).sort(function (a, b) { return a - b; });
      var first = keys[0];
      if (first === h) playCurrent();
      else Reveal.slide(first, 0);   // fires slidechanged -> playCurrent
    }
  }

  function stop() {
    playing = false;
    btn.classList.remove('playing');
    setLabel('Play narrated');
    if (audio) { audio.pause(); audio = null; }
  }

  function playCurrent() {
    if (!playing) return;
    if (audio) { audio.pause(); audio = null; }
    var url = urlFor(Reveal.getIndices().h);
    if (!url) {
      window.setTimeout(function () { if (playing) advance(); }, dwellMs);
      return;
    }
    audio = new Audio(url);
    audio.onended = function () { if (playing) advance(); };
    audio.play().catch(function () {/* autoplay/network guard */});
  }

  function advance() {
    if (Reveal.isLastSlide()) { stop(); return; }
    Reveal.next();   // slidechanged -> playCurrent
  }

  function setLabel(t) {
    var span = btn.querySelector('.lbl');
    if (span) span.textContent = t;
  }

  return { init: init };
})();
