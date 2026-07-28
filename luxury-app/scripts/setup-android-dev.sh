#!/usr/bin/env bash
#
# Installa Android SDK + Flutter su disco interno (default: ~/Developer/dev).
#
# Uso:
#   ./scripts/setup-android-dev.sh
#   LUXURY_DEV_ROOT=$HOME/altro/dev ./scripts/setup-android-dev.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT_DIR/scripts/android-env.sh"

BREW_SDK="/opt/homebrew/share/android-commandlinetools"
CMDLINE_BIN="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

echo "Dev root: $LUXURY_DEV_ROOT"
mkdir -p "$LUXURY_DEV_ROOT/android-sdk/cmdline-tools" \
  "$LUXURY_DEV_ROOT/flutter-cache/pub"

_FLUTTER_HOME="$LUXURY_DEV_ROOT/flutter"
_FLUTTER_LINK="$HOME/development/flutter"

if [[ -d "$_FLUTTER_LINK" && ! -L "$_FLUTTER_LINK" ]]; then
  echo "▶ Sposto Flutter installato in $_FLUTTER_LINK → $_FLUTTER_HOME…"
  rm -rf "$_FLUTTER_HOME"
  mv "$_FLUTTER_LINK" "$_FLUTTER_HOME"
elif [[ ! -d "$_FLUTTER_HOME/bin" ]]; then
  echo "▶ Clone Flutter stable…"
  git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$_FLUTTER_HOME"
fi

cd "$ROOT_DIR"

mkdir -p "$(dirname "$_FLUTTER_LINK")"
ln -sfn "$_FLUTTER_HOME" "$_FLUTTER_LINK"
export PATH="$_FLUTTER_LINK/bin:$PATH"

if [[ ! -x "$CMDLINE_BIN" ]]; then
  if [[ -d "$BREW_SDK/cmdline-tools/latest/bin" ]]; then
    echo "▶ Copio Android cmdline-tools…"
    rm -rf "$ANDROID_HOME/cmdline-tools/latest"
    cp -R "$BREW_SDK/cmdline-tools/latest" "$ANDROID_HOME/cmdline-tools/"
    if [[ -d "$BREW_SDK/licenses" ]]; then
      cp -R "$BREW_SDK/licenses" "$ANDROID_HOME/"
    fi
  else
    echo "Installa prima: brew install --cask android-commandlinetools" >&2
    exit 1
  fi
fi

echo "▶ Accetto licenze SDK…"
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses >/dev/null 2>&1 || true

echo "▶ Scarico platform-tools, build-tools, android-36…"
sdkmanager --sdk_root="$ANDROID_HOME" \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;28.0.3" \
  "build-tools;35.0.0"

echo "▶ Configuro Flutter…"
flutter config --android-sdk "$ANDROID_HOME" >/dev/null
flutter precache --android --no-ios --no-web 2>&1 | tail -5

echo ""
flutter doctor -v 2>&1 | head -40

echo ""
echo "✔ Toolchain su disco interno:"
echo "  ANDROID_SDK_ROOT=$ANDROID_HOME"
echo "  Flutter:          $_FLUTTER_HOME"
echo "  PUB_CACHE:        $PUB_CACHE"
echo "  GRADLE_USER_HOME: $GRADLE_USER_HOME"
echo ""
echo "Prossimo passo:"
echo "  cd $ROOT_DIR && flutter pub get && ./scripts/build-android-release.sh"
