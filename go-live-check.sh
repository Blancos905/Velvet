#!/usr/bin/env bash
#
# go-live-check.sh — Promemoria e verifica automatica pre-produzione (Velvet monorepo)
#
# Eseguire quando il software è pronto per il deploy pubblico, PRIMA di:
#   - pubblicare su server di produzione
#   - inviare build ad App Store / Google Play
#   - indicare URL Privacy Policy nelle console store
#
# Uso:
#   ./go-live-check.sh              # controlli automatici + checklist finale
#   ./go-live-check.sh --reminder   # solo checklist (nessun FAIL per pattern)
#   ./go-live-check.sh --help
#
# Combinabile con l'audit tecnico:
#   ./velvet-audit.sh && ./go-live-check.sh
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REMINDER_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --reminder|-r) REMINDER_ONLY=1 ;;
    -h|--help)
      sed -n '2,17p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $arg (usa --help)" >&2
      exit 2
      ;;
  esac
done

OVERALL_STATUS=0
FAIL_COUNT=0
WARN_COUNT=0
declare -a SUMMARY=()

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_RED=$'\033[1;31m'
  C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[1;34m'
  C_CYAN=$'\033[1;36m'
  C_BOLD=$'\033[1m'
else
  C_RESET="" C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_CYAN="" C_BOLD=""
fi

print_header() {
  echo ""
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
  echo "${C_BLUE}${C_BOLD}  $1${C_RESET}"
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
}

# rg_search <pattern> <path>...  → stampa match (esclude node_modules, dist, target)
rg_search() {
  local pattern="$1"
  shift
  if command -v rg >/dev/null 2>&1; then
    rg -n --no-heading \
      --glob '!node_modules/**' --glob '!dist/**' --glob '!target/**' \
      --glob '!.git/**' --glob '!frontend-web-dist/**' \
      "$pattern" "$@" 2>/dev/null || true
  else
    grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=target \
      --exclude-dir=.git --exclude-dir=frontend-web-dist \
      -E "$pattern" "$@" 2>/dev/null || true
  fi
}

# check_fail <modulo> <descrizione> <pattern> <paths...>
check_fail() {
  local module="$1" label="$2" pattern="$3"
  shift 3
  if [[ "$REMINDER_ONLY" -eq 1 ]]; then
    return 0
  fi
  local hits
  hits="$(rg_search "$pattern" "$@")"
  if [[ -n "$hits" ]]; then
    echo "${C_RED}✘ FAIL${C_RESET}  [$module] $label"
    echo "$hits" | head -20 | sed 's/^/       /'
    local n
    n="$(echo "$hits" | wc -l | tr -d ' ')"
    if [[ "$n" -gt 20 ]]; then
      echo "       … (+$((n - 20)) righe)"
    fi
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  $module :: $label")
    FAIL_COUNT=$((FAIL_COUNT + 1))
    OVERALL_STATUS=1
  else
    echo "${C_GREEN}✔ PASS${C_RESET}  [$module] $label"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  $module :: $label")
  fi
}

# check_warn — come check_fail ma non fa exit 1 da solo
check_warn() {
  local module="$1" label="$2" pattern="$3"
  shift 3
  if [[ "$REMINDER_ONLY" -eq 1 ]]; then
    return 0
  fi
  local hits
  hits="$(rg_search "$pattern" "$@")"
  if [[ -n "$hits" ]]; then
    echo "${C_YELLOW}⚠ WARN${C_RESET}  [$module] $label"
    echo "$hits" | head -12 | sed 's/^/       /'
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  $module :: $label")
    WARN_COUNT=$((WARN_COUNT + 1))
  else
    echo "${C_GREEN}✔ PASS${C_RESET}  [$module] $label"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  $module :: $label")
  fi
}

# check_file_missing_env <file> <var>
check_env_var() {
  local file="$1" var="$2" module="$3"
  if [[ "$REMINDER_ONLY" -eq 1 ]]; then
    return 0
  fi
  if [[ ! -f "$file" ]]; then
    echo "${C_YELLOW}⚠ WARN${C_RESET}  [$module] File assente: $file (creare da .env.example)"
    WARN_COUNT=$((WARN_COUNT + 1))
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  $module :: manca $file")
    return 0
  fi
  if grep -qE "^${var}=.*(GENERA_|cambia-questa|localhost|CHANGE|TODO|INCOLLA)" "$file" 2>/dev/null \
    || ! grep -qE "^${var}=" "$file" 2>/dev/null; then
    echo "${C_YELLOW}⚠ WARN${C_RESET}  [$module] In $file verificare: ${var}"
    WARN_COUNT=$((WARN_COUNT + 1))
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  $module :: ${var} in $file")
  else
    echo "${C_GREEN}✔ PASS${C_RESET}  [$module] ${var} presente in $(basename "$file")"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  $module :: ${var}")
  fi
}

print_checklist() {
  print_header "Checklist Go-Live (da completare manualmente)"
  cat <<'EOF'
  LEGALI (velvet-frontend)
    [ ] Build con VITE_COMPANY_LEGAL_NAME, ADDRESS, VAT, EMAIL (nessun placeholder legale pubblico)
    [ ] Allineare LEGAL_DOCUMENT_VERSION / LEGAL_UPDATED_AT (legalSharedCopy.ts + registrazione)
    [ ] Allineare VITE_LOG_RETENTION_DAYS con velvet.logging.retention-days (default 180; job purge audit attivo)
    [ ] Caselle attive: privacy@saloniluxury.it, assistenza@saloniluxury.it (SPF/DKIM/DMARC)
    [ ] URL store: B2C /privacy/clienti · Staff /privacy/staff · B2B /privacy · Elimina /privacy/elimina-account

  FRONTEND BUILD
    [ ] npm run build in velvet-frontend con .env.production valorizzato
    [ ] cp -r velvet-frontend/dist → infrastructure/frontend-web-dist/
    [ ] VITE_GOOGLE_MAPS_EMBED_API_KEY (se usi mappa embed)
    [ ] VITE_APP_STORE_URL link app definitivo (non ricerca generica)
    [ ] VITE_PARTNER_CONTACT_EMAIL per piani/partner

  BACKEND (velvet)
    [ ] VELVET_TOKEN_SECRET / JWT: chiave casuale ≥ 32 byte (mai velvet-dev-token-secret…)
    [ ] Super admin: BCrypt hash in prod; revocare SETUP_TOKEN dopo prima installazione
    [ ] VELVET_PUBLIC_FRONTEND_URL = https://www.saloniluxury.it (o dominio canonico)
    [ ] CORS solo domini produzione (VELVET_CORS_ALLOWED_ORIGINS)
    [ ] Valutare ddl-auto=validate + migrazioni DB (non solo update in prod)
    [ ] Email: oggi notifiche in-app+log — se serve SMTP reale, integrare prima del go-live

  INFRASTRUCTURE (Docker)
    [ ] infrastructure/.env da .env.example — password DB/Redis forti, JWT_SECRET nuovo
    [ ] SITE_BASE_URL e CORS_ORIGINS senza https://localhost
    [ ] Certificati TLS validi in infrastructure/nginx/certs/
    [ ] docker compose -f docker-compose.prod.yml up -d --build

  APP MOBILE (velvet-app)
    [ ] Release con VELVET_WEB_BASE_URL=https://saloniluxury.it
    [ ] WebView legali: URL B2C/B2B/Staff coerenti con ?embed=1

  STORE & SICUREZZA
    [ ] ./velvet-audit.sh superato
    [ ] Play Console / App Store Connect: Privacy URL + Data safety allineati al testo pubblicato
    [ ] Non committare: infrastructure/.env, certificati, spring-dev.local.env

  Documentazione estesa: docs/GO_LIVE.md
EOF
}

# =============================================================================
print_header "Mappa Go-Live — Velvet Salon Platform"
echo "Root: $ROOT_DIR"
if [[ "$REMINDER_ONLY" -eq 1 ]]; then
  echo "Modalità: ${C_CYAN}solo promemoria${C_RESET} (nessun controllo pattern)"
  print_checklist
  exit 0
fi

# =============================================================================
print_header "[1/4] Frontend — informative e placeholder legali"
# =============================================================================
check_fail legal "Placeholder [TODO_LEGAL] nel sorgente" 'TODO_LEGAL' \
  "$ROOT_DIR/velvet-frontend/src"

check_fail legal "Google Fonts CDN in index.html (usare /fonts/fonts.css self-hosted)" 'fonts\.googleapis\.com|fonts\.gstatic\.com' \
  "$ROOT_DIR/velvet-frontend/index.html"

check_fail legal 'Data "Fase di Sviluppo (Pre-Release)" ancora pubblicata' 'Pre-Release|Fase di Sviluppo' \
  "$ROOT_DIR/velvet-frontend/src/pages/legal" \
  "$ROOT_DIR/velvet-frontend/src/content"

check_warn legal 'Periodo log non definitivo "[es. 30/90 giorni]"' '30/90' \
  "$ROOT_DIR/velvet-frontend/src/pages/legal"

check_warn legal "App Store URL placeholder (ricerca generica)" 'apps\.apple\.com/it/search' \
  "$ROOT_DIR/velvet-frontend/src/config/env.ts"

if [[ -f "$ROOT_DIR/velvet-frontend/.env.production" ]]; then
  if ! grep -qE 'VITE_COMPANY_LEGAL_NAME=|VITE_LEGAL_ENTITY_LEGAL_NAME=' "$ROOT_DIR/velvet-frontend/.env.production" 2>/dev/null; then
    echo "${C_YELLOW}⚠ WARN${C_RESET}  [legal] .env.production senza VITE_COMPANY_LEGAL_NAME"
    WARN_COUNT=$((WARN_COUNT + 1))
  else
    echo "${C_GREEN}✔ PASS${C_RESET}  [legal] .env.production contiene dati societari (VITE_COMPANY_*)"
  fi
else
  echo "${C_YELLOW}⚠ WARN${C_RESET}  [legal] Creare velvet-frontend/.env.production (vedi .env.example)"
  WARN_COUNT=$((WARN_COUNT + 1))
fi

# =============================================================================
print_header "[2/4] Backend — segreti e URL di sviluppo"
# =============================================================================
check_fail backend "JWT/token secret di sviluppo in application.properties" \
  'velvet-dev-token-secret-change-in-production' \
  "$ROOT_DIR/velvet/src/main/resources/application.properties"

check_fail backend "Credenziali super-admin di default (dev)" \
  'mikele@admin\.com|chelsea95@' \
  "$ROOT_DIR/velvet/src/main/resources/application.properties"

check_warn backend "frontend-base-url localhost in application.properties" \
  'localhost:5173' \
  "$ROOT_DIR/velvet/src/main/resources/application.properties"

check_warn backend "Default https://localhost in application-prod.properties" \
  'https://localhost' \
  "$ROOT_DIR/velvet/src/main/resources/application-prod.properties"

check_warn backend "ddl-auto=update in profilo prod/docker" \
  'ddl-auto=update' \
  "$ROOT_DIR/velvet/src/main/resources/application-prod.properties" \
  "$ROOT_DIR/velvet/src/main/resources/application-docker.properties"

check_warn backend "Fallback JWT hardcoded in VelvetSecurityProperties.java" \
  'velvet-dev-token-secret-change-in-production' \
  "$ROOT_DIR/velvet/src/main/java/it/velvet/config/VelvetSecurityProperties.java"

if rg_search 'spring\.mail\.' "$ROOT_DIR/velvet/src/main/resources" | grep -q .; then
  echo "${C_GREEN}✔ PASS${C_RESET}  [backend] spring.mail configurato"
else
  echo "${C_YELLOW}⚠ WARN${C_RESET}  [backend] Nessun spring.mail.* — email esterne non inviate (solo inbox+log)"
  WARN_COUNT=$((WARN_COUNT + 1))
fi

# =============================================================================
print_header "[3/4] Infrastructure — .env e deploy"
# =============================================================================
ENV_FILE="$ROOT_DIR/infrastructure/.env"
check_env_var "$ENV_FILE" "JWT_SECRET" "infra"
check_env_var "$ENV_FILE" "DB_PASSWORD" "infra"
check_env_var "$ENV_FILE" "REDIS_PASSWORD" "infra"
check_env_var "$ENV_FILE" "SITE_BASE_URL" "infra"
check_env_var "$ENV_FILE" "CORS_ORIGINS" "infra"

if [[ -f "$ENV_FILE" ]]; then
  if grep -q 'localhost' "$ENV_FILE" 2>/dev/null; then
    echo "${C_YELLOW}⚠ WARN${C_RESET}  [infra] infrastructure/.env contiene ancora 'localhost'"
    grep -n 'localhost' "$ENV_FILE" | sed 's/^/       /'
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

if [[ -d "$ROOT_DIR/infrastructure/frontend-web-dist" ]]; then
  if [[ -d "$ROOT_DIR/velvet-frontend/dist" ]]; then
    if [[ "$ROOT_DIR/velvet-frontend/dist/index.html" -nt "$ROOT_DIR/infrastructure/frontend-web-dist/index.html" ]] 2>/dev/null; then
      echo "${C_YELLOW}⚠ WARN${C_RESET}  [infra] velvet-frontend/dist più recente di infrastructure/frontend-web-dist — ricopiare la build"
      WARN_COUNT=$((WARN_COUNT + 1))
    else
      echo "${C_GREEN}✔ PASS${C_RESET}  [infra] frontend-web-dist presente"
    fi
  fi
else
  echo "${C_YELLOW}⚠ WARN${C_RESET}  [infra] Manca infrastructure/frontend-web-dist (build SPA non deployata)"
  WARN_COUNT=$((WARN_COUNT + 1))
fi

# =============================================================================
print_header "[4/4] Email @gmail e riferimenti noti"
# =============================================================================
check_fail hygiene "Indirizzi @gmail.com nel sorgente applicativo" '@gmail\.com' \
  "$ROOT_DIR/velvet-frontend/src" \
  "$ROOT_DIR/velvet/src" \
  "$ROOT_DIR/infrastructure" \
  "$ROOT_DIR/velvet-app/lib"

# =============================================================================
print_header "Riepilogo controlli automatici"
for line in "${SUMMARY[@]}"; do
  echo "  $line"
done
echo ""

print_checklist

if [[ "$OVERALL_STATUS" -eq 0 ]]; then
  if [[ "$WARN_COUNT" -gt 0 ]]; then
    echo "${C_YELLOW}${C_BOLD}⚠ Go-live: nessun FAIL, ma ${WARN_COUNT} avviso/i — leggi checklist sopra.${C_RESET}"
  else
    echo "${C_GREEN}${C_BOLD}✔ Controlli automatici superati — completa comunque la checklist manuale.${C_RESET}"
  fi
else
  echo "${C_RED}${C_BOLD}✘ Go-live NON pronto: ${FAIL_COUNT} problema/i critico/i. Risolvi i FAIL e rilancia:${C_RESET}"
  echo "     ./go-live-check.sh"
fi

echo ""
echo "${C_CYAN}Suggerimento:${C_RESET} prima del deploy esegui anche ${C_BOLD}./velvet-audit.sh${C_RESET}"

exit "$OVERALL_STATUS"
