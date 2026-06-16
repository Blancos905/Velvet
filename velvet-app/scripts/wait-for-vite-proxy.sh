#!/usr/bin/env bash
# Attende che Vite inoltri /api verso Spring (catena WebView → :5173 → :8080).
set -euo pipefail

VITE_URL="${VELVET_VITE_URL:-http://127.0.0.1:5173}"
VITE_URL="${VITE_URL%/}"
HEALTH_PATH="/api/v1/public/health"
PROXY_HEALTH_URL="${VITE_URL}${HEALTH_PATH}"
MAX_WAIT_SEC="${VELVET_VITE_PROXY_WAIT_SEC:-60}"
INTERVAL_SEC=1

vite_proxy_healthy() {
  curl -sf --max-time 4 "${PROXY_HEALTH_URL}" >/dev/null 2>&1
}

if vite_proxy_healthy; then
  echo "✓ Proxy Vite → Spring OK su ${PROXY_HEALTH_URL}"
  exit 0
fi

echo "Attendo proxy Vite (${PROXY_HEALTH_URL})..."
elapsed=0
while [[ "$elapsed" -lt "$MAX_WAIT_SEC" ]]; do
  if vite_proxy_healthy; then
    echo "✓ Proxy Vite pronto (${elapsed}s)"
    exit 0
  fi
  sleep "$INTERVAL_SEC"
  elapsed=$((elapsed + INTERVAL_SEC))
done

echo ""
echo "✗ Timeout: proxy Vite non inoltra /api verso Spring entro ${MAX_WAIT_SEC}s."
echo "  Verifica che Vite sia avviato su ${VITE_URL} e Spring su :8080."
exit 1
