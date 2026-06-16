#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Verifica backend Spring (probe /api/v1/public/health)..."
if ! "$(dirname "$0")/wait-for-backend.sh"; then
  echo ""
  echo "⚠ Backend non pronto: l'app mostrerà un avviso finché Spring Boot non risponderà."
  echo ""
fi

flutter run --dart-define=VELVET_WEB_BASE_URL=http://10.0.2.2:5173 "$@"
