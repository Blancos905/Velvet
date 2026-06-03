#!/usr/bin/env bash
# Dev server quando il repo è sul Desktop/iCloud.
#
# Problema: iCloud "tocca" di continuo i file di config (.env*, vite.config.ts, tsconfig*)
# e Vite, vedendoli cambiare, RIAVVIA il server in loop. In più il filesystem iCloud è lento
# (avvio nell'ordine dei minuti).
#
# Soluzione: una working copy su disco locale (/tmp).
#   - config + .env*  -> COPIATI in /tmp  => iCloud non li tocca più, niente loop di restart
#   - src + public    -> SYMLINK al repo  => l'hot-reload delle tue modifiche continua a funzionare
#   - node_modules    -> SYMLINK al repo  => nessuna reinstallazione
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_ROOT="${VELVET_VITE_RUN_ROOT:-/tmp/velvet-frontend-dev}"
PORT="${VELVET_DEV_PORT:-5173}"

echo "→ Preparo working copy locale in $RUN_ROOT (evita lentezza/loop di iCloud)..."
rm -rf "$RUN_ROOT"
mkdir -p "$RUN_ROOT"

# File di config e .env: COPIATI (così iCloud non li "tocca" facendo riavviare Vite).
for f in \
  package.json package-lock.json index.html \
  vite.config.ts vitest.config.ts \
  tsconfig.json tsconfig.app.json tsconfig.node.json \
  tailwind.config.js postcss.config.js eslint.config.js \
  .env .env.local .env.development .env.production; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$RUN_ROOT/$f"
done

# Sorgenti e asset: SYMLINK (così le modifiche nel repo sono viste subito da Vite / HMR).
ln -snf "$ROOT/src" "$RUN_ROOT/src"
ln -snf "$ROOT/public" "$RUN_ROOT/public"
ln -snf "$ROOT/node_modules" "$RUN_ROOT/node_modules"

# Cache/pre-bundle di Vite su disco locale, fuori dal Desktop/iCloud.
export VELVET_VITE_CACHE_DIR="${VELVET_VITE_CACHE_DIR:-/tmp/velvet-vite-cache}"

# Libera la porta se un'istanza precedente è rimasta appesa.
lsof -ti ":$PORT" | xargs kill -9 2>/dev/null || true

echo "→ Avvio Vite su http://localhost:$PORT"
cd "$RUN_ROOT"
exec npx vite --host --strictPort --port "$PORT"
