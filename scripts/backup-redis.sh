#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="$ROOT_DIR/infrastructure"
COMPOSE_FILE="$INFRA_DIR/docker-compose.prod.yml"
ENV_FILE="${ENV_FILE:-$INFRA_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/database}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="$BACKUP_ROOT/redis"
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

ARCHIVE="$DEST_DIR/redis-${TIMESTAMP}.tar.gz"
META="$DEST_DIR/redis-${TIMESTAMP}.meta"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T redis \
  redis-cli -a "$REDIS_PASSWORD" BGSAVE >/dev/null

sleep 3

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T redis \
  sh -lc 'tar -czf - /data' > "$ARCHIVE"

cat > "$META" <<EOF
timestamp=$TIMESTAMP
archive=$(basename "$ARCHIVE")
sha256=$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')
restore_note=Estrarre l'archivio e ripristinare i file in /data del container redis a stack fermo.
EOF

find "$DEST_DIR" -type f \( -name '*.tar.gz' -o -name '*.meta' \) -mtime +"$RETENTION_DAYS" -delete

echo "Backup Redis creato: $ARCHIVE"
