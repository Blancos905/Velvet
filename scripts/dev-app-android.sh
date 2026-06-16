#!/usr/bin/env bash
# Avvio dev orchestrato per Android: attende/avvia Spring Boot, poi Vite + Flutter WebView.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/velvet-app/scripts/dev-with-frontend.sh" android "$@"
