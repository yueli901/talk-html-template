# Talk HTML Template

A self-contained [reveal.js](https://revealjs.com) template for giving talks from a browser —
host it free on **GitHub Pages**, present it from any laptop with a URL, and it keeps working **offline**.

**Live demo:** https://yueli901.github.io/talk-html-template/

The demo deck is self-documenting: each slide shows one feature.

---

## Features

| Feature | How |
|---|---|
| 1-D navigation | any arrow / space steps the talk (`navigationMode: 'linear'`) |
| Slide numbers, no progress bar | `slideNumber: 'c/t'`, `progress: false` |
| Speaker view (notes, next, timer) | `S` |
| Draw on slides | `C` pen · `B` blank board |
| Zoom a figure | `Alt`+click |
| Offline math | KaTeX vendored in `vendor/katex/` |
| Floating **Download PDF** button | first slide → `slides.pdf` |
| **QR code** | title slide → your live URL |
| **Works offline / installable** | service worker (`sw.js`) + `manifest.webmanifest` |
| **Narration playback** | plays pre-recorded audio and auto-advances (see below) |

Everything is **static** and **self-hosted** — no CDN, no build step, no server.

---

## Quick start

1. Click **“Use this template”** on GitHub → create your repo.
2. Set your details in **`window.TALK`** (top of `index.html`) — author, institution,
   title, date. These fill the footer.
3. Edit the `<section>` slides; group them into sections (below).
4. Put figures in **`assets/`**; regenerate the QR (below) to point at your URL.
5. **Settings → Pages → Deploy from branch → `main` / `root`.** Done — your talk is live.
6. *(optional)* add narration (below).

No local tooling is required to edit — it is plain HTML/CSS/JS.

## Sections, chrome & the overview

Content slides carry Beamer-style chrome: a **headline** (top) showing the current
section, and a **footline** (bottom) showing `author (institution) | title | date · page`.
Both are filled automatically from `window.TALK` and the section structure.

Group slides into a **section** by wrapping them in a horizontal `<section>` with
`data-section`; the slides inside are vertical children, led by a blue divider:

```html
<section data-section="My section">
  <section class="section-divider" data-background-color="#003E74">
    <div class="kicker">Section 3</div><h2>My section</h2>
  </section>
  <section><h2>A slide</h2> … </section>
  <section><h2>Another slide</h2> … </section>
</section>
```

This structure is what makes the **map view** (`Esc` or the grid button) a grid
**grouped by section** (one column per section). Navigation stays 1-D — every arrow steps
the whole sequence — and in the map you **drag to pan, scroll/pinch to zoom, click a slide**.
Title and closing slides use a bare `<section>` (no `data-section`) with
`class="title-slide plain"` and get no chrome.

---

## File structure

```
index.html                 the deck (edit the <section> slides here)
css/theme-cambridge.css     colours & components (change the palette here)
js/talk.js                  reveal.js configuration
js/narration.js             narration playback (load-only)
dist/ , plugin/             vendored reveal.js + chalkboard (offline)
vendor/katex/               vendored KaTeX (offline math)
narration/manifest.json     which audio clips exist, and where
narration/audio/*.m4a        sample narration clips
assets/qr.svg , icon-*.png   QR + PWA icons
sw.js , manifest.webmanifest offline / installable
slides.pdf                   the downloadable handout (see “PDF” below)
```

## Adding a slide

Drop a `<section>` inside one of the `data-section` groups. The `<h2>` is auto-styled
as the frametitle (blue with a rule):

```html
<section>
  <h2>My title</h2>
  <ul><li>point one</li><li class="fragment">revealed on click</li></ul>
  <aside class="notes">speaker notes (S view)</aside>
</section>
```

Helpers available: `.cols` (columns), `.card / .note / .ok / .alert` (callouts),
`.badge`, `<kbd>`, `.qr`. Math: write `$…$` or `$$…$$`.

## Narration (record externally, play here)

The page never records — it **loads** audio you host anywhere (object storage, or this repo).

1. Tag the slides you narrate with `data-audio="somekey"` (any key you like).
2. Record one clip per key (any tool); upload to object storage (Cloudflare R2, S3, …)
   **or** drop them in `narration/audio/`.
3. Map keys → files in `narration/manifest.json`:

```json
{
  "base": "https://cdn.example.com/talk/",
  "clips": { "intro": "s00.m4a", "overview": "s01.m4a", "nav": "s02.m4a" }
}
```

- keys match each slide's **`data-audio`**; values are file names appended to `base`
- if any clips exist, a **▶ Play narrated** button appears; it plays the current slide's clip
  and auto-advances (slides without a clip dwell `dwellMs` then advance)
- **CORS:** if `base` is object storage, that bucket must send
  `Access-Control-Allow-Origin` for your Pages origin, or the browser blocks the audio.

## Offline

On first load a service worker caches the deck; afterwards it runs with **no internet**
(and can be “installed” to the home screen). Narration audio on object storage still needs
the network unless you host the clips in the repo. Bump `CACHE` in `sw.js` when you change assets.

## PDF handout

The floating button serves `slides.pdf`. Regenerate it from the HTML by running:

```bash
./make-pdf.sh
```

It uses [decktape](https://github.com/astefanutti/decktape) when Node is available
(best — handles animations), and otherwise falls back to `make-pdf-cdp.py`, a
standard-library Python exporter that needs only Google Chrome (no Node).

Why a custom exporter and not plain `chrome --print-to-pdf`: reveal.js builds its
print layout in an async coroutine (a few `requestAnimationFrame` yields before the
`.pdf-page` elements exist), so a fire-and-forget `--print-to-pdf` captures too
early and yields a blank one-page file. `make-pdf-cdp.py` drives Chrome over the
DevTools Protocol, waits until the `.pdf-page` wrappers and KaTeX have rendered and
settled, then calls `Page.printToPDF`. It serves the folder itself and uses a fresh
Chrome profile each run so the service worker never serves a previously exported
deck from cache. Override Chrome's path with the `CHROME` env var if needed.

## Regenerate the QR

```bash
python3 -c "import segno; segno.make('https://YOUR.URL/').save('assets/qr.svg', scale=8, dark='#003E74', border=2)"
```

## Keyboard shortcuts

`→ ↓ Space` next · `← ↑` prev · `Esc` map view · `S` speaker ·
`F` fullscreen · `B`/`.` black · `C` pen · `Alt`+click zoom · `?` help
