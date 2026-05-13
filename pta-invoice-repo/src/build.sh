#!/usr/bin/env bash
# Rebuild ../index.html from src/template.html + src/fonts/noto-sans-merged.ttf.
#
# Requirements:
#   - Python 3.7+
#   - base64 (on macOS or Linux; both 'base64 -w0' and plain 'base64' fall back)
set -euo pipefail

cd "$(dirname "$0")"

FONT_TTF="fonts/noto-sans-merged.ttf"
FONT_B64="fonts/noto.b64"

if [ ! -f "$FONT_TTF" ]; then
  echo "Missing $FONT_TTF" >&2
  exit 1
fi

# Encode the font as one base64 line. GNU base64 supports -w0; macOS base64
# does not, so we pipe through tr -d to strip newlines either way.
base64 "$FONT_TTF" | tr -d '\n' > "$FONT_B64"

python3 assemble.py

echo "Done. Commit the updated ../index.html."
