#!/usr/bin/env bash
# App Flutter su Android fisico: usa IP LAN del Mac (non 10.0.2.2, riservato all'emulatore).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$("$ROOT/scripts/detect-dev-host.sh")"
PORT="${VELVET_DEV_PORT:-5173}"
WEB_URL="http://${HOST}:${PORT}"

echo "→ Dev host LAN (Android fisico): ${WEB_URL}"
echo "  Vite: cd velvet-frontend && npm run dev:local  (espone --host)"
echo "  Backend: ./scripts/dev-backend.sh"
echo ""

cd "$ROOT/velvet-app"
exec flutter run --dart-define=VELVET_WEB_BASE_URL="${WEB_URL}" "$@"
