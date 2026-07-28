#!/usr/bin/env bash
# App Flutter su iPhone fisico: Vite raggiungibile via IP LAN (npm run dev:local usa --host).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$("$ROOT/scripts/detect-dev-host.sh")"
PORT="${LUXURY_DEV_PORT:-5173}"
WEB_URL="http://${HOST}:${PORT}"

echo "→ Dev host LAN: ${WEB_URL}"
echo "  Vite: cd luxury-frontend && npm run dev:local"
echo "  Backend: ./scripts/dev-backend.sh"
echo "  Sul telefono: accetta «Rete locale» per Luxury App se richiesto."
echo ""

DEVICE="${LUXURY_IOS_DEVICE_ID:-}"
if [[ -z "$DEVICE" ]]; then
  DEVICE="$(cd "$ROOT/luxury-app" && flutter devices 2>/dev/null | awk -F'•' '/ios/ && !/simulator/ {gsub(/^ +| +$/, "", $2); print $2; exit}')"
fi
if [[ -z "$DEVICE" ]]; then
  echo "✗ Nessun iPhone fisico trovato. Collega il telefono o imposta LUXURY_IOS_DEVICE_ID."
  exit 1
fi

echo "→ Device: $DEVICE"
cd "$ROOT/luxury-app"
exec flutter run -d "$DEVICE" \
  --dart-define="LUXURY_WEB_BASE_URL=${WEB_URL}" \
  "$@"
