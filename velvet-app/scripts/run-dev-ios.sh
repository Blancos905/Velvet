#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Un solo flutter run / simctl install alla volta: istanze concorrenti bloccano l'install.
pkill -f "flutter_tools.snapshot run" 2>/dev/null || true
pkill -f "simctl install" 2>/dev/null || true
sleep 1

# Progetti su Desktop/iCloud: xattr (fileprovider) fanno fallire CodeSign iOS.
xattr -cr . 2>/dev/null || true

# build/ios su Desktop/iCloud eredita xattr da fileprovider; symlink a /tmp evita CodeSign fallito.
# In Developer/ o altri path locali usa la build standard (evita linker errori da artefatti /tmp stantii).
IOS_BUILD_LINK="build/ios"
case "$PWD" in
  *"/Desktop/"*|*"/Mobile Documents/"*)
    IOS_BUILD_TMP="${VELVET_IOS_BUILD_DIR:-/tmp/velvet-app-build-ios}"
    mkdir -p "$IOS_BUILD_TMP"
    if [[ ! -L "$IOS_BUILD_LINK" ]]; then
      rm -rf "$IOS_BUILD_LINK"
      ln -s "$IOS_BUILD_TMP" "$IOS_BUILD_LINK"
    fi
    ;;
  *)
    if [[ -L "$IOS_BUILD_LINK" ]]; then
      rm -f "$IOS_BUILD_LINK"
    fi
    # Build Xcode interrotta: Flutter non trova TARGET_BUILD_DIR al run successivo.
    if [[ -d "$IOS_BUILD_LINK" && ! -d "$IOS_BUILD_LINK/Debug-iphonesimulator" ]]; then
      echo "Pulizia build/iOS parziale (evita errore TARGET_BUILD_DIR)..."
      rm -rf "$IOS_BUILD_LINK"
    fi
    ;;
esac

# open -a Simulator non avvia un device: Flutter non vede nulla finché uno non è Booted.
DEFAULT_SIM="${VELVET_IOS_SIMULATOR_ID:-0D2DB2A8-4494-4D6A-808C-28DADB62F48A}"
if ! xcrun simctl list devices booted 2>/dev/null | grep -q Booted; then
  echo "Nessun simulatore avviato: boot di iPhone 17 ($DEFAULT_SIM)..."
  xcrun simctl boot "$DEFAULT_SIM" 2>/dev/null || true
  open -a Simulator
  for _ in $(seq 1 30); do
    xcrun simctl list devices booted 2>/dev/null | grep -q Booted && break
    sleep 1
  done
else
  # Più simulatori booted insieme fanno hangare simctl install: tieni solo il default.
  while IFS= read -r booted_id; do
    [[ -z "$booted_id" || "$booted_id" == "$DEFAULT_SIM" ]] && continue
    xcrun simctl shutdown "$booted_id" 2>/dev/null || true
  done < <(xcrun simctl list devices booted 2>/dev/null | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p')
  if ! xcrun simctl list devices booted 2>/dev/null | grep -q "$DEFAULT_SIM"; then
    xcrun simctl boot "$DEFAULT_SIM" 2>/dev/null || true
  fi
fi

# Mostra sempre la finestra Simulator (altrimenti resta in background senza UI visibile).
open -a Simulator
osascript -e 'tell application "Simulator" to activate' 2>/dev/null || true

FLUTTER_DEFINES=(--dart-define=VELVET_WEB_BASE_URL=http://127.0.0.1:5173)
if [[ "${VELVET_STACK_READY:-0}" == "1" ]]; then
  FLUTTER_DEFINES+=(--dart-define=VELVET_STACK_READY=true)
  echo "✓ Stack dev già verificato da dev-with-frontend (skip probe duplicate)"
else
  echo "Verifica backend Spring (probe /api/v1/public/health)..."
  if ! "$(dirname "$0")/wait-for-backend.sh"; then
    echo ""
    echo "✗ Backend non pronto: le API dall'app falliranno finché Spring Boot non risponde su :8080."
    echo "  Avvia: ./scripts/dev-backend.sh"
    echo ""
    exit 1
  fi

  if ! curl -sf "http://127.0.0.1:5173/" >/dev/null 2>&1; then
    echo ""
    echo "✗ Vite non risponde su http://127.0.0.1:5173"
    echo "  Avvia il frontend: cd velvet-frontend && npm run dev:local"
    echo "  Oppure usa: ./scripts/dev-app-ios.sh"
    echo ""
    exit 1
  fi

  "$(dirname "$0")/wait-for-vite-proxy.sh"
fi

flutter run "${FLUTTER_DEFINES[@]}" "$@"
