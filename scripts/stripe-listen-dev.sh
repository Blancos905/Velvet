#!/usr/bin/env bash
# Inoltra webhook Stripe test → backend locale. Richiede spring-dev.local.env con STRIPE_SECRET_KEY.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/luxury/spring-dev.local.env"
STRIPE_BIN="${STRIPE_BIN:-/tmp/stripe}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "→ STRIPE_SECRET_KEY assente: configura luxury/spring-dev.local.env"
  exit 1
fi

if [[ ! -x "$STRIPE_BIN" ]]; then
  ARCH="$(uname -m)"
  case "$ARCH" in arm64) ARCH=arm64;; *) ARCH=x86_64;; esac
  curl -sSL "https://github.com/stripe/stripe-cli/releases/download/v1.42.14/stripe_1.42.14_mac-os_${ARCH}.tar.gz" \
    | tar -xz -C /tmp stripe
  STRIPE_BIN=/tmp/stripe
fi

echo "→ Stripe listen → http://127.0.0.1:8080/api/v1/webhooks/stripe"
exec "$STRIPE_BIN" listen \
  --api-key "$STRIPE_SECRET_KEY" \
  --forward-to localhost:8080/api/v1/webhooks/stripe
