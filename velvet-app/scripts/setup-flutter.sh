#!/usr/bin/env bash
# Genera cartelle android/ios e risolve dipendenze (richiede Flutter in PATH).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v flutter >/dev/null 2>&1; then
  echo "Flutter non trovato. Installa da https://docs.flutter.dev/get-started/install"
  echo "  oppure: brew install --cask flutter"
  exit 1
fi

flutter --version
flutter create . --org it.saloniluxury --project-name velvet_app --platforms=android,ios
flutter pub get
./scripts/patch-platforms.sh
echo "OK. Dev completo (Vite + app): ./scripts/dev-with-frontend.sh ios"
echo "    Solo app Android: ./scripts/run-dev-android.sh"
