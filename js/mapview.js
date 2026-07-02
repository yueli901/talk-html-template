/* ============================================================
   Map view — a pan/zoom "map" of all slides, grouped by section.
   Replaces reveal's discrete overview. Toggle with Esc or the button.
   - drag / one-finger  : pan (smooth)
   - wheel / pinch      : zoom toward the cursor (smooth)
   - + / - buttons, dblclick : zoom
   - click a slide      : jump there and close
   Layout is locked (columns = sections, rows = slides in a section);
   only the view transform moves.
   ============================================================ */
var MapView = (function () {
  var overlay, canvas, built = false, open = false;
  var state = { scale: 1, x: 0, y: 0 };
  var TW = 384, TH = 216, GAP = 30, PAD = 70, LABEL = 34;
  var dragging = false, lx = 0, ly = 0, moved = false;
  var touch = { mode: null, x: 0, y: 0, d: 0 };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function apply(smooth) {
    canvas.style.transition = smooth ? 'transform .2s ease' : 'none';
    canvas.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) scale(' + state.scale + ')';
  }

  function init() {
    overlay = document.getElementById('mapOverlay');
    canvas = document.getElementById('mapCanvas');
    if (!overlay || !canvas) return;
    document.getElementById('mapClose').addEventListener('click', close);
    document.getElementById('mapZoomIn').addEventListener('click', function () { zoomBy(1.25); });
    document.getElementById('mapZoomOut').addEventListener('click', function () { zoomBy(0.8); });
    var mb = document.getElementById('mapBtn');
    if (mb) mb.addEventListener('click', toggle);

    overlay.addEventListener('wheel', onWheel, { passive: false });
    overlay.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    overlay.addEventListener('dblclick', onDbl);
    overlay.addEventListener('touchstart', onTouchStart, { passive: false });
    overlay.addEventListener('touchmove', onTouchMove, { passive: false });
    overlay.addEventListener('touchend', onTouchEnd);

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) { e.preventDefault(); toggle(); }
    });

    if (/[?&]map=1/.test(location.search)) window.setTimeout(openMap, 500);  // deep-link to map view
  }

  function build() {
    var cols = Array.prototype.slice.call(document.querySelectorAll('.reveal > .slides > section'));
    var maxRows = 0;
    cols.forEach(function (col, ci) {
      var leaves = col.querySelectorAll(':scope > section');
      if (leaves.length === 0) leaves = [col];
      var name = col.getAttribute('data-section');
      if (!name) { var h = col.querySelector('h1,h2'); name = h ? h.textContent.trim() : ''; }
      var lab = document.createElement('div');
      lab.className = 'map-col-label';
      lab.textContent = name;
      lab.style.left = (PAD + ci * (TW + GAP)) + 'px';
      lab.style.top = (PAD - LABEL) + 'px';
      lab.style.width = TW + 'px';
      canvas.appendChild(lab);
      Array.prototype.forEach.call(leaves, function (leaf, ri) {
        var tile = makeTile(leaf);
        tile.style.left = (PAD + ci * (TW + GAP)) + 'px';
        tile.style.top = (PAD + ri * (TH + GAP)) + 'px';
        canvas.appendChild(tile);
        if (ri + 1 > maxRows) maxRows = ri + 1;
      });
    });
    canvas.style.width = (PAD * 2 + cols.length * (TW + GAP)) + 'px';
    canvas.style.height = (PAD * 2 + maxRows * (TH + GAP)) + 'px';
    built = true;
  }

  function makeTile(leaf) {
    var tile = document.createElement('div');
    tile.className = 'map-tile';
    if (leaf.classList.contains('section-divider')) tile.classList.add('is-divider');
    if (leaf.classList.contains('plain')) tile.classList.add('is-plain');
    var thumb = document.createElement('div');
    thumb.className = 'map-thumb';
    var clone = leaf.cloneNode(true);
    clone.removeAttribute('style');
    clone.removeAttribute('hidden');
    clone.className = clone.className.replace(/\b(present|past|future|stack|current)\b/g, '').trim();
    Array.prototype.forEach.call(clone.querySelectorAll('aside.notes'), function (n) { n.remove(); });
    thumb.appendChild(clone);
    tile.appendChild(thumb);
    var idx = Reveal.getIndices(leaf);
    tile.addEventListener('click', function (e) {
      e.stopPropagation();
      if (moved) return;                 // ignore click that ended a pan
      Reveal.slide(idx.h, idx.v || 0);
      close();
    });
    return tile;
  }

  function fitView() {
    var ow = overlay.clientWidth, oh = overlay.clientHeight;
    var cw = parseFloat(canvas.style.width), ch = parseFloat(canvas.style.height);
    var s = clamp(Math.min(ow / cw, oh / ch) * 0.95, 0.42, 1);  // stay readable
    state.scale = s;
    var sw = cw * s, sh = ch * s;
    state.x = sw < ow ? (ow - sw) / 2 : 40;   // fits → centre; else start top-left and pan
    state.y = sh < oh ? (oh - sh) / 2 : 40;
    apply(true);
  }

  /* ---- zoom / pan ---- */
  function zoomAt(cx, cy, factor) {
    var ns = clamp(state.scale * factor, 0.08, 3);
    var k = ns / state.scale;
    state.x = cx - k * (cx - state.x);
    state.y = cy - k * (cy - state.y);
    state.scale = ns;
    apply(false);
  }
  function zoomBy(f) { zoomAt(overlay.clientWidth / 2, overlay.clientHeight / 2, f); apply(true); }

  function onWheel(e) {
    e.preventDefault();
    var r = overlay.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.pow(1.0016, -e.deltaY));
  }
  function onDown(e) { if (e.button !== 0) return; dragging = true; moved = false; lx = e.clientX; ly = e.clientY; overlay.classList.add('grabbing'); }
  function onMove(e) {
    if (!dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    state.x += dx; state.y += dy; lx = e.clientX; ly = e.clientY; apply(false);
  }
  function onUp() { dragging = false; overlay.classList.remove('grabbing'); window.setTimeout(function () { moved = false; }, 0); }
  function onDbl(e) { var r = overlay.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6); apply(true); }

  /* ---- touch ---- */
  function dist(t) { var a = t[0], b = t[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  function mid(t) { return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }; }
  function onTouchStart(e) {
    if (e.touches.length === 1) { touch.mode = 'pan'; touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY; moved = false; }
    else if (e.touches.length === 2) { touch.mode = 'pinch'; touch.d = dist(e.touches); }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (touch.mode === 'pan' && e.touches.length === 1) {
      var nx = e.touches[0].clientX, ny = e.touches[0].clientY;
      if (Math.abs(nx - touch.x) + Math.abs(ny - touch.y) > 4) moved = true;
      state.x += nx - touch.x; state.y += ny - touch.y; touch.x = nx; touch.y = ny; apply(false);
    } else if (touch.mode === 'pinch' && e.touches.length === 2) {
      var nd = dist(e.touches), r = overlay.getBoundingClientRect(), m = mid(e.touches);
      zoomAt(m.x - r.left, m.y - r.top, nd / touch.d); touch.d = nd;
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length === 0) { touch.mode = null; window.setTimeout(function () { moved = false; }, 0); }
    else if (e.touches.length === 1) { touch.mode = 'pan'; touch.x = e.touches[0].clientX; touch.y = e.touches[0].clientY; }
  }

  /* ---- open / close ---- */
  function openMap() {
    if (!built) build();
    open = true;
    overlay.classList.add('open');
    document.body.classList.add('map-open');
    if (window.Reveal) Reveal.configure({ keyboard: false });
    fitView();
  }
  function close() {
    open = false;
    overlay.classList.remove('open');
    document.body.classList.remove('map-open');
    if (window.Reveal) Reveal.configure({ keyboard: true });
  }
  function toggle() { open ? close() : openMap(); }

  return { init: init, toggle: toggle };
})();
