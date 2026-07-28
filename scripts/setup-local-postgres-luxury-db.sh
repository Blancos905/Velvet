#!/usr/bin/env bash
# Migra il DB dev PostgreSQL da c1velvet → c1luxury (dopo rename progetto).
# Idempotente: esce subito se c1luxury esiste già.
set -euo pipefail

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"

if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='c1luxury'" | grep -q 1; then
  echo "OK: database c1luxury già presente."
  exit 0
fi

if ! psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='c1velvet'" | grep -q 1; then
  echo "Nessun database c1velvet né c1luxury. Crea c1luxury manualmente o ripristina un dump." >&2
  exit 1
fi

echo "→ Rinomino schema c1velvet → c1luxury (se presente)..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d c1velvet -v ON_ERROR_STOP=1 -c \
  "ALTER SCHEMA IF EXISTS c1velvet RENAME TO c1luxury;" 2>/dev/null || true

echo "→ Rinomino database c1velvet → c1luxury..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -c \
  "ALTER DATABASE c1velvet RENAME TO c1luxury;"

echo "✓ PostgreSQL pronto: jdbc:postgresql://${PGHOST}:${PGPORT}/c1luxury?currentSchema=c1luxury"
