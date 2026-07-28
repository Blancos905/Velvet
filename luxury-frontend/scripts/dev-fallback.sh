#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${LUXURY_DEV_PORT:-5173}"
pkill -f "node_modules/.bin/vite" 2>/dev/null || true
lsof -ti ":$PORT" | xargs kill -9 2>/dev/null || true
if [[ ! -f dist/index.html ]]; then
  echo "dist/ mancante → npm run build (può richiedere tempo sul Desktop iCloud)"
  exit 1
fi
exec python3 scripts/dev-fallback.py
