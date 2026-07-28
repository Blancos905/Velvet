#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/database}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
STATE_DIR="$BACKUP_ROOT/state"

mkdir -p "$STATE_DIR"

"$ROOT_DIR/scripts/backup-postgres.sh"
"$ROOT_DIR/scripts/backup-redis.sh"

docker compose --env-file "$ROOT_DIR/infrastructure/.env" \
  -f "$ROOT_DIR/infrastructure/docker-compose.prod.yml" config > \
  "$STATE_DIR/docker-compose-resolved-$TIMESTAMP.yml"

echo "Backup stack completato in $BACKUP_ROOT"
