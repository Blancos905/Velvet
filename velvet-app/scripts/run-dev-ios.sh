#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Progetti su Desktop/iCloud: xattr (fileprovider) fanno fallire CodeSign iOS.
xattr -cr . 2>/dev/null || true

# build/ios su Desktop eredita xattr da iCloud; symlink a /tmp evita CodeSign fallito.
IOS_BUILD_LINK="build/ios"
IOS_BUILD_TMP="${VELVET_IOS_BUILD_DIR:-/tmp/velvet-app-build-ios}"
mkdir -p "$IOS_BUILD_TMP"
if [[ ! -L "$IOS_BUILD_LINK" ]]; then
  rm -rf "$IOS_BUILD_LINK"
  ln -s "$IOS_BUILD_TMP" "$IOS_BUILD_LINK"
fi

# open -a Simulator non avvia un device: Flutter non vede nulla finché uno non è Booted.
if ! xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  DEFAULT_SIM="${VELVET_IOS_SIMULATOR_ID:-3F781F6A-4A79-4B0A-A02C-915E3AA02DA3}"
  echo "Nessun simulatore avviato: boot di iPhone 17 Pro ($DEFAULT_SIM)..."
  xcrun simctl boot "$DEFAULT_SIM" 2>/dev/null || true
  open -a Simulator
  for _ in $(seq 1 30); do
    xcrun simctl list devices booted 2>/dev/null | grep -q Booted && break
    sleep 1
  done
fi

if ! curl -sf "http://127.0.0.1:5173/" >/dev/null 2>&1; then
  echo ""
  echo "⚠ Vite non risponde su http://127.0.0.1:5173"
  echo "  Avvia il frontend: cd velvet-frontend && npm run dev:local"
  echo "  Oppure usa: ./scripts/dev-with-frontend.sh ios"
  echo ""
fi

if ! curl -sf "http://127.0.0.1:8080/actuator/health" >/dev/null 2>&1; then
  echo ""
  echo "⚠ Backend Spring non risponde su http://127.0.0.1:8080"
  echo "  Avvia: cd velvet && ./mvnw spring-boot:run"
  echo "  Senza backend l'app resta lenta (API in timeout/retry)."
  echo ""
fi

flutter run --dart-define=VELVET_WEB_BASE_URL=http://127.0.0.1:5173 "$@"
