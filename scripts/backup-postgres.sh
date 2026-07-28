#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure"
COMPOSE_FILE="$INFRA_DIR/docker-compose.prod.yml"
ENV_FILE="${ENV_FILE:-$INFRA_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/database}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="$BACKUP_ROOT/postgres"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$DEST_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file non trovato: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file non trovato: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

ARCHIVE="$DEST_DIR/postgres-${DB_NAME}-${TIMESTAMP}.sql.gz"
META="$DEST_DIR/postgres-${DB_NAME}-${TIMESTAMP}.meta"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$ARCHIVE"

cat > "$META" <<EOF
timestamp=$TIMESTAMP
db_name=$DB_NAME
db_user=$DB_USER
archive=$(basename "$ARCHIVE")
sha256=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
restore_example=docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < <(gzip -dc "$ARCHIVE")
EOF

find "$DEST_DIR" -type f \( -name '*.sql.gz' -o -name '*.meta' \) -mtime +"$RETENTION_DAYS" -delete

echo "Backup Postgres creato: $ARCHIVE"
