#!/usr/bin/env bash
#
# Legacy: installa Android SDK + Flutter su disco esterno.
# Su Mac interno preferisci: ./scripts/setup-android-dev.sh
#
# Uso:
#   VELVET_DEV_ROOT=/Volumes/Elements/dev ./scripts/setup-android-external-disk.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=android-env.sh
source "$ROOT_DIR/scripts/android-env.sh"

# Forza disco esterno se non già impostato
export VELVET_DEV_ROOT="${VELVET_DEV_ROOT:-/Volumes/Elements/dev}"

BREW_SDK="/opt/homebrew/share/android-commandlinetools"
CMDLINE_BIN="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

echo "Disco esterno: $VELVET_DEV_ROOT"
if [[ ! -d "$VELVET_DEV_ROOT" ]]; then
  echo "Monta il disco esterno (es. /Volumes/Elements) e riprova." >&2
  exit 1
fi

mkdir -p "$VELVET_DEV_ROOT/android-sdk/cmdline-tools" \
  "$VELVET_DEV_ROOT/flutter-cache/pub" \
  "$VELVET_DEV_ROOT/flutter-cache/gradle"

# --- Flutter su disco esterno (symlink ~/development/flutter) ---
_FLUTTER_HOME="$VELVET_DEV_ROOT/flutter"
_FLUTTER_LINK="$HOME/development/flutter"

if [[ -d "$_FLUTTER_LINK" && ! -L "$_FLUTTER_LINK" ]]; then
  echo "▶ Sposto Flutter su disco esterno…"
  cd / || cd "$ROOT_DIR"
  rm -rf "$_FLUTTER_HOME"
  mv "$_FLUTTER_LINK" "$_FLUTTER_HOME"
elif [[ ! -d "$_FLUTTER_HOME/bin" ]]; then
  echo "▶ Clone Flutter stable su disco esterno…"
  git clone https://github.com/flutter/flutter.git -b stable --depth 1 "$_FLUTTER_HOME"
fi

cd "$ROOT_DIR"

mkdir -p "$(dirname "$_FLUTTER_LINK")"
ln -sfn "$_FLUTTER_HOME" "$_FLUTTER_LINK"
export PATH="$_FLUTTER_LINK/bin:$PATH"

# --- Android command-line tools su disco esterno ---
if [[ ! -x "$CMDLINE_BIN" ]]; then
  if [[ -d "$BREW_SDK/cmdline-tools/latest/bin" ]]; then
    echo "▶ Copio Android cmdline-tools su disco esterno…"
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

fix_exfat_sdk_nesting() {
  local root="$1"
  if [[ -f "$root/platform-tools/platform-tools/adb" && ! -f "$root/platform-tools/adb" ]]; then
    echo "▶ Correggo platform-tools (exFAT)…"
    mv "$root/platform-tools/platform-tools/"* "$root/platform-tools/"
    rmdir "$root/platform-tools/platform-tools" 2>/dev/null || true
  fi
  local platform_dir
  for platform_dir in "$root/platforms"/android-*; do
    [[ -d "$platform_dir" ]] || continue
    local name
    name="$(basename "$platform_dir")"
    if [[ -f "$platform_dir/$name/android.jar" && ! -f "$platform_dir/android.jar" ]]; then
      echo "▶ Correggo platforms/$name (exFAT)…"
      mv "$platform_dir/$name/"* "$platform_dir/"
      rmdir "$platform_dir/$name" 2>/dev/null || true
    fi
  done
  local bt_dir sub
  for bt_dir in "$root/build-tools"/*; do
    [[ -d "$bt_dir" ]] || continue
    if [[ ! -f "$bt_dir/aapt" ]]; then
      for sub in "$bt_dir"/*; do
        [[ -d "$sub" && -f "$sub/aapt" ]] || continue
        echo "▶ Correggo build-tools/$(basename "$bt_dir") (exFAT)…"
        mv "$sub/"* "$bt_dir/"
        rmdir "$sub" 2>/dev/null || true
        break
      done
    fi
  done
}

echo "▶ Scarico platform-tools, build-tools, android-36…"
sdkmanager --sdk_root="$ANDROID_HOME" \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;28.0.3" \
  "build-tools;35.0.0"

fix_exfat_sdk_nesting "$ANDROID_HOME"

echo "▶ Configuro Flutter…"
flutter config --android-sdk "$ANDROID_HOME" >/dev/null
flutter precache --android --no-ios --no-web 2>&1 | tail -5

echo ""
flutter doctor -v 2>&1 | head -40

echo ""
echo "✔ Toolchain su disco esterno:"
echo "  ANDROID_SDK_ROOT=$ANDROID_HOME"
echo "  Flutter:          $_FLUTTER_HOME"
echo "  PUB_CACHE:        $PUB_CACHE"
echo "  GRADLE_USER_HOME: $GRADLE_USER_HOME"
echo ""
echo "Prossimo passo:"
echo "  cd $ROOT_DIR && ./scripts/build-android-release.sh"
