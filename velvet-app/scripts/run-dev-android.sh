#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
flutter run --dart-define=VELVET_WEB_BASE_URL=http://10.0.2.2:5173 "$@"
