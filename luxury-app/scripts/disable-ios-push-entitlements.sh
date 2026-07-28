#!/usr/bin/env bash
# Rimuove entitlements Push da Debug (default per team Apple personale/gratuito).
set -euo pipefail
cd "$(dirname "$0")/.."

PBXPROJ="ios/Runner.xcodeproj/project.pbxproj"
MARKER='				CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;'

if ! grep -qF "$MARKER" "$PBXPROJ"; then
  echo "Push entitlements già disabilitati su Debug."
  exit 0
fi

perl -0pi -e 's/\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = Runner\/Runner.entitlements;//' "$PBXPROJ"

echo "Push entitlements disabilitati su Debug — flutter run funziona con team personale."
echo "Push iOS reali richiedono account Developer pagato + ./scripts/enable-ios-push-entitlements.sh"
