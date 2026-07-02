/* ============================================================
   Narration playback (load-only, no recording)
   - fetches narration/manifest.json on load
   - manifest = { "base": "<object-storage base URL or ''>",
                  "clips": { "<data-audio key>": "file.m4a", ... } }
   - a clip is matched to a slide by its data-audio="<key>" attribute
   - if any clips exist, shows the "Play narrated" button; playback plays
     the current slide's clip then auto-advances; slides without a clip
     dwell briefly. Manual navigation while playing re-syncs.
   NOTE: object-storage base must send CORS headers for this origin.
   ============================================================ */
var Narration = (function () {
  var base = '', clips = {}, audio = null, playing = false, btn = null, dwellMs = 2500;

  function keyOf() {
    var s = Reveal.getCurrentSlide();
    return s ? s.getAttribute('data-audio') : null;
  }
  function urlFor() {
    var k = keyOf();
    return (k && clips[k]) ? (base + clips[k]) : null;
  }
  function firstClipSlide() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-audio]'));
    for (var i = 0; i < els.length; i++) {
      if (clips[els[i].getAttribute('data-audio')]) return els[i];
    }
    return null;
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
      btn.classList.add('hidden');
    }
  }

  function toggle() { playing ? stop() : start(); }

  function start() {
    playing = true;
    btn.classList.add('playing');
    setLabel('Pause');
    if (urlFor()) { playCurrent(); return; }
    var el = firstClipSlide();
    if (!el) { stop(); return; }
    var t = Reveal.getIndices(el), c = Reveal.getIndices();
    if (t.h === c.h && (t.v || 0) === (c.v || 0)) playCurrent();
    else Reveal.slide(t.h, t.v);   // fires slidechanged -> playCurrent
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
    var url = urlFor();
    if (!url) { window.setTimeout(function () { if (playing) advance(); }, dwellMs); return; }
    audio = new Audio(url);
    audio.onended = function () { if (playing) advance(); };
    audio.play().catch(function () {});
  }

  function advance() {
    if (Reveal.isLastSlide()) { stop(); return; }
    Reveal.next();
  }

  function setLabel(t) { var s = btn.querySelector('.lbl'); if (s) s.textContent = t; }

  return { init: init };
})();
