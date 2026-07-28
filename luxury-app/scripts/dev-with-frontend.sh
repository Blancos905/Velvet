#!/usr/bin/env bash
# Avvia luxury-frontend (Vite) e l'app Flutter in dev. Richiede Flutter + simulatore/emulatore.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT/luxury-frontend"

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter non trovato. Esegui prima: cd luxury-app && ./scripts/setup-flutter.sh"
  exit 1
fi

if [[ ! -d "$APP_DIR/android" || ! -d "$APP_DIR/ios" ]]; then
  echo "Piattaforme mancanti. Esegui: cd luxury-app && ./scripts/setup-flutter.sh"
  exit 1
fi

cleanup() {
  [[ -n "${VITE_PID:-}" ]] && kill "$VITE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$APP_DIR/scripts/wait-for-backend.sh"

echo "Avvio luxury-frontend (dev:local → cache /tmp, evita lentezza iCloud) su :5173..."
(cd "$FRONTEND_DIR" && npm run dev:local) &
VITE_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:5173/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

"$APP_DIR/scripts/wait-for-vite-proxy.sh"

export LUXURY_STACK_READY=1

PLATFORM="${1:-ios}"
shift || true
case "$PLATFORM" in
  android)
    exec "$APP_DIR/scripts/run-dev-android.sh" "$@"
    ;;
  ios)
    exec "$APP_DIR/scripts/run-dev-ios.sh" "$@"
    ;;
  *)
    echo "Uso: $0 [ios|android] [argomenti flutter run...]"
    exit 1
    ;;
esac
