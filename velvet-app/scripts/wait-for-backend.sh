#!/usr/bin/env bash
# Attende che Spring Boot risponda su :8080 (proxy target Vite in dev).
set -euo pipefail

BACKEND_URL="${VELVET_PROXY_API_TARGET:-http://127.0.0.1:8080}"
BACKEND_URL="${BACKEND_URL%/}"
MAX_WAIT_SEC="${VELVET_BACKEND_WAIT_SEC:-180}"
INTERVAL_SEC=2

if curl -sf "${BACKEND_URL}/actuator/health" >/dev/null 2>&1; then
  echo "✓ Backend Spring raggiungibile su ${BACKEND_URL}"
  exit 0
fi

echo "⚠ Backend non raggiungibile su ${BACKEND_URL}"
echo "  Avvia in un altro terminale: cd velvet && ./mvnw spring-boot:run"
echo "  Attendo fino a ${MAX_WAIT_SEC}s (Spring può impiegare 2–3 min al primo avvio)..."

elapsed=0
while [[ "$elapsed" -lt "$MAX_WAIT_SEC" ]]; do
  if curl -sf "${BACKEND_URL}/actuator/health" >/dev/null 2>&1; then
    echo "✓ Backend avviato (${elapsed}s)"
    exit 0
  fi
  sleep "$INTERVAL_SEC"
  elapsed=$((elapsed + INTERVAL_SEC))
done

echo ""
echo "✗ Timeout: backend ancora assente su ${BACKEND_URL}."
echo "  L'app WebView caricherà la UI ma le API falliranno → percepita come «lentissima»."
echo "  Avvia Spring Boot e riprova, oppure usa la build di produzione:"
echo "    flutter run --dart-define=VELVET_WEB_BASE_URL=https://salonivelvet.it"
exit 1
