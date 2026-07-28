#!/usr/bin/env bash
# Provisiona una sandbox Stripe test e aggiorna luxury/spring-dev.local.env (chiavi valide ~7 giorni).
# Uso: ./scripts/stripe-sandbox-setup-dev.sh [email]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/luxury/spring-dev.local.env"
STRIPE_BIN="${STRIPE_BIN:-/tmp/stripe}"

if [[ ! -x "$STRIPE_BIN" ]]; then
  ARCH="$(uname -m)"
  case "$ARCH" in arm64) ARCH=arm64;; *) ARCH=x86_64;; esac
  curl -sSL "https://github.com/stripe/stripe-cli/releases/download/v1.42.14/stripe_1.42.14_mac-os_${ARCH}.tar.gz" \
    | tar -xz -C /tmp stripe
  STRIPE_BIN=/tmp/stripe
fi

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  EMAIL="$(git -C "$ROOT" config user.email 2>/dev/null || true)"
fi
if [[ -z "$EMAIL" ]]; then
  echo "→ Passa l'email: ./scripts/stripe-sandbox-setup-dev.sh tuo@email.com"
  exit 1
fi

echo "→ Creazione sandbox Stripe per $EMAIL …"
OUT="$("$STRIPE_BIN" sandbox create --email "$EMAIL" 2>&1)"
echo "$OUT"

SECRET_KEY="$(echo "$OUT" | python3 -c "import sys,json,re; t=sys.stdin.read(); m=re.search(r'\"secret_key\":\\s*\"([^\"]+)\"', t); print(m.group(1) if m else '')")"
if [[ -z "$SECRET_KEY" ]]; then
  echo "→ Impossibile leggere secret_key dalla sandbox."
  exit 1
fi

PRODUCT_ID="$("$STRIPE_BIN" products create --name "Saloni Luxury Premium" --api-key "$SECRET_KEY" 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"

PRICE_ID="$(curl -sS https://api.stripe.com/v1/prices -u "$SECRET_KEY:" \
  -d "product=$PRODUCT_ID" \
  -d "unit_amount=2000" \
  -d "currency=eur" \
  -d "recurring[interval]=month" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"

WHSEC="$("$STRIPE_BIN" listen --api-key "$SECRET_KEY" --forward-to localhost:8080/api/v1/webhooks/stripe --print-secret 2>&1 | tail -1)"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/luxury/spring-dev.local.env.example" "$ENV_FILE"
fi

python3 - "$ENV_FILE" "$SECRET_KEY" "$PRICE_ID" "$WHSEC" <<'PY'
import pathlib, re, sys
path, sk, price, whsec = sys.argv[1:5]
text = pathlib.Path(path).read_text()
block = f"""# --- Stripe billing (test mode — sandbox Stripe CLI, scade ~7 giorni: stripe sandbox claim) ---
LUXURY_BILLING_ENABLED=true
LUXURY_FATTURAPA_ENABLED=false
STRIPE_SECRET_KEY={sk}
STRIPE_PREMIUM_PRICE_ID={price}
STRIPE_WEBHOOK_SECRET={whsec}
# Webhook forwarder: ./scripts/stripe-listen-dev.sh (terminale separato; usa la stessa STRIPE_SECRET_KEY)
"""
if re.search(r"(?m)^# --- Stripe billing.*", text):
    text = re.sub(r"(?ms)^# --- Stripe billing.*?^# Webhook forwarder:.*\n", block, text, count=1)
else:
    text = text.rstrip() + "\n\n" + block
pathlib.Path(path).write_text(text)
PY

echo "→ Aggiornato $ENV_FILE"
echo "→ Riavvia il backend: cd luxury && set -a && source spring-dev.local.env && set +a && ./mvnw spring-boot:run"
echo "→ Webhook (altro terminale): ./scripts/stripe-listen-dev.sh"
