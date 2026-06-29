#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/spring-dev.local.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "Missing $ENV_FILE — copy from spring-dev.local.env.example" >&2
  exit 1
fi

delete_apple_double_files() {
  local count
  count="$(find . -name '._*' -type f 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$count" -gt 0 ]]; then
    find . -name '._*' -type f -delete
    echo "Removed $count AppleDouble (._*) file(s)."
  fi
}

./mvnw compile -DskipTests
delete_apple_double_files
exec ./mvnw spring-boot:run -DskipTests
