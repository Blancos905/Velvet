#!/usr/bin/env bash
# Avvia Spring Boot in foreground (dev). Salta test-compile per partire in ~15–45s.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/velvet"
ENV_FILE="$ROOT/velvet/spring-dev.local.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "→ Carico variabili da spring-dev.local.env (SMTP, DB, …)"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "→ spring-dev.local.env assente: email SMTP disabilitate (velvet.mail.enabled=false)."
  echo "  Copia: cp spring-dev.local.env.example spring-dev.local.env"
fi
echo "→ Avvio Spring Boot (profilo local). PostgreSQL richiesto su :5432."
echo "  Health: curl -sf http://127.0.0.1:8080/api/v1/public/health"
# -q riduce output Maven; -Dmaven.test.skip=true salta compilazione 43 test sources.
exec ./mvnw -q spring-boot:run -Dmaven.test.skip=true
