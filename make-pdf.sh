#!/usr/bin/env bash
# Export slides.pdf from index.html (the HTML is the single source of truth).
#
# Preferred (handles animations, needs Node):
#   npx decktape reveal "http://localhost:8123/index.html" slides.pdf
#
# Fallback below uses headless Chrome. Looping animations are hidden in print
# media (see .anim-demo in css/theme-cambridge.css) so the export settles.
set -e
PORT="${PORT:-8123}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
cd "$(dirname "$0")"

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --no-sandbox \
  --no-pdf-header-footer --print-to-pdf="slides.pdf" \
  "http://localhost:$PORT/index.html?print-pdf"

echo "wrote slides.pdf"
