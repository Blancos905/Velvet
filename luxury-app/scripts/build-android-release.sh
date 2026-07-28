#!/usr/bin/env bash
#
# Build AAB firmato per Google Play (release + LUXURY_WEB_BASE_URL produzione).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGINAL_ROOT="$ROOT_DIR"
cd "$ROOT_DIR"

# shellcheck source=android-env.sh
source "$ROOT_DIR/scripts/android-env.sh"

KEY_PROPS="$ROOT_DIR/android/key.properties"
KEYSTORE="$ROOT_DIR/android/upload-keystore.jks"
WEB_BASE_URL="${LUXURY_WEB_BASE_URL:-https://www.saloniluxury.it}"

if [[ ! -f "$KEY_PROPS" || ! -f "$KEYSTORE" ]]; then
  echo "Manca la firma release Android." >&2
  echo "Esegui prima: ./scripts/setup-android-release-signing.sh" >&2
  exit 1
fi

if [[ "$WEB_BASE_URL" == *"localhost"* || "$WEB_BASE_URL" == *"127.0.0.1"* || "$WEB_BASE_URL" == *"10.0.2.2"* ]]; then
  echo "LUXURY_WEB_BASE_URL non deve puntare a localhost per Play Store: $WEB_BASE_URL" >&2
  exit 1
fi

# Workaround legacy: sorgente su exFAT (disco esterno) rompe Gradle/Flutter.
WORK_DIR="${LUXURY_ANDROID_WORK_DIR:-$HOME/tmp/luxury-app-work}"
if [[ "$ROOT_DIR" == /Volumes/* ]]; then
  echo "▶ Copia sorgente su disco interno ($WORK_DIR)…"
  mkdir -p "$WORK_DIR"
  rsync -a --delete \
    --exclude 'build/' --exclude '.dart_tool/' \
    --exclude 'android/upload-keystore.jks' --exclude 'android/key.properties' \
    "$ROOT_DIR/" "$WORK_DIR/"
  cp "$KEY_PROPS" "$KEYSTORE" "$WORK_DIR/android/"
  cd "$WORK_DIR"
  ROOT_DIR="$WORK_DIR"
fi

echo "▶ flutter build appbundle --release"
echo "  LUXURY_WEB_BASE_URL=$WEB_BASE_URL"
echo "  ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo "  WORK_DIR=$ROOT_DIR"
echo ""

if [[ ! -d "$ANDROID_SDK_ROOT/platform-tools" ]]; then
  echo "Android SDK non trovato: $ANDROID_SDK_ROOT" >&2
  echo "Esegui: ./scripts/setup-android-dev.sh" >&2
  exit 1
fi

flutter build appbundle --release \
  --dart-define="LUXURY_WEB_BASE_URL=$WEB_BASE_URL"

OUT="$ROOT_DIR/build/app/outputs/bundle/release/app-release.aab"
DEST="$ORIGINAL_ROOT/build/app/outputs/bundle/release/app-release.aab"
if [[ -f "$OUT" ]]; then
  mkdir -p "$(dirname "$DEST")"
  cp "$OUT" "$DEST"
  echo ""
  echo "✔ AAB pronto: $DEST"
  echo "  (work dir: $ROOT_DIR)"
  echo "  Carica su Play Console → Produzione / test interno."
fi
