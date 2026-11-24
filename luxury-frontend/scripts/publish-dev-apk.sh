#!/usr/bin/env bash
# Pubblica l'APK debug arm64 su Vite: http://<LAN>:5173/dev/install.html
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
APP_DIR="$REPO_ROOT/luxury-app"
OUT_DIR="$ROOT/public/dev"
APK_NAME="saloni-luxury.apk"

detect_host() {
  local h=""
  if [[ -x "$REPO_ROOT/scripts/detect-dev-host.sh" ]]; then
    h="$("$REPO_ROOT/scripts/detect-dev-host.sh" 2>/dev/null || true)"
  fi
  if [[ -z "$h" ]]; then
    h="$(ipconfig getifaddr en0 2>/dev/null || true)"
  fi
  if [[ -z "$h" ]]; then
    h="$(ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  if [[ -z "$h" ]]; then
    echo "Impossibile rilevare IP LAN. Connettiti al Wi‑Fi." >&2
    exit 1
  fi
  echo "$h"
}

HOST="$(detect_host)"
WEB_BASE="http://${HOST}:5173"
BUILD=0
SKIP_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --build) BUILD=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help)
      echo "Usage: $0 [--build|--skip-build]"
      echo "  Default: ricostruisce l'APK se manca o se --build."
      echo "  Link: ${WEB_BASE}/dev/install.html"
      exit 0
      ;;
  esac
done

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Developer/dev/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

SRC_APK="$APP_DIR/build/app/outputs/flutter-apk/app-arm64-v8a-debug.apk"
NEED_BUILD=$BUILD
if [[ "$SKIP_BUILD" -eq 1 ]]; then
  NEED_BUILD=0
elif [[ ! -f "$SRC_APK" ]]; then
  NEED_BUILD=1
fi

if [[ "$NEED_BUILD" -eq 1 ]]; then
  echo "→ Build APK (WebView → ${WEB_BASE})"
  (
    cd "$APP_DIR"
    flutter build apk --debug --split-per-abi \
      --dart-define="LUXURY_WEB_BASE_URL=${WEB_BASE}"
  )
fi

if [[ ! -f "$SRC_APK" ]]; then
  echo "APK non trovato: $SRC_APK" >&2
  echo "Rilancia con --build" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp -f "$SRC_APK" "$OUT_DIR/$APK_NAME"
SIZE="$(stat -f%z "$OUT_DIR/$APK_NAME" 2>/dev/null || stat -c%s "$OUT_DIR/$APK_NAME")"
MB=$((SIZE / 1024 / 1024))

# Marker leggibile da install.html / operatori
cat > "$OUT_DIR/apk-meta.json" <<EOF
{
  "file": "${APK_NAME}",
  "bytes": ${SIZE},
  "webBaseUrl": "${WEB_BASE}",
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "${HOST}"
}
EOF

echo
echo "✓ APK pubblicato (~${MB} MB)"
echo "  Pagina:  ${WEB_BASE}/dev/install.html"
echo "  File:    ${WEB_BASE}/dev/${APK_NAME}"
echo
echo "Sul telefono (Chrome, stesso Wi‑Fi): apri la pagina e tocca Scarica APK."
echo "Serve: npm run dev (Vite) + backend su :8081."
