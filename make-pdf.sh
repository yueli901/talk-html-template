#!/usr/bin/env bash
# Export slides.pdf from index.html (the HTML is the single source of truth).
#
# reveal.js builds its print layout in an async coroutine (three
# requestAnimationFrame yields before the .pdf-page elements exist), so a plain
# headless `--print-to-pdf` fires too early and produces a blank one-page file.
# Both methods below drive the browser and wait for that layout to finish:
#   1. decktape  (preferred; needs Node) — handles animations
#   2. make-pdf-cdp.py (bundled; standard-library Python, no Node) — drives
#      Chrome over the DevTools Protocol, waits for .pdf-page + KaTeX, then prints
set -e
cd "$(dirname "$0")"

if command -v npx >/dev/null 2>&1; then
  PORT="${PORT:-8123}"
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  SRV=$!
  trap 'kill $SRV 2>/dev/null' EXIT
  sleep 1
  npx decktape reveal "http://localhost:$PORT/index.html" slides.pdf
else
  echo "Node/decktape not found — using the bundled CDP exporter (no Node needed)."
  python3 make-pdf-cdp.py
fi
echo "wrote slides.pdf"
