#!/usr/bin/env bash
# App Flutter su iPhone fisico: Vite raggiungibile via IP LAN (npm run dev:local usa --host).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$("$ROOT/scripts/detect-dev-host.sh")"
PORT="${VELVET_DEV_PORT:-5173}"
WEB_URL="http://${HOST}:${PORT}"

echo "→ Dev host LAN: ${WEB_URL}"
echo "  Vite: cd velvet-frontend && npm run dev:local"
echo "  Backend: ./scripts/dev-backend.sh"
echo "  Sul telefono: accetta «Rete locale» per Velvet App se richiesto."
echo ""

DEVICE="${VELVET_IOS_DEVICE_ID:-}"
if [[ -z "$DEVICE" ]]; then
  DEVICE="$(cd "$ROOT/velvet-app" && flutter devices 2>/dev/null | awk -F'•' '/ios/ && !/simulator/ {gsub(/^ +| +$/, "", $2); print $2; exit}')"
fi
if [[ -z "$DEVICE" ]]; then
  echo "✗ Nessun iPhone fisico trovato. Collega il telefono o imposta VELVET_IOS_DEVICE_ID."
  exit 1
fi

echo "→ Device: $DEVICE"
cd "$ROOT/velvet-app"
exec flutter run -d "$DEVICE" \
  --dart-define="VELVET_WEB_BASE_URL=${WEB_URL}" \
  "$@"
