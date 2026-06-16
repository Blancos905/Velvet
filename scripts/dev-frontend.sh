#!/usr/bin/env bash
# Avvia Vite su :5173. Usa cache /tmp (veloce anche se il repo è su iCloud/Desktop).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/velvet-frontend"
exec npm run dev:local
