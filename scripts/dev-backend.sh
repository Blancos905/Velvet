#!/usr/bin/env bash
# Avvia Spring Boot in foreground (dev). Salta test-compile per partire in ~15–45s.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/luxury"
ENV_FILE="$ROOT/luxury/spring-dev.local.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "→ Carico variabili da spring-dev.local.env (SMTP, DB, …)"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "→ spring-dev.local.env assente: email SMTP disabilitate (luxury.mail.enabled=false)."
  echo "  Copia: cp spring-dev.local.env.example spring-dev.local.env"
fi

# Link nelle email di conferma: allinea all'IP LAN attuale del Mac (Vite «Network: http://…»).
# Evita link morti quando il router assegna un IP diverso da quello in spring-dev.local.env.
if [[ "${LUXURY_NOTIFICATIONS_FRONTEND_BASE_URL_AUTO:-1}" != "0" ]]; then
  DEV_HOST="$("$ROOT/scripts/detect-dev-host.sh")"
  export LUXURY_NOTIFICATIONS_FRONTEND_BASE_URL="http://${DEV_HOST}:5173"
  echo "→ Link email frontend (auto): $LUXURY_NOTIFICATIONS_FRONTEND_BASE_URL"
  echo "  App fisica: ./scripts/dev-app-device.sh  (allinea LUXURY_WEB_BASE_URL allo stesso IP)"
  echo "  (disabilita auto-IP con LUXURY_NOTIFICATIONS_FRONTEND_BASE_URL_AUTO=0 in spring-dev.local.env)"
fi

echo "→ Avvio Spring Boot (profilo local). PostgreSQL richiesto su :5432."
echo "  Health: curl -sf http://127.0.0.1:8081/api/v1/public/health"
# -q riduce output Maven; -Dmaven.test.skip=true salta compilazione 43 test sources.
exec ./mvnw -q spring-boot:run -Dmaven.test.skip=true
