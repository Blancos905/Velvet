#!/usr/bin/env bash
#
# Ripristina luxury-app dal clone su disco esterno Elements.
# Preserva keystore e key.properties già creati in locale.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ROOT="${LUXURY_ELEMENTS_REPO:-/Volumes/Elements/Developer/Luxury/my-salon-platform}"
SOURCE="$SOURCE_ROOT/luxury-app"
BACKUP_DIR="$(mktemp -d)"

if [[ ! -f "$SOURCE/pubspec.yaml" ]]; then
  echo "Sorgente non trovata: $SOURCE/pubspec.yaml" >&2
  echo "Monta Elements e verifica LUXURY_ELEMENTS_REPO." >&2
  exit 1
fi

for f in android/upload-keystore.jks android/key.properties; do
  if [[ -f "$ROOT_DIR/$f" ]]; then
    cp "$ROOT_DIR/$f" "$BACKUP_DIR/$(basename "$f")"
  fi
done

echo "▶ Copia da $SOURCE → $ROOT_DIR"
rsync -a --delete \
  --exclude 'build/' \
  --exclude '.dart_tool/' \
  --exclude 'android/upload-keystore.jks' \
  --exclude 'android/key.properties' \
  "$SOURCE/" "$ROOT_DIR/"

if [[ -f "$BACKUP_DIR/upload-keystore.jks" ]]; then
  cp "$BACKUP_DIR/upload-keystore.jks" "$ROOT_DIR/android/upload-keystore.jks"
fi
if [[ -f "$BACKUP_DIR/key.properties" ]]; then
  cp "$BACKUP_DIR/key.properties" "$ROOT_DIR/android/key.properties"
  chmod 600 "$ROOT_DIR/android/key.properties" 2>/dev/null || true
fi

# Script toolchain disco esterno (non nel clone Elements).
for script in android-env.sh setup-android-external-disk.sh restore-luxury-app-from-elements.sh; do
  if [[ -f "$SOURCE/scripts/$script" ]]; then
    continue
  fi
done

rm -rf "$BACKUP_DIR"

echo ""
echo "✔ luxury-app ripristinato."
if [[ -f "$ROOT_DIR/pubspec.yaml" ]]; then
  echo "  pubspec.yaml: OK"
else
  echo "  ERRORE: pubspec.yaml mancante" >&2
  exit 1
fi
if [[ -f "$ROOT_DIR/android/upload-keystore.jks" ]]; then
  echo "  keystore locale: conservato"
else
  echo "  keystore: assente — esegui ./scripts/setup-android-release-signing.sh"
fi
echo ""
echo "Prossimo passo:"
echo "  ./scripts/build-android-release.sh"
