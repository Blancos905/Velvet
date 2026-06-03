#!/usr/bin/env bash
# Push velvet, velvet-frontend e velvet-app su GitHub (repo separati).
# Richiede: gh auth login (oppure GH_TOKEN / GITHUB_TOKEN in ambiente).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OWNER="${GITHUB_OWNER:-Blancos905}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) non trovato. Installa: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Non sei autenticato su GitHub."
  echo "Esegui: gh auth login"
  exit 1
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "Nessun commit git in $ROOT"
  exit 1
fi

push_project() {
  local dir="$1"
  local repo="$2"
  local desc="$3"
  local branch="deploy-${repo}"

  echo ""
  echo "→ ${OWNER}/${repo} (cartella ${dir}/)"

  if ! gh repo view "${OWNER}/${repo}" >/dev/null 2>&1; then
    gh repo create "${OWNER}/${repo}" --private --description "$desc"
  fi

  git branch -D "$branch" 2>/dev/null || true
  git subtree split --prefix="$dir" -b "$branch"
  git push "https://github.com/${OWNER}/${repo}.git" "${branch}:main" --force
  echo "✓ https://github.com/${OWNER}/${repo}"
}

push_project velvet velvet "Velvet — backend Spring Boot (API saloni)"
push_project velvet-frontend velvet-frontend "Velvet — frontend React/Vite (web + SEO)"
push_project velvet-app velvet-app "Velvet — app Flutter (WebView iOS/Android)"

echo ""
echo "Fatto. Tre repository aggiornati su GitHub."
