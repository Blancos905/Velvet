# shellcheck shell=bash
# Toolchain Android/Flutter su disco interno (Mac). Source: . scripts/android-env.sh
#
# Override:
#   export VELVET_DEV_ROOT="$HOME/altro/percorso/dev"

VELVET_DEV_ROOT="${VELVET_DEV_ROOT:-$HOME/Developer/dev}"

export ANDROID_HOME="${ANDROID_HOME:-$VELVET_DEV_ROOT/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PUB_CACHE="${PUB_CACHE:-$VELVET_DEV_ROOT/flutter-cache/pub}"
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$HOME/.gradle-velvet-android}"
export TMPDIR="${TMPDIR:-$HOME/tmp/velvet-build}"
mkdir -p "$TMPDIR" "$GRADLE_USER_HOME" "$PUB_CACHE"

_FLUTTER_HOME="$VELVET_DEV_ROOT/flutter"
_FLUTTER_LINK="$HOME/development/flutter"

if [[ -d "$_FLUTTER_HOME/bin" ]]; then
  mkdir -p "$(dirname "$_FLUTTER_LINK")"
  if [[ -L "$_FLUTTER_LINK" && "$(readlink "$_FLUTTER_LINK")" != "$_FLUTTER_HOME" ]]; then
    ln -sfn "$_FLUTTER_HOME" "$_FLUTTER_LINK"
  elif [[ ! -e "$_FLUTTER_LINK" ]]; then
    ln -s "$_FLUTTER_HOME" "$_FLUTTER_LINK"
  fi
fi

if [[ -d "$_FLUTTER_LINK/bin" ]]; then
  export PATH="$_FLUTTER_LINK/bin:$PATH"
elif [[ -d "$_FLUTTER_HOME/bin" ]]; then
  export PATH="$_FLUTTER_HOME/bin:$PATH"
fi

if [[ -d "$ANDROID_HOME/cmdline-tools/latest/bin" ]]; then
  export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
fi

# Compat: script legacy che usavano VELVET_EXTERNAL_DEV_ROOT
VELVET_EXTERNAL_DEV_ROOT="$VELVET_DEV_ROOT"
