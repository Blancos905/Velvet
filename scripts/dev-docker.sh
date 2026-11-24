#!/usr/bin/env bash
# Stack locale in Docker: Redis, API Spring, SPA Nginx.
# SMTP Aruba parte con lo stesso avvio: l'API legge luxury/spring-dev.local.env.
# Uso: ./scripts/dev-docker.sh          (foreground)
#      ./scripts/dev-docker.sh -d       (background)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/infrastructure"
local_env="$ROOT/luxury/spring-dev.local.env"
if [[ -f "$local_env" ]]; then
  mail_on="$(awk -F= '/^LUXURY_MAIL_ENABLED=/{print $2; exit}' "$local_env")"
  mail_host="$(awk -F= '/^SPRING_MAIL_HOST=/{print $2; exit}' "$local_env")"
  if [[ "$mail_on" == "true" && -n "$mail_host" ]]; then
    echo "→ SMTP attivo con lo stack ($mail_host, da luxury/spring-dev.local.env)"
  else
    echo "→ SMTP spento in luxury/spring-dev.local.env."
  fi
else
  echo "→ SMTP spento: manca luxury/spring-dev.local.env."
fi
exec docker compose -f docker-compose.dev.yml up --build "$@"
