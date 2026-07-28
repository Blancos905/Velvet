#!/usr/bin/env bash
# Abilita entitlements Push (aps-environment) per build iOS Debug.
#
# Richiede Apple Developer Program a pagamento ($99/anno): i team personali/gratuiti
# NON supportano Push Notifications e Xcode fallisce il CodeSign.
#
# Uso (solo con account Developer pagato + chiave APNs su Firebase):
#   ./scripts/enable-ios-push-entitlements.sh
#   flutter run -d <iphone> --dart-define=LUXURY_WEB_BASE_URL=http://<LAN>:5173
#
# Per tornare a build su team personale (senza push iOS):
#   ./scripts/disable-ios-push-entitlements.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

PBXPROJ="ios/Runner.xcodeproj/project.pbxproj"
MARKER='CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements;'

if grep -qF "$MARKER" "$PBXPROJ"; then
  echo "Push entitlements già abilitati su Debug in $PBXPROJ"
  exit 0
fi

perl -0pi -e '
  s/(97C147061CF9000F007C117D \/\* Debug \*\/ = \{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = 9740EEB21CF90195004384FC \/\* Debug.xcconfig \*\/;\n\t\t\tbuildSettings = \{\n\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCLANG_ENABLE_MODULES = YES;\n)/$1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = Runner\/Runner.entitlements;\n/s
' "$PBXPROJ"

echo "Push entitlements abilitati su Debug."
echo "Serve Apple Developer Program a pagamento; altrimenti usa ./scripts/disable-ios-push-entitlements.sh"
