#!/usr/bin/env bash
# Push monorepo completo (velvet + velvet-frontend + velvet-app + infrastructure + docs).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OWNER="${GITHUB_OWNER:-Blancos905}"
REPO="${GITHUB_MONOREPO:-my-salon-platform}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) non trovato. Installa: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Non sei autenticato su GitHub."
  echo "Esegui: gh auth login"
  exit 1
fi

if ! gh repo view "${OWNER}/${REPO}" >/dev/null 2>&1; then
  gh repo create "${OWNER}/${REPO}" \
    --private \
    --description "Velvet salon platform — monorepo (backend, frontend, app, infrastructure)" \
    --source=. \
    --remote=origin \
    --push
else
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${OWNER}/${REPO}.git"
  git push -u origin main
fi

echo "✓ https://github.com/${OWNER}/${REPO}"
