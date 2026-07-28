#!/usr/bin/env bash
# Avvio Flutter iOS in dev con verifica catena Vite → Spring.
# Usa questo al posto di `flutter run --dart-define=...` a mano.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$ROOT/luxury-app/scripts/run-dev-ios.sh" "$@"
