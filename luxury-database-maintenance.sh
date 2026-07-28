#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure"
COMPOSE_FILE="$INFRA_DIR/docker-compose.prod.yml"
NGINX_CONF="$INFRA_DIR/nginx/conf.d/app.conf"
ENV_EXAMPLE="$INFRA_DIR/.env.example"
ENV_REAL="$INFRA_DIR/.env"
SQL_DIR="$ROOT_DIR/luxury/deploy/sql"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/database}"

RUN_SMELLS=1
RUN_BACKUP=1
RUN_DOCKER_CONFIG=1
RUN_SQL=1

for arg in "$@"; do
  case "$arg" in
    --fast) RUN_BACKUP=0 ;;
    --smells) RUN_BACKUP=0; RUN_DOCKER_CONFIG=0; RUN_SQL=0 ;;
    --backup) RUN_SMELLS=0; RUN_DOCKER_CONFIG=0; RUN_SQL=0 ;;
    --docker-config) RUN_SMELLS=0; RUN_BACKUP=0; RUN_SQL=0 ;;
    --sql) RUN_SMELLS=0; RUN_BACKUP=0; RUN_DOCKER_CONFIG=0 ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $arg" >&2
      exit 2
      ;;
  esac
done

OVERALL_STATUS=0
WARN_COUNT=0
declare -a SUMMARY=()

pass() { SUMMARY+=("PASS|$1|$2"); echo "PASS  [$1] $2"; }
warn() { WARN_COUNT=$((WARN_COUNT + 1)); SUMMARY+=("WARN|$1|$2"); echo "WARN  [$1] $2"; }
fail() { OVERALL_STATUS=1; SUMMARY+=("FAIL|$1|$2"); echo "FAIL  [$1] $2"; }

print_header() {
  echo
  echo "======================================================================"
  echo "  $1"
  echo "======================================================================"
}

if [[ "$RUN_SMELLS" -eq 1 ]]; then
  print_header "1. Infrastructure / Docker / Nginx radar"

  [[ -f "$COMPOSE_FILE" ]] && pass "compose-file" "docker-compose.prod.yml presente" || fail "compose-file" "compose mancante"
  [[ -f "$NGINX_CONF" ]] && pass "nginx-conf" "app.conf presente" || fail "nginx-conf" "app.conf mancante"
  [[ -f "$ENV_EXAMPLE" ]] && pass "env-example" ".env.example presente" || fail "env-example" ".env.example mancante"

  if rg -q 'ports:' "$COMPOSE_FILE" && rg -q '"80:80"|\"443:443\"' "$COMPOSE_FILE"; then
    pass "ports" "nginx espone 80/443"
  else
    fail "ports" "porte pubbliche nginx non trovate"
  fi

  if awk '/^  postgres:/{in_service=1;next} /^  [A-Za-z0-9_-]+:/{if(in_service) in_service=0} in_service && /^[[:space:]]+ports:/{found=1} END{exit found ? 1 : 0}' "$COMPOSE_FILE"; then
    pass "db-isolation" "postgres non pubblicato su host"
  else
    warn "db-isolation" "verificare che postgres non esponga ports host"
  fi

  if awk '/^  redis:/{in_service=1;next} /^  [A-Za-z0-9_-]+:/{if(in_service) in_service=0} in_service && /^[[:space:]]+ports:/{found=1} END{exit found ? 1 : 0}' "$COMPOSE_FILE"; then
    pass "redis-isolation" "redis non pubblicato su host"
  else
    warn "redis-isolation" "verificare che redis non esponga ports host"
  fi

  if rg -q 'internal: true' "$COMPOSE_FILE"; then
    pass "backplane" "rete backplane interna"
  else
    fail "backplane" "backplane internal: true mancante"
  fi

  if rg -q 'pg_data:' "$COMPOSE_FILE" && rg -q 'redis_data:' "$COMPOSE_FILE"; then
    pass "volumes" "volumi pg_data e redis_data presenti"
  else
    fail "volumes" "volumi persistenti DB/Redis mancanti"
  fi

  if rg -q 'healthcheck:' "$COMPOSE_FILE" && rg -q 'pg_isready' "$COMPOSE_FILE" && rg -q 'redis-cli' "$COMPOSE_FILE"; then
    pass "healthcheck" "healthcheck api/postgres/redis presenti"
  else
    fail "healthcheck" "healthcheck incompleti"
  fi

  if rg -q 'ssl_certificate' "$NGINX_CONF" && rg -q 'return 301 https://' "$NGINX_CONF"; then
    pass "tls" "TLS + redirect HTTPS presenti"
  else
    fail "tls" "TLS/redirect incompleti"
  fi

  if rg -q 'Content-Security-Policy' "$NGINX_CONF"; then
    if rg -q "connect-src 'self' https://api\\.saloniluxury\\.it;" "$NGINX_CONF"; then
      warn "csp" "CSP connect-src include api.saloniluxury.it: verificare se esiste davvero o se basta same-origin"
    else
      pass "csp" "CSP presente"
    fi
  else
    fail "csp" "CSP mancante"
  fi

  if rg -q '/var/www/certbot' "$NGINX_CONF"; then
    warn "certbot" "webroot ACME presente nel config: verificare volume/automazione rinnovo"
  fi

  if rg -q 'infrastructure/.env' "$ROOT_DIR/.gitignore" && rg -q 'infrastructure/nginx/certs/' "$ROOT_DIR/.gitignore"; then
    pass "gitignore-secrets" ".env e cert ignorati"
  else
    fail "gitignore-secrets" ".gitignore non copre env/certs"
  fi
fi

if [[ "$RUN_DOCKER_CONFIG" -eq 1 ]]; then
  print_header "2. docker compose config"
  if [[ -f "$ENV_REAL" ]]; then
    if docker compose --env-file "$ENV_REAL" -f "$COMPOSE_FILE" config >/tmp/luxury-database-compose-config.txt 2>&1; then
      pass "compose-config" "docker compose config valido"
    else
      fail "compose-config" "docker compose config fallito"
    fi
  else
    warn "compose-config" "infrastructure/.env assente: validazione compose con env reali saltata"
  fi
fi

if [[ "$RUN_SQL" -eq 1 ]]; then
  print_header "3. SQL / schema manuale"
  SQL_COUNT=$(find "$SQL_DIR" -name '*.sql' | wc -l | tr -d ' ')
  echo "SQL manuali trovati: $SQL_COUNT"
  if [[ "$SQL_COUNT" -ge 20 ]]; then
    pass "sql-inventory" "inventario SQL presente ($SQL_COUNT file)"
  else
    warn "sql-inventory" "pochi SQL trovati ($SQL_COUNT)"
  fi

  if rg -q 'reset_luxury_users_and_salons.sql' <(find "$SQL_DIR" -name '*.sql' -print); then
    warn "sql-reset" "presente script reset: non usarlo in prod"
  fi
fi

if [[ "$RUN_BACKUP" -eq 1 ]]; then
  print_header "4. Backup / restore / schedulazione"

  for script in \
    "$ROOT_DIR/scripts/backup-postgres.sh" \
    "$ROOT_DIR/scripts/backup-redis.sh" \
    "$ROOT_DIR/scripts/backup-database-stack.sh" \
    "$ROOT_DIR/scripts/install-database-backup-cron.sh"
  do
    if [[ -f "$script" ]]; then
      echo "ok $(basename "$script")"
    else
      fail "backup-scripts" "manca $script"
    fi
  done
  if ! printf '%s\n' "${SUMMARY[@]-}" | rg -q '^FAIL\|backup-scripts\|'; then
    pass "backup-scripts" "script backup presenti"
  fi

  mkdir -p "$BACKUP_ROOT"
  if [[ -d "$BACKUP_ROOT" ]]; then
    pass "backup-root" "backup root disponibile: $BACKUP_ROOT"
  fi

  if rg -q '0 \*/6 \* \* \*' "$ROOT_DIR/scripts/install-database-backup-cron.sh"; then
    pass "backup-cron" "cron ogni 6 ore configurato di default"
  else
    warn "backup-cron" "schedule backup non trovato"
  fi
fi

print_header "Riepilogo manutenzione database"
FAIL_N=0
PASS_N=0
if ((${#SUMMARY[@]})); then
  for row in "${SUMMARY[@]}"; do
    status="${row%%|*}"
    rest="${row#*|}"
    mod="${rest%%|*}"
    msg="${rest#*|}"
    printf "  %-5s %-18s %s\n" "$status" "$mod" "$msg"
    case "$status" in
      FAIL) FAIL_N=$((FAIL_N + 1)) ;;
      PASS) PASS_N=$((PASS_N + 1)) ;;
    esac
  done
fi

echo
echo "  PASS=$PASS_N  WARN=$WARN_COUNT  FAIL=$FAIL_N"
echo
echo "  Prossimo passo agent: checklist in .cursor/skills/manutenzione-database/CHECKLIST.md"
echo

exit "$OVERALL_STATUS"
