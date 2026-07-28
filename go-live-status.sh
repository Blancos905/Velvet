#!/usr/bin/env bash
#
# go-live-status.sh — Stato go-live: cosa è fatto e cosa resta da fare
#
# Uso:
#   ./go-live-status.sh           # report completo
#   ./go-live-status.sh --quiet   # solo conteggi + elenco DA FARE
#   ./go-live-status.sh --help
#
# Complementare con:
#   ./go-live-check.sh    # controlli PASS/FAIL
#   ./luxury-audit.sh     # audit tecnico
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

QUIET=0
for arg in "$@"; do
  case "$arg" in
    -q|--quiet) QUIET=1 ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $arg (usa --help)" >&2
      exit 2
      ;;
  esac
done

declare -a DONE_ITEMS=()
declare -a TODO_ITEMS=()

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[1;34m'
  C_CYAN=$'\033[1;36m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
else
  C_RESET="" C_GREEN="" C_YELLOW="" C_BLUE="" C_CYAN="" C_BOLD="" C_DIM=""
fi

mark_done() { DONE_ITEMS+=("$1"); }
mark_todo() { TODO_ITEMS+=("$1"); }

# rg_search <pattern> <paths...>
rg_search() {
  local pattern="$1"
  shift
  if command -v rg >/dev/null 2>&1; then
    rg -l --no-heading \
      --glob '!node_modules/**' --glob '!dist/**' --glob '!target/**' \
      --glob '!.git/**' --glob '!frontend-web-dist/**' --glob '!.dart_tool/**' \
      "$pattern" "$@" 2>/dev/null || true
  else
    grep -Rl -E "$pattern" "$@" 2>/dev/null \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=target \
      --exclude-dir=.git --exclude-dir=frontend-web-dist --exclude-dir=.dart_tool || true
  fi
}

env_var_ok() {
  local file="$1" var="$2"
  [[ -f "$file" ]] || return 1
  local line val
  line="$(grep -E "^${var}=" "$file" 2>/dev/null | tail -1)" || return 1
  val="${line#*=}"
  val="${val%\"}"
  val="${val#\"}"
  [[ -n "$val" ]] || return 1
  [[ "$val" =~ (GENERA_|cambia-questa|CHANGE|TODO|INCOLLA|placeholder) ]] && return 1
  [[ "$val" =~ localhost ]] && return 1
  return 0
}

file_exists() { [[ -e "$1" ]]; }

# --- Repository / documentazione ---
mark_done "Monorepo e stack Docker prod definiti (infrastructure/docker-compose.prod.yml)"
mark_done "Report go-live disponibile (docs/INFRSTRUTTURA_PRODUZIONE_CHECKLIST_GO_LIVE.md)"
if file_exists "$ROOT_DIR/go-live-check.sh"; then
  mark_done "Script verifica automatica presente (./go-live-check.sh)"
else
  mark_todo "Manca go-live-check.sh"
fi

# --- Infrastructure .env ---
ENV_FILE="$ROOT_DIR/infrastructure/.env"
ENV_EXAMPLE="$ROOT_DIR/infrastructure/.env.example"
if file_exists "$ENV_FILE"; then
  mark_done "File infrastructure/.env presente"
else
  mark_todo "Creare infrastructure/.env da .env.example"
fi

for var in JWT_SECRET DB_PASSWORD REDIS_PASSWORD SITE_BASE_URL CORS_ORIGINS; do
  if env_var_ok "$ENV_FILE" "$var"; then
    mark_done "infrastructure/.env — ${var} valorizzato (non placeholder)"
  else
    mark_todo "infrastructure/.env — valorizzare ${var} (segreto/URL produzione, no localhost)"
  fi
done

if [[ -f "$ENV_FILE" ]] && grep -qE '^LUXURY_SUPER_ADMIN_SETUP_TOKEN=.' "$ENV_FILE" 2>/dev/null \
  && ! grep -qE '^LUXURY_SUPER_ADMIN_SETUP_TOKEN=$' "$ENV_FILE" 2>/dev/null; then
  mark_todo "Revocare/svuotare LUXURY_SUPER_ADMIN_SETUP_TOKEN dopo la prima installazione admin"
else
  mark_done "SETUP_TOKEN super admin non impostato (o già revocato) in infrastructure/.env"
fi

# --- TLS ---
CERT_DIR="$ROOT_DIR/infrastructure/nginx/certs"
if file_exists "$CERT_DIR/fullchain.pem" && file_exists "$CERT_DIR/privkey.pem"; then
  mark_done "Certificati TLS in infrastructure/nginx/certs/ (fullchain + privkey)"
else
  mark_todo "Installare certificati Let's Encrypt in infrastructure/nginx/certs/"
fi

# --- Nginx / CSP ---
NGINX_CONF="$ROOT_DIR/infrastructure/nginx/conf.d/app.conf"
if file_exists "$NGINX_CONF"; then
  mark_done "Config Nginx produzione presente (nginx/conf.d/app.conf)"
  if grep -q 'api\.saloniluxury\.it' "$NGINX_CONF" 2>/dev/null \
    && ! grep -qE "connect-src[^;]*'self'" "$NGINX_CONF" 2>/dev/null; then
    mark_todo "Verificare CSP nginx: connect-src punta a api.saloniluxury.it — allineare a same-origin /api se non usi sottodominio API"
  fi
  if ! grep -q '/var/www/certbot' "$ROOT_DIR/infrastructure/docker-compose.prod.yml" 2>/dev/null; then
    mark_todo "Opzionale: montare volume /var/www/certbot in docker-compose per rinnovo Certbot automatico"
  fi
else
  mark_todo "Manca configurazione Nginx in infrastructure/nginx/conf.d/"
fi

# --- Frontend build ---
DIST_INFRA="$ROOT_DIR/infrastructure/frontend-web-dist"
DIST_FE="$ROOT_DIR/luxury-frontend/dist"
if file_exists "$DIST_INFRA/index.html"; then
  mark_done "Build SPA copiata in infrastructure/frontend-web-dist/"
  if file_exists "$DIST_FE/index.html" \
    && [[ "$DIST_FE/index.html" -nt "$DIST_INFRA/index.html" ]]; then
    mark_todo "Ricopiare luxury-frontend/dist → infrastructure/frontend-web-dist (build frontend più recente)"
  fi
else
  mark_todo "Eseguire npm run build e cp -r luxury-frontend/dist → infrastructure/frontend-web-dist/"
fi

ENV_PROD="$ROOT_DIR/luxury-frontend/.env.production"
if file_exists "$ENV_PROD"; then
  mark_done "luxury-frontend/.env.production presente"
  for v in VITE_LEGAL_ENTITY_LEGAL_NAME VITE_LEGAL_ENTITY_ADDRESS VITE_LEGAL_ENTITY_VAT; do
    if env_var_ok "$ENV_PROD" "$v"; then
      mark_done ".env.production — ${v}"
    else
      mark_todo ".env.production — impostare ${v}"
    fi
  done
else
  mark_todo "Creare luxury-frontend/.env.production da .env.example (legal entity, store, maps)"
fi

if [[ -n "$(rg_search 'TODO_LEGAL' "$ROOT_DIR/luxury-frontend/src")" ]]; then
  mark_todo "Rimuovere placeholder [TODO_LEGAL] dal sorgente frontend (o valorizzare VITE_LEGAL_ENTITY_* in build)"
else
  mark_done "Nessun [TODO_LEGAL] nel sorgente luxury-frontend/src"
fi

if [[ -n "$(rg_search 'Pre-Release|Fase di Sviluppo' "$ROOT_DIR/luxury-frontend/src/pages/legal" "$ROOT_DIR/luxury-frontend/src/content")" ]]; then
  mark_todo 'Aggiornare testi legali: rimuovere "Fase di Sviluppo (Pre-Release)"'
else
  mark_done 'Testi legali senza "Fase di Sviluppo (Pre-Release)"'
fi

if [[ -n "$(rg_search '30/90' "$ROOT_DIR/luxury-frontend/src/pages/legal")" ]]; then
  mark_todo "Definire retention log in privacy (sostituire [es. 30/90 giorni])"
else
  mark_done "Retention log privacy definita (nessun placeholder 30/90)"
fi

if grep -q 'apps\.apple\.com/it/search' "$ROOT_DIR/luxury-frontend/src/config/env.ts" 2>/dev/null; then
  mark_todo "Impostare VITE_APP_STORE_URL con link App Store definitivo (non ricerca generica)"
else
  mark_done "App Store URL non usa più il placeholder di ricerca generica in env.ts"
fi

# --- Domini email ---
if grep -q 'saloniluxury\.it' "$ROOT_DIR/luxury-frontend/src/content/legalReferences.ts" 2>/dev/null \
  && grep -q 'saloniluxury\.it' "$ROOT_DIR/infrastructure/.env.example" 2>/dev/null; then
  mark_done "Email e dominio produzione allineati su saloniluxury.it (verificare SPF/DKIM su Aruba)"
else
  mark_todo "Allineare email legali e dominio produzione su saloniluxury.it + SPF/DKIM"
fi

# --- Backend ---
mark_done "Backend Spring Boot con profilo Docker (PostgreSQL/PostGIS) e Dockerfile"
mark_done "CORS configurabile via LUXURY_CORS_ALLOWED_ORIGINS / CORS_ORIGINS"

if [[ -z "$(rg_search 'spring\.mail\.' "$ROOT_DIR/luxury/src/main/resources")" ]]; then
  mark_todo "Email SMTP: non implementata — notifiche solo in-app+log; reset password solo in log (integrare se richiesto per go-live)"
else
  mark_done "Configurazione spring.mail presente nel backend"
fi

if [[ -n "$(rg_search 'luxury-dev-token-secret-change-in-production' "$ROOT_DIR/luxury/src/main/resources/application.properties")" ]]; then
  mark_todo "In produzione usare JWT/segreti via env (il default dev resta in application.properties per locale — ok se .env/docker sovrascrivono)"
fi

if [[ -z "$(rg_search '@gmail\.com' "$ROOT_DIR/luxury-frontend/src" "$ROOT_DIR/luxury/src" "$ROOT_DIR/luxury-app/lib")" ]]; then
  mark_done "Nessun @gmail.com nel sorgente app (hygiene)"
else
  mark_todo "Rimuovere/sostituire indirizzi @gmail.com nel sorgente applicativo"
fi

# Redis: container sì, codice Java no
if grep -qE '^\s+redis:' "$ROOT_DIR/infrastructure/docker-compose.prod.yml" 2>/dev/null; then
  redis_java="$(rg_search 'redis|Redis|Lettuce|Jedis' "$ROOT_DIR/luxury/src/main/java" "$ROOT_DIR/luxury/src/main/resources" || true)"
  if [[ -z "$redis_java" ]]; then
    mark_todo "Redis avviato in Docker ma non usato dall'API (refresh token su Postgres) — allineare doc o integrare"
  fi
fi

# --- App mobile ---
mark_done "App Flutter shell WebView (luxury-app) con default LUXURY_WEB_BASE_URL=https://saloniluxury.it"

ANDROID_GRADLE="$ROOT_DIR/luxury-app/android/app/build.gradle.kts"
if grep -q 'GradleException' "$ANDROID_GRADLE" 2>/dev/null || ! grep -q 'signingConfigs.getByName("debug")' "$ANDROID_GRADLE" 2>/dev/null; then
  mark_done "Android release rifiuta build senza keystore produzione"
else
  mark_todo "Android release: configurare keystore produzione (oggi firma debug in buildTypes.release)"
fi

if grep -q 'usesCleartextTraffic="true"' "$ROOT_DIR/luxury-app/android/app/src/main/AndroidManifest.xml" 2>/dev/null; then
  mark_todo "Android: disabilitare cleartext in release / collegare network_security_config per solo HTTPS"
else
  mark_done "Android manifest senza cleartext globale"
fi

mark_todo "Build store: flutter build appbundle/ipa --release --dart-define=LUXURY_WEB_BASE_URL=<dominio-live>"
mark_todo "Play Console / App Store Connect: URL privacy, data safety, eliminazione account allineati al sito live"

# --- Deploy runtime (non verificabile da repo) ---
mark_todo "Deploy server: docker compose -f infrastructure/docker-compose.prod.yml up -d --build su Ubuntu"
mark_todo "DNS: record A/AAAA @ e www verso il VPS"
mark_todo "Caselle mail attive (privacy@, assistenza@) con SPF/DKIM/DMARC sul dominio"
mark_todo "Google Search Console: inviare sitemap https://<dominio>/sitemap.xml"
mark_todo "Eseguire ./luxury-audit.sh prima del taglio produzione"

# --- Output ---
NOW="$(date '+%Y-%m-%d %H:%M:%S')"
DONE_COUNT="${#DONE_ITEMS[@]}"
TODO_COUNT="${#TODO_ITEMS[@]}"

if [[ "$QUIET" -eq 0 ]]; then
  echo ""
  echo "${C_BLUE}${C_BOLD}══════════════════════════════════════════════════════════════${C_RESET}"
  echo "${C_BLUE}${C_BOLD}  Stato Go-Live — Salon Platform (Luxury)${C_RESET}"
  echo "${C_DIM}  $(date '+%Y-%m-%d %H:%M:%S') · root: $ROOT_DIR${C_RESET}"
  echo "${C_BLUE}${C_BOLD}══════════════════════════════════════════════════════════════${C_RESET}"
  echo ""
  echo "${C_GREEN}${C_BOLD}✔ FATTO (${DONE_COUNT})${C_RESET}"
  for item in "${DONE_ITEMS[@]}"; do
    echo "  ${C_GREEN}✔${C_RESET} $item"
  done
  echo ""
  echo "${C_YELLOW}${C_BOLD}○ DA FARE (${TODO_COUNT})${C_RESET}"
  for item in "${TODO_ITEMS[@]}"; do
    echo "  ${C_YELLOW}○${C_RESET} $item"
  done
  echo ""
  echo "${C_CYAN}${C_BOLD}Riepilogo:${C_RESET} ${C_GREEN}${DONE_COUNT} completati${C_RESET}, ${C_YELLOW}${TODO_COUNT} da fare${C_RESET}"
  if [[ "$TODO_COUNT" -eq 0 ]]; then
    echo "${C_GREEN}${C_BOLD}→ Nessuna voce automatica aperta. Completa comunque i test manuali e gli store.${C_RESET}"
  else
    pct=0
    total=$((DONE_COUNT + TODO_COUNT))
    if [[ "$total" -gt 0 ]]; then
      pct=$((DONE_COUNT * 100 / total))
    fi
    echo "${C_DIM}→ Avanzamento stimato (solo voci di questo script): ~${pct}%${C_RESET}"
  fi
  echo ""
  echo "${C_DIM}Dettaglio tecnico: docs/INFRSTRUTTURA_PRODUZIONE_CHECKLIST_GO_LIVE.md${C_RESET}"
  echo "${C_DIM}Verifica rigida:     ./go-live-check.sh  ·  ./luxury-audit.sh${C_RESET}"
  echo ""
else
  echo "FATTO: $DONE_COUNT | DA FARE: $TODO_COUNT"
  for item in "${TODO_ITEMS[@]}"; do
    echo "TODO: $item"
  done
fi

# Exit 1 se restano todo (utile in CI opzionale)
if [[ "$TODO_COUNT" -gt 0 ]]; then
  exit 1
fi
exit 0
