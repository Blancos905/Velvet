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

if ! command -v node >/dev/null 2>&1; then
  echo "→ Serve Node.js per leggere la risposta di Stripe."
  exit 1
fi

echo "→ Creazione sandbox Stripe per $EMAIL …"
OUT="$("$STRIPE_BIN" sandbox create --email "$EMAIL" --non-interactive --color off 2>&1)" || true

SECRET_KEY="$(printf '%s' "$OUT" | node -e '
let s = "";
process.stdin.on("data", (d) => { s += d; });
process.stdin.on("end", () => {
  const json = s.match(/\{[\s\S]*\}/);
  if (json) {
    try {
      const key = JSON.parse(json[0]).secret_key;
      if (key) { process.stdout.write(key); return; }
    } catch { /* testo libero */ }
  }
  const line = s.match(/Secret key:\s*(\S+)/);
  if (line) process.stdout.write(line[1]);
});
')"
if [[ -z "$SECRET_KEY" ]]; then
  echo "→ Sandbox non creata. Nel terminale esegui: /tmp/stripe login"
  exit 1
fi
echo "→ Sandbox pronta (la chiave non viene stampata)."

PRODUCT_ID="$("$STRIPE_BIN" products create --name "Saloni Luxury Premium" --api-key "$SECRET_KEY" 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{process.stdout.write(JSON.parse(s).id||"")})')"

PRICE_ID="$(curl -sS https://api.stripe.com/v1/prices -u "$SECRET_KEY:" \
  -d "product=$PRODUCT_ID" \
  -d "unit_amount=4000" \
  -d "currency=eur" \
  -d "recurring[interval]=month" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{process.stdout.write(JSON.parse(s).id||"")})')"

WHSEC="$("$STRIPE_BIN" listen --api-key "$SECRET_KEY" --forward-to localhost:8081/api/v1/webhooks/stripe --print-secret 2>&1 | tail -1)"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/luxury/spring-dev.local.env.example" "$ENV_FILE"
fi

node -e '
const fs = require("fs");
const [path, sk, price, whsec] = process.argv.slice(1);
let text = fs.readFileSync(path, "utf8");
const block = `# --- Stripe billing (test mode — sandbox Stripe CLI, scade ~7 giorni: stripe sandbox claim) ---
LUXURY_BILLING_ENABLED=true
LUXURY_FATTURAPA_ENABLED=false
STRIPE_SECRET_KEY=${sk}
STRIPE_PREMIUM_PRICE_ID=${price}
STRIPE_WEBHOOK_SECRET=${whsec}
# Webhook forwarder: ./scripts/stripe-listen-dev.sh (terminale separato; usa la stessa STRIPE_SECRET_KEY)
`;
if (/^# --- Stripe billing.*/m.test(text)) {
  text = text.replace(/^# --- Stripe billing[\s\S]*?^# Webhook forwarder:.*\n/m, block);
} else {
  text = text.replace(/\s*$/, "\n\n") + block;
}
fs.writeFileSync(path, text);
' "$ENV_FILE" "$SECRET_KEY" "$PRICE_ID" "$WHSEC"

echo "→ Aggiornato $ENV_FILE"
echo "→ Riavvia l'API: docker compose -f infrastructure/docker-compose.dev.yml up -d api"
echo "→ Webhook (altro terminale): ./scripts/stripe-listen-dev.sh"
