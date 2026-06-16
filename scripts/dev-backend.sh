#!/usr/bin/env bash
# Avvia Spring Boot in foreground (dev). Salta test-compile per partire in ~15–45s.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/velvet"
echo "→ Avvio Spring Boot (profilo local). PostgreSQL richiesto su :5432."
echo "  Health: curl -sf http://127.0.0.1:8080/api/v1/public/health"
# -q riduce output Maven; -Dmaven.test.skip=true salta compilazione 43 test sources.
exec ./mvnw -q spring-boot:run -Dmaven.test.skip=true
