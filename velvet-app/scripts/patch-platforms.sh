#!/usr/bin/env bash
# Dopo `flutter create`: cleartext HTTP in dev (Android) e ATS locale (iOS).
set -euo pipefail
cd "$(dirname "$0")/.."

# iOS build fuori da iCloud Desktop (vedi run-dev-ios.sh).
IOS_BUILD_LINK="build/ios"
IOS_BUILD_TMP="${VELVET_IOS_BUILD_DIR:-/tmp/velvet-app-build-ios}"
mkdir -p "$IOS_BUILD_TMP"
if [[ ! -L "$IOS_BUILD_LINK" ]]; then
  rm -rf "$IOS_BUILD_LINK"
  ln -s "$IOS_BUILD_TMP" "$IOS_BUILD_LINK"
fi

ANDROID_MANIFEST="android/app/src/main/AndroidManifest.xml"
if [[ -f "$ANDROID_MANIFEST" ]]; then
  if ! grep -q 'usesCleartextTraffic' "$ANDROID_MANIFEST"; then
    perl -0pi -e 's/<application/<application android:usesCleartextTraffic="true"/' "$ANDROID_MANIFEST"
    echo "Android: usesCleartextTraffic abilitato per dev HTTP (10.0.2.2:5173, LAN)."
  fi
fi

IOS_PLIST="ios/Runner/Info.plist"
if [[ -f "$IOS_PLIST" ]]; then
  if ! grep -q 'NSAllowsLocalNetworking' "$IOS_PLIST"; then
    /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity dict" "$IOS_PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :NSAppTransportSecurity:NSAllowsLocalNetworking bool true" "$IOS_PLIST" 2>/dev/null || \
      /usr/libexec/PlistBuddy -c "Set :NSAppTransportSecurity:NSAllowsLocalNetworking true" "$IOS_PLIST"
    echo "iOS: NSAllowsLocalNetworking abilitato per dev HTTP (127.0.0.1:5173)."
  fi
  if ! grep -q 'NSLocationWhenInUseUsageDescription' "$IOS_PLIST"; then
    /usr/libexec/PlistBuddy -c "Add :NSLocationWhenInUseUsageDescription string Saloni Luxury usa la tua posizione per trovare saloni vicini a te e compilare comune e CAP nella ricerca." "$IOS_PLIST"
    /usr/libexec/PlistBuddy -c "Add :NSLocationAlwaysAndWhenInUseUsageDescription string Saloni Luxury usa la tua posizione per trovare saloni vicini a te e compilare comune e CAP nella ricerca." "$IOS_PLIST"
    echo "iOS: descrizioni permesso posizione aggiunte."
  fi
fi

if [[ -f "$ANDROID_MANIFEST" ]]; then
  if ! grep -q 'ACCESS_FINE_LOCATION' "$ANDROID_MANIFEST"; then
    perl -0pi -e 's|<manifest xmlns:android="http://schemas.android.com/apk/res/android">|<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />|' "$ANDROID_MANIFEST"
    echo "Android: permessi geolocalizzazione aggiunti."
  fi
fi
