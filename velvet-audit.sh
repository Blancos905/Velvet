#!/usr/bin/env bash
#
# velvet-audit.sh — Audit completo per Cursor / CI locale (Velvet monorepo)
#
# 1. Bug e qualità statica (SpotBugs, Checkstyle, TypeScript, Flutter analyze)
# 2. Test (Maven, Vitest, flutter test) — opzionale delega a check-all.sh
# 3. Allineamento flussi critici BE ↔ FE ↔ routing
# 4. Compliance App Store / Play Store (shell WebView + GDPR account deletion)
#
# Uso:
#   ./velvet-audit.sh              # audit completo (exit 1 se fallisce un check critico)
#   ./velvet-audit.sh --fast       # salta test Maven/Vitest/Flutter (solo statici + flussi + store)
#   ./velvet-audit.sh --flows      # solo sezione flussi API
#   ./velvet-audit.sh --store      # solo compliance store
#   ./velvet-audit.sh --no-check-all  # non invoca check-all.sh (esegue test inline)
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# ---------------------------------------------------------------------------
# Opzioni
# ---------------------------------------------------------------------------
RUN_TESTS=1
RUN_STATIC=1
RUN_FLOWS=1
RUN_STORE=1
USE_CHECK_ALL=1

for arg in "$@"; do
  case "$arg" in
    --fast) RUN_TESTS=0 ;;
    --flows) RUN_STATIC=0; RUN_TESTS=0; RUN_STORE=0 ;;
    --store) RUN_STATIC=0; RUN_TESTS=0; RUN_FLOWS=0 ;;
    --no-check-all) USE_CHECK_ALL=0 ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Opzione sconosciuta: $arg (usa --help)" >&2
      exit 2
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Stato e colori
# ---------------------------------------------------------------------------
OVERALL_STATUS=0
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

# run_step <severità: fail|warn> <modulo> <etichetta> <comando...>
run_step() {
  local severity="$1"; shift
  local module="$1"; shift
  local label="$1"; shift

  echo ""
  echo "${C_CYAN}▶ [${module}] ${label}${C_RESET}"
  echo "${C_CYAN}  \$ $*${C_RESET}"

  "$@"
  local code=$?
  if [[ $code -eq 0 ]]; then
    echo "${C_GREEN}✔ [${module}] ${label} — PASS${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  ${module} :: ${label}")
    return 0
  fi

  if [[ "$severity" == "warn" ]]; then
    echo "${C_YELLOW}⚠ [${module}] ${label} — WARN (exit ${code})${C_RESET}"
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  ${module} :: ${label}")
    WARN_COUNT=$((WARN_COUNT + 1))
    return 0
  fi

  echo "${C_RED}✘ [${module}] ${label} — FAIL (exit ${code})${C_RESET}"
  SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ${module} :: ${label}")
  OVERALL_STATUS=1
  return "$code"
}

# assert_grep <severità> <modulo> <label> <pattern> <path>...
assert_grep() {
  local severity="$1"; shift
  local module="$1"; shift
  local label="$1"; shift
  local pattern="$1"; shift

  echo ""
  echo "${C_CYAN}▶ [${module}] ${label}${C_RESET}"
  echo "${C_CYAN}  pattern: ${pattern}${C_RESET}"

  if grep -rqE "$pattern" "$@" 2>/dev/null; then
    echo "${C_GREEN}✔ [${module}] ${label} — PASS${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  ${module} :: ${label}")
    return 0
  fi

  if [[ "$severity" == "warn" ]]; then
    echo "${C_YELLOW}⚠ [${module}] ${label} — WARN (pattern assente)${C_RESET}"
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  ${module} :: ${label}")
    WARN_COUNT=$((WARN_COUNT + 1))
    return 0
  fi

  echo "${C_RED}✘ [${module}] ${label} — FAIL (pattern assente)${C_RESET}"
  SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ${module} :: ${label}")
  OVERALL_STATUS=1
  return 1
}

assert_file() {
  local severity="$1"; shift
  local module="$1"; shift
  local label="$1"; shift
  local file="$1"

  echo ""
  echo "${C_CYAN}▶ [${module}] ${label}${C_RESET}"
  if [[ -f "$file" ]]; then
    echo "${C_GREEN}✔ [${module}] ${label} — PASS${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  ${module} :: ${label}")
    return 0
  fi
  if [[ "$severity" == "warn" ]]; then
    echo "${C_YELLOW}⚠ [${module}] ${label} — WARN (file mancante: ${file})${C_RESET}"
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  ${module} :: ${label}")
    WARN_COUNT=$((WARN_COUNT + 1))
    return 0
  fi
  echo "${C_RED}✘ [${module}] ${label} — FAIL (file mancante: ${file})${C_RESET}"
  SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ${module} :: ${label}")
  OVERALL_STATUS=1
  return 1
}

mvn_cmd() {
  if [[ -x "$ROOT_DIR/velvet/mvnw" ]]; then
    echo "$ROOT_DIR/velvet/mvnw"
  elif command -v mvn >/dev/null 2>&1; then
    echo "mvn"
  else
    return 1
  fi
}

# Prefissi API esposti solo lato server / admin / diagnostica (non richiedono stringa nel FE).
is_api_be_only() {
  local path="$1"
  local prefixes=(
    "/api/v1/admin/status"
    "/actuator"
  )
  for p in "${prefixes[@]}"; do
    if [[ "$path" == "$p" || "$path" == "$p"/* ]]; then
      return 0
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
# Avvio
# ---------------------------------------------------------------------------
echo "${C_BOLD}Velvet — audit bug, test, flussi e compliance store${C_RESET}"
echo "Root: ${ROOT_DIR}"
echo "Modalità: static=${RUN_STATIC} test=${RUN_TESTS} flows=${RUN_FLOWS} store=${RUN_STORE} check-all=${USE_CHECK_ALL}"

# =============================================================================
# [1/4] Qualità statica e bug (analisi statica)
# =============================================================================
if [[ "$RUN_STATIC" -eq 1 ]]; then
  print_header "[1/4] Bug e qualità statica"

  MVN="$(mvn_cmd)" || MVN=""
  if [[ -n "$MVN" ]]; then
    pushd "$ROOT_DIR/velvet" >/dev/null
    run_step fail velvet "SpotBugs (bytecode)" \
      "$MVN" -q -B -DskipTests compile spotbugs:check
    run_step fail velvet "Checkstyle (sorgenti)" \
      "$MVN" -q -B checkstyle:check
    popd >/dev/null
  else
    echo "${C_RED}✘ [velvet] Maven non disponibile (mvnw assente)${C_RESET}"
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  velvet :: Maven mancante")
    OVERALL_STATUS=1
  fi

  if [[ -d "$ROOT_DIR/velvet-frontend" ]]; then
    pushd "$ROOT_DIR/velvet-frontend" >/dev/null
    if [[ ! -d node_modules ]]; then
      run_step fail velvet-frontend "Install dipendenze (npm ci)" npm ci
    fi
    tsc_bin="node_modules/.bin/tsc"
    if [[ -x "$tsc_bin" ]]; then
      run_step fail velvet-frontend "Type-check (tsc -b)" "$tsc_bin" -b --pretty
    else
      echo "${C_RED}✘ [velvet-frontend] tsc non trovato — esegui npm ci${C_RESET}"
      SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  velvet-frontend :: tsc mancante")
      OVERALL_STATUS=1
    fi
    popd >/dev/null
  fi

  if [[ -d "$ROOT_DIR/velvet-app" ]] && command -v flutter >/dev/null 2>&1; then
    pushd "$ROOT_DIR/velvet-app" >/dev/null
    run_step warn velvet-app "Flutter analyze" flutter analyze
    popd >/dev/null
  elif [[ -d "$ROOT_DIR/velvet-app" ]]; then
    echo "${C_YELLOW}⚠ [velvet-app] flutter non in PATH — analyze saltato${C_RESET}"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# =============================================================================
# [2/4] Test
# =============================================================================
if [[ "$RUN_TESTS" -eq 1 ]]; then
  print_header "[2/4] Suite di test"

  if [[ "$USE_CHECK_ALL" -eq 1 && -x "$ROOT_DIR/check-all.sh" ]]; then
    echo ""
    echo "${C_CYAN}▶ Delega test e type-check a check-all.sh${C_RESET}"
    "$ROOT_DIR/check-all.sh"
    check_all_code=$?
    if [[ $check_all_code -eq 0 ]]; then
      echo "${C_GREEN}✔ check-all.sh — PASS${C_RESET}"
      SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  ecosystem :: check-all.sh")
    else
      echo "${C_RED}✘ check-all.sh — FAIL (exit ${check_all_code})${C_RESET}"
      SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ecosystem :: check-all.sh")
      OVERALL_STATUS=1
    fi
  else
    MVN="$(mvn_cmd)" || MVN=""
    if [[ -n "$MVN" ]]; then
      pushd "$ROOT_DIR/velvet" >/dev/null
      run_step fail velvet "Test Maven" "$MVN" -q -B test
      popd >/dev/null
    fi
    if [[ -d "$ROOT_DIR/velvet-frontend/node_modules" ]]; then
      pushd "$ROOT_DIR/velvet-frontend" >/dev/null
      run_step fail velvet-frontend "Test Vitest" npm run test --silent
      popd >/dev/null
    fi
    if command -v flutter >/dev/null 2>&1; then
      pushd "$ROOT_DIR/velvet-app" >/dev/null
      run_step fail velvet-app "Test Flutter" flutter test
      popd >/dev/null
    fi
  fi
fi

# =============================================================================
# [3/4] Allineamento flussi critici
# =============================================================================
if [[ "$RUN_FLOWS" -eq 1 ]]; then
  print_header "[3/4] Allineamento flussi BE ↔ FE ↔ UI"

  echo ""
  echo "${C_BOLD}Flussi obbligatori (auth, pubblico, account, GDPR)${C_RESET}"

  assert_grep fail flows "Auth login BE" '/api/v1/auth/login' \
    "$ROOT_DIR/velvet/src/main/java"
  assert_grep fail flows "Auth login FE" '/api/v1/auth/login' \
    "$ROOT_DIR/velvet-frontend/src"
  assert_grep fail flows "Auth refresh BE+FE" '/api/v1/auth/refresh' \
    "$ROOT_DIR/velvet/src" "$ROOT_DIR/velvet-frontend/src"

  assert_grep fail flows "Ricerca geolocalizzata (public locate)" '/api/v1/public' \
    "$ROOT_DIR/velvet/src/main/java/it/velvet/publicapi"
  assert_grep fail flows "Locate FE" 'locate' \
    "$ROOT_DIR/velvet-frontend/src/api/locate.ts" \
    "$ROOT_DIR/velvet-frontend/src/pages/SearchPage.tsx"

  assert_grep fail flows "Profilo salone pubblico BE" '/api/v1/public/organizations' \
    "$ROOT_DIR/velvet/src/main/java"
  assert_grep fail flows "Link email prenotazione BE" 'consumer-appointments-path|buildConsumerAppointmentUrl' \
    "$ROOT_DIR/velvet/src/main/java/it/velvet/notification/service/ScheduledNotificationProcessor.java"
  assert_grep fail flows "Dettaglio prenotazione FE" '/account/prenotazioni/' \
    "$ROOT_DIR/velvet-frontend/src/pages/account/AppointmentDetailPage.tsx"

  assert_grep fail flows "Eliminazione account BE (DELETE)" \
    '@DeleteMapping|deleteMapping|/api/v1/me/account' \
    "$ROOT_DIR/velvet/src/main/java/it/velvet/consumer/api/MeAccountController.java"
  assert_grep fail flows "Eliminazione account FE (API)" \
    '"/api/v1/me/account"' \
    "$ROOT_DIR/velvet-frontend/src/pages/account/ProfilePage.tsx"
  assert_grep fail flows "Pagina elimina account (routing)" \
    'elimina-account|AccountDeletionPage' \
    "$ROOT_DIR/velvet-frontend/src/App.tsx"
  assert_file fail flows "AccountDeletionPage.tsx" \
    "$ROOT_DIR/velvet-frontend/src/pages/legal/AccountDeletionPage.tsx"

  assert_grep fail flows "Export dati GDPR BE" '/api/v1/me/data-export' \
    "$ROOT_DIR/velvet/src/main/java"
  assert_grep fail flows "Export dati GDPR FE" '/api/v1/me/data-export' \
    "$ROOT_DIR/velvet-frontend/src"

  assert_grep warn flows "Informativa privacy (route)" '"/privacy"' \
    "$ROOT_DIR/velvet-frontend/src/App.tsx"
  assert_grep warn flows "Termini di servizio (route)" '"/termini"' \
    "$ROOT_DIR/velvet-frontend/src/App.tsx"

  # Radar: controller base non referenziati nel FE (solo informativo)
  echo ""
  echo "${C_BOLD}Radar API: base @RequestMapping nel BE senza occorrenza nel FE${C_RESET}"

  BE_BASES_FILE="$(mktemp)"
  FE_SCAN_DIR="$ROOT_DIR/velvet-frontend/src"
  trap 'rm -f "$BE_BASES_FILE"' EXIT

  grep -rhE '@RequestMapping\("(/api/v1[^"]+)"\)' "$ROOT_DIR/velvet/src/main/java" 2>/dev/null \
    | sed -E 's/.*@RequestMapping\("([^"]+)".*/\1/' \
    | sort -u > "$BE_BASES_FILE" || true

  MISSING_API=()
  while IFS= read -r base; do
    [[ -z "$base" ]] && continue
    if is_api_be_only "$base"; then
      continue
    fi
    if ! grep -rqF "$base" "$FE_SCAN_DIR" 2>/dev/null; then
      MISSING_API+=("$base")
    fi
  done < "$BE_BASES_FILE"

  if [[ ${#MISSING_API[@]} -eq 0 ]]; then
    echo "${C_GREEN}✔ Tutte le base API @RequestMapping risultano referenziate nel FE (o in allowlist).${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  flows :: radar API base")
  else
    echo "${C_YELLOW}⚠ Base API senza stringa corrispondente in velvet-frontend/src (può essere normale se path costruiti dinamicamente):${C_RESET}"
    for p in "${MISSING_API[@]}"; do
      echo "     - $p"
    done
    SUMMARY+=("${C_YELLOW}⚠ WARN${C_RESET}  flows :: ${#MISSING_API[@]} base API non trovate nel FE")
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# =============================================================================
# [4/4] App Store & Play Store (WebView shell)
# =============================================================================
if [[ "$RUN_STORE" -eq 1 ]]; then
  print_header "[4/4] Compliance App Store e Play Store"

  assert_grep fail store "DELETE account API nel backend" 'me/account' \
    "$ROOT_DIR/velvet/src/main/java/it/velvet/consumer/api/MeAccountController.java"
  assert_grep fail store "Chiamata DELETE account nel frontend" \
    'method:\s*"DELETE"|method: "DELETE"' \
    "$ROOT_DIR/velvet-frontend/src/pages/account/ProfilePage.tsx"
  assert_grep fail store "Percorso pubblico elimina account" \
    'deleteAccount:\s*"/privacy/elimina-account"|/privacy/elimina-account' \
    "$ROOT_DIR/velvet-frontend/src/content/velvetLegalPanelPaths.ts" \
    "$ROOT_DIR/velvet-frontend/src/App.tsx"
  assert_grep warn store "Riferimenti linee guida store nel copy legale" \
    'STORE_LEGAL_CITATIONS|App Store|Google Play' \
    "$ROOT_DIR/velvet-frontend/src/pages/legal" \
    "$ROOT_DIR/velvet-frontend/src/content"

  assert_file fail store "velvet_domain_guard.dart" \
    "$ROOT_DIR/velvet-app/lib/security/velvet_domain_guard.dart"
  assert_grep fail store "Domain guard usato nella WebView" \
    'VelvetDomainGuard\.isAllowedNavigation' \
    "$ROOT_DIR/velvet-app/lib/shell/velvet_web_shell.dart"
  assert_grep fail store "Config base URL app" \
    'webBaseUrl|SITE_BASE_URL|VelvetAppConfig' \
    "$ROOT_DIR/velvet-app/lib/config/velvet_app_config.dart"

  assert_grep warn store "Link legali con embed per in-app" 'embed=1' \
    "$ROOT_DIR/velvet-frontend/src/content/velvetLegalPanelPaths.ts"

  echo ""
  echo "${C_CYAN}▶ [store] Paywall nativo senza prezzo abbonamento (Apple 3.1.1)${C_RESET}"
  if grep -qE 'AL MESE|_PriceBlock|Passa a' "$ROOT_DIR/velvet-app/lib/shell/velvet_premium_paywall_dialog.dart" 2>/dev/null; then
    echo "${C_RED}✘ [store] Paywall nativo contiene prezzo o CTA commerciale — rimuovere prima dell'invio${C_RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    OVERALL_STATUS=1
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  store :: Paywall nativo prezzo abbonamento")
  else
    echo "${C_GREEN}✔ [store] Paywall nativo senza prezzo abbonamento (Apple 3.1.1) — PASS${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  store :: Paywall nativo senza prezzo abbonamento")
  fi

  if command -v flutter >/dev/null 2>&1; then
    pushd "$ROOT_DIR/velvet-app" >/dev/null
    run_step warn store "Flutter analyze (shell)" flutter analyze
    if [[ "$RUN_TESTS" -eq 0 || "$USE_CHECK_ALL" -eq 0 ]]; then
      run_step fail store "Flutter test (shell)" flutter test
    else
      echo "${C_GREEN}✔ [store] Flutter test già coperti da check-all.sh${C_RESET}"
      SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  store :: Flutter test (via check-all)")
    fi
    popd >/dev/null
  else
    echo "${C_YELLOW}⚠ [store] flutter non in PATH — test shell saltati${C_RESET}"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# =============================================================================
# Riepilogo
# =============================================================================
print_header "Riepilogo audit"
for line in "${SUMMARY[@]}"; do
  echo "  $line"
done
echo ""

if [[ "$OVERALL_STATUS" -eq 0 ]]; then
  if [[ "$WARN_COUNT" -gt 0 ]]; then
    echo "${C_GREEN}${C_BOLD}✔ Audit superato con ${WARN_COUNT} avviso/i (vedi WARN sopra).${C_RESET}"
  else
    echo "${C_GREEN}${C_BOLD}✔ Audit superato — nessun fallimento critico.${C_RESET}"
  fi
else
  echo "${C_RED}${C_BOLD}✘ Audit fallito — correggere le voci FAIL prima di release / invio store.${C_RESET}"
fi

echo ""
echo "${C_CYAN}Go-Live:${C_RESET} quando il prodotto è pronto per produzione, esegui anche ${C_BOLD}./go-live-check.sh${C_RESET}"
echo "        (placeholder legali, segreti JWT, .env Docker, checklist completa — vedi docs/GO_LIVE.md)"

exit "$OVERALL_STATUS"
