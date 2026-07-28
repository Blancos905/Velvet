#!/usr/bin/env bash
# App Flutter su Android fisico: usa IP LAN del Mac (non 10.0.2.2, riservato all'emulatore).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$("$ROOT/scripts/detect-dev-host.sh")"
PORT="${LUXURY_DEV_PORT:-5173}"
WEB_URL="http://${HOST}:${PORT}"

echo "→ Dev host LAN (Android fisico): ${WEB_URL}"
echo "  Vite: cd luxury-frontend && npm run dev:local  (espone --host)"
echo "  Backend: ./scripts/dev-backend.sh"
echo ""

cd "$ROOT/luxury-app"
exec flutter run --dart-define=LUXURY_WEB_BASE_URL="${WEB_URL}" "$@"
