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
| Menu / overview | ☰ button or `M`; `Esc` for the grid |
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
2. Edit the `<section>` slides in **`index.html`**.
3. Put figures in **`assets/`**; regenerate the QR (below) to point at your URL.
4. **Settings → Pages → Deploy from branch → `main` / `root`.** Done — your talk is live.
5. *(optional)* add narration (below).

No local tooling is required to edit — it is plain HTML/CSS/JS.

---

## File structure

```
index.html                 the deck (edit the <section> slides here)
css/theme-cambridge.css     colours & components (change the palette here)
js/talk.js                  reveal.js configuration
js/narration.js             narration playback (load-only)
dist/ , plugin/             vendored reveal.js + menu/chalkboard (offline)
vendor/katex/               vendored KaTeX (offline math)
narration/manifest.json     which audio clips exist, and where
narration/audio/*.m4a        sample narration clips
assets/qr.svg , icon-*.png   QR + PWA icons
sw.js , manifest.webmanifest offline / installable
slides.pdf                   the downloadable handout (see “PDF” below)
```

## Adding a slide

Drop a `<section>` into `index.html`:

```html
<section>
  <h2 class="ruled">My title</h2>
  <ul><li>point one</li><li class="fragment">revealed on click</li></ul>
</section>
```

Helpers available: `.cols` (columns), `.card / .note / .ok / .alert` (callouts),
`.badge`, `<kbd>`, `.qr`. Math: write `$…$` or `$$…$$`.

## Narration (record externally, play here)

The page never records — it **loads** audio you host anywhere (object storage, or this repo).

1. Record one clip per slide (any tool). Name them e.g. `s00.m4a`, `s01.m4a`, …
2. Upload them to object storage (Cloudflare R2, S3, …) **or** drop them in `narration/audio/`.
3. List them in `narration/manifest.json`:

```json
{
  "base": "https://cdn.example.com/talk/",
  "clips": { "0": "s00.m4a", "1": "s01.m4a", "2": "s02.m4a" }
}
```

- keys are **slide indices** (0-based); values are file names appended to `base`
- if any clips exist, a **▶ Play narrated** button appears; it plays each slide’s clip
  and auto-advances (slides without a clip dwell `dwellMs` then advance)
- **CORS:** if `base` is object storage, that bucket must send
  `Access-Control-Allow-Origin` for your Pages origin, or the browser blocks the audio.

## Offline

On first load a service worker caches the deck; afterwards it runs with **no internet**
(and can be “installed” to the home screen). Narration audio on object storage still needs
the network unless you host the clips in the repo. Bump `CACHE` in `sw.js` when you change assets.

## PDF handout

The floating button serves `slides.pdf`. Regenerate it from the HTML with
[decktape](https://github.com/astefanutti/decktape) (recommended — handles animations):

```bash
npx decktape reveal "http://localhost:8123/index.html" slides.pdf
```

or run `./make-pdf.sh` (headless Chrome; it hides looping animations for the export).

## Regenerate the QR

```bash
python3 -c "import segno; segno.make('https://YOUR.URL/').save('assets/qr.svg', scale=8, dark='#003E74', border=2)"
```

## Keyboard shortcuts

`→ ↓ Space` next · `← ↑` prev · `Esc` overview · `M` menu · `S` speaker ·
`F` fullscreen · `B`/`.` black · `C` pen · `Alt`+click zoom · `?` help
