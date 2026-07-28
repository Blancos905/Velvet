#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/database}"
LOG_DIR="$BACKUP_ROOT/logs"
SCHEDULE="${BACKUP_CRON_SCHEDULE:-0 */6 * * *}"

mkdir -p "$LOG_DIR"

CRON_LINE="$SCHEDULE BACKUP_ROOT=\"$BACKUP_ROOT\" BACKUP_RETENTION_DAYS=\"${BACKUP_RETENTION_DAYS:-14}\" \"$ROOT_DIR/scripts/backup-database-stack.sh\" >> \"$LOG_DIR/backup-cron.log\" 2>&1"

if [[ "${1:-}" == "--apply" ]]; then
  (
    crontab -l 2>/dev/null | rg -v 'backup-database-stack\.sh' || true
    echo "$CRON_LINE"
  ) | crontab -
  echo "Cron installato:"
  echo "$CRON_LINE"
  exit 0
fi

echo "Cron suggerito:"
echo "$CRON_LINE"
echo
echo "Per applicarlo:"
echo "  $0 --apply"
