#!/bin/bash
# Ruff locale. Non usa il python3 di sistema se quello non parte (licenza Xcode).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
venv="$root/.cache/ruff-venv"

pick_python() {
  if python3 -c 'import json' >/dev/null 2>&1; then
    echo python3
    return
  fi
  if [[ -x /opt/homebrew/bin/python3.12 ]]; then
    echo /opt/homebrew/bin/python3.12
    return
  fi
  if command -v python3.12 >/dev/null 2>&1; then
    command -v python3.12
    return
  fi
  echo "Python non disponibile: python3 non parte e python3.12 non c'è." >&2
  exit 1
}

if [[ ! -x "$venv/bin/ruff" ]]; then
  py="$(pick_python)"
  "$py" -m venv "$venv"
  "$venv/bin/pip" install --disable-pip-version-check ruff
fi

exec "$venv/bin/ruff" "$@"
