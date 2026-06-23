#!/usr/bin/env bash
# Attende che Spring Boot risponda su :8080 (proxy target Vite in dev).
# Con VELVET_AUTO_START_BACKEND=1 (default) avvia ./mvnw spring-boot:run se la porta è libera.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VELVET_DIR="${VELVET_BACKEND_DIR:-$REPO_ROOT/velvet}"

BACKEND_URL="${VELVET_PROXY_API_TARGET:-http://127.0.0.1:8080}"
BACKEND_URL="${BACKEND_URL%/}"
HEALTH_PATH="/api/v1/public/health"
HEALTH_URL="${BACKEND_URL}${HEALTH_PATH}"

MAX_WAIT_SEC="${VELVET_BACKEND_WAIT_SEC:-240}"
INTERVAL_SEC=2
AUTO_START="${VELVET_AUTO_START_BACKEND:-1}"
BACKEND_LOG="${VELVET_BACKEND_LOG:-/tmp/velvet-spring-dev.log}"

backend_healthy() {
  if curl -sf --max-time 3 "${HEALTH_URL}" >/dev/null 2>&1; then
    return 0
  fi
  # Fallback: backend avviato prima del deploy di /public/health (compatibilità transitoria).
  curl -sf --max-time 5 "${BACKEND_URL}/api/v1/public/organizations?limit=1" >/dev/null 2>&1
}

port_in_use() {
  lsof -ti ":8080" >/dev/null 2>&1
}

spring_boot_starting() {
  # Porta libera ma Maven già in spring-boot:run (test-compile può richiedere minuti).
  pgrep -f "spring-boot:run" >/dev/null 2>&1
}

maybe_start_backend() {
  if [[ "$AUTO_START" != "1" ]]; then
    return 0
  fi
  if [[ ! -d "$VELVET_DIR" || ! -x "$VELVET_DIR/mvnw" ]]; then
    echo "  (auto-start disabilitato: cartella velvet/mvnw non trovati in $VELVET_DIR)"
    return 0
  fi
  if port_in_use; then
    echo "  Porta 8080 occupata — attendo che Spring Boot finisca l'avvio..."
    return 0
  fi
  if spring_boot_starting; then
    echo "  Maven spring-boot:run già in esecuzione (compilazione in corso) — attendo..."
    return 0
  fi

  echo "→ Spring Boot non in ascolto: avvio in background..."
  echo "  Log: ${BACKEND_LOG}"
  echo "  Per disabilitare: VELVET_AUTO_START_BACKEND=0"
  (
    cd "$VELVET_DIR"
    ENV_FILE="$VELVET_DIR/spring-dev.local.env"
    if [[ -f "$ENV_FILE" ]]; then
      set -a
      # shellcheck disable=SC1090
      source "$ENV_FILE"
      set +a
    fi
    # -Dmaven.test.skip=true: evita test-compile (43 file) ad ogni avvio dev (~1–3 min risparmiati).
    nohup ./mvnw spring-boot:run -Dmaven.test.skip=true >>"$BACKEND_LOG" 2>&1 &
    echo $! > /tmp/velvet-spring-dev.pid
  )
  sleep 2
}

if backend_healthy; then
  echo "✓ Backend Spring raggiungibile su ${BACKEND_URL}"
  exit 0
fi

echo "⚠ Backend non raggiungibile su ${BACKEND_URL}${HEALTH_PATH}"
maybe_start_backend
echo "  Attendo fino a ${MAX_WAIT_SEC}s (Spring può impiegare 15–60s al primo avvio)..."

elapsed=0
while [[ "$elapsed" -lt "$MAX_WAIT_SEC" ]]; do
  if backend_healthy; then
    echo "✓ Backend pronto (${elapsed}s)"
    exit 0
  fi
  sleep "$INTERVAL_SEC"
  elapsed=$((elapsed + INTERVAL_SEC))
  if (( elapsed % 10 == 0 )); then
    echo "  … ancora in avvio (${elapsed}s / ${MAX_WAIT_SEC}s)"
  fi
done

echo ""
echo "✗ Timeout: backend ancora assente su ${BACKEND_URL}."
echo "  Avvia manualmente: cd velvet && ./mvnw spring-boot:run"
echo "  Log auto-start: ${BACKEND_LOG}"
echo "  L'app WebView caricherà la UI ma le API falliranno finché Spring non risponde."
exit 1
