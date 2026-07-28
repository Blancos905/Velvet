#!/usr/bin/env bash
#
# luxury-backend-maintenance.sh — Manutenzione meccanica del backend Luxury (Java)
#
# Inventario, smell statici, security radar, CodeGraph sync/status, test Maven.
# Pensato per essere lanciato dall'agent Cursor sul trigger «manutenzione backend».
# NON sostituisce l'esplorazione package-by-package con CodeGraph (vedi skill).
#
# Uso:
#   ./luxury-backend-maintenance.sh           # completo (smells + codegraph + mvn test)
#   ./luxury-backend-maintenance.sh --fast    # senza mvn test
#   ./luxury-backend-maintenance.sh --smells  # solo smell / inventory / security
#   ./luxury-backend-maintenance.sh --codegraph
#   ./luxury-backend-maintenance.sh --test
#   ./luxury-backend-maintenance.sh --help
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_SMELLS=1
RUN_CODEGRAPH=1
RUN_TEST=1

for arg in "$@"; do
  case "$arg" in
    --fast) RUN_TEST=0 ;;
    --smells) RUN_CODEGRAPH=0; RUN_TEST=0 ;;
    --codegraph) RUN_SMELLS=0; RUN_TEST=0 ;;
    --test) RUN_SMELLS=0; RUN_CODEGRAPH=0 ;;
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

OVERALL_STATUS=0
WARN_COUNT=0
declare -a SUMMARY=()

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_RED=$'\033[1;31m'
  C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[1;34m'
  C_BOLD=$'\033[1m'
else
  C_RESET="" C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_BOLD=""
fi

print_header() {
  echo ""
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
  echo "${C_BLUE}${C_BOLD}  $1${C_RESET}"
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
}

pass() {
  SUMMARY+=("PASS|$1|$2")
  echo "${C_GREEN}PASS${C_RESET}  [$1] $2"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  SUMMARY+=("WARN|$1|$2")
  echo "${C_YELLOW}WARN${C_RESET}  [$1] $2"
}

fail() {
  OVERALL_STATUS=1
  SUMMARY+=("FAIL|$1|$2")
  echo "${C_RED}FAIL${C_RESET}  [$1] $2"
}

JAVA_MAIN="luxury/src/main/java"
JAVA_TEST="luxury/src/test/java"
CG_BIN="devtools/codegraph/node_modules/.bin/codegraph"

# ---------------------------------------------------------------------------
# Inventory + smells
# ---------------------------------------------------------------------------
if [[ "$RUN_SMELLS" -eq 1 ]]; then
  print_header "1. Inventario backend (luxury/)"

  MAIN_JAVA=$(find "$JAVA_MAIN" -name '*.java' | wc -l | tr -d ' ')
  TEST_JAVA=$(find "$JAVA_TEST" -name '*.java' 2>/dev/null | wc -l | tr -d ' ')
  CONTROLLERS=$(rg -l '@RestController' "$JAVA_MAIN" --glob '*.java' 2>/dev/null | wc -l | tr -d ' ')
  SERVICES=$(rg -l '@Service' "$JAVA_MAIN" --glob '*.java' 2>/dev/null | wc -l | tr -d ' ')
  REPOS=$(find "$JAVA_MAIN" -name '*Repository.java' | wc -l | tr -d ' ')
  ENTITIES=$(rg -l '@Entity' "$JAVA_MAIN" --glob '*.java' 2>/dev/null | wc -l | tr -d ' ')
  JOBS=$(rg -l '@Scheduled' "$JAVA_MAIN" --glob '*.java' 2>/dev/null | wc -l | tr -d ' ')
  SQL_PATCHES=$(find luxury/deploy/sql -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')

  echo "  Java main:     $MAIN_JAVA"
  echo "  Java test:     $TEST_JAVA"
  echo "  Controllers:   $CONTROLLERS"
  echo "  Services:      $SERVICES"
  echo "  Repositories:  $REPOS"
  echo "  Entities:      $ENTITIES"
  echo "  @Scheduled:    $JOBS"
  echo "  SQL patches:   $SQL_PATCHES"

  if [[ "$MAIN_JAVA" -ge 300 && "$CONTROLLERS" -ge 30 && "$SERVICES" -ge 70 ]]; then
    pass "inventory" "scala attesa ($MAIN_JAVA java, $CONTROLLERS ctrl, $SERVICES svc)"
  else
    warn "inventory" "conteggi anomali rispetto alla baseline (main=$MAIN_JAVA ctrl=$CONTROLLERS svc=$SERVICES)"
  fi

  print_header "2. Smell statici"

  # ResponseStatusException (convenzione: BusinessException)
  RSE_FILES=$(rg -l 'ResponseStatusException' "$JAVA_MAIN" --glob '*.java' 2>/dev/null || true)
  if [[ -z "$RSE_FILES" ]]; then
    pass "exceptions" "nessun ResponseStatusException"
  else
    KNOWN_RSE=0
    UNKNOWN_RSE=0
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      case "$f" in
        *PublicOrganizationController.java|*PublicOperatorController.java)
          KNOWN_RSE=$((KNOWN_RSE + 1))
          ;;
        *)
          UNKNOWN_RSE=$((UNKNOWN_RSE + 1))
          fail "exceptions" "ResponseStatusException non legacy in $f"
          ;;
      esac
    done <<< "$RSE_FILES"
    if [[ "$UNKNOWN_RSE" -eq 0 ]]; then
      warn "exceptions" "ResponseStatusException legacy in PublicOrganization/PublicOperator ($KNOWN_RSE file) — migrare a BusinessException"
    fi
  fi

  # System.out / printStackTrace
  NOISY=$(rg -n 'System\.out\.|printStackTrace\(' "$JAVA_MAIN" --glob '*.java' 2>/dev/null || true)
  if [[ -z "$NOISY" ]]; then
    pass "logging" "niente System.out / printStackTrace"
  else
    fail "logging" "System.out o printStackTrace trovati"
    echo "$NOISY" | head -20
  fi

  # TODO/FIXME
  TODOS=$(rg -n 'TODO|FIXME' "$JAVA_MAIN" --glob '*.java' 2>/dev/null || true)
  if [[ -z "$TODOS" ]]; then
    pass "todos" "nessun TODO/FIXME in main"
  else
    warn "todos" "TODO/FIXME presenti ($(echo "$TODOS" | wc -l | tr -d ' ') righe)"
    echo "$TODOS" | head -15
  fi

  # @Transactional su controller
  TX_CTRL=$(rg -l '@Transactional' "$JAVA_MAIN" --glob '*Controller*.java' 2>/dev/null || true)
  if [[ -z "$TX_CTRL" ]]; then
    pass "tx-controller" "nessun @Transactional su Controller"
  else
    warn "tx-controller" "@Transactional su controller (preferire service):"
    echo "$TX_CTRL"
  fi

  # Secret-like defaults (solo warning se noti)
  if rg -q 'luxury-dev-token-secret-change-in-production' "$JAVA_MAIN/it/luxury/config/LuxurySecurityProperties.java" 2>/dev/null; then
    warn "secrets" "default JWT secret di sviluppo in LuxurySecurityProperties — verificare override produzione"
  fi

  # Hardcoded password/apiKey literals (escludi property defaults vuoti)
  HARD=$(rg -n '(password|apiKey|api_key|secret)\s*=\s*"[^"]{8,}"' "$JAVA_MAIN" --glob '*.java' -i 2>/dev/null \
    | rg -v 'luxury-dev-token-secret|change-in-production|password = ""|webhookSecret = ""' || true)
  if [[ -z "$HARD" ]]; then
    pass "secrets" "nessun literal secret sospetto oltre i default documentati"
  else
    fail "secrets" "possibili secret hardcoded"
    echo "$HARD" | head -20
  fi

  print_header "3. Security / API radar"

  if [[ -f "$JAVA_MAIN/it/luxury/config/SecurityConfiguration.java" ]]; then
    pass "security-config" "SecurityConfiguration presente"
    echo "  permitAll / matchers:"
    rg -n 'requestMatchers|hasAuthority|authenticated|permitAll' \
      "$JAVA_MAIN/it/luxury/config/SecurityConfiguration.java" | sed 's/^/    /'
  else
    fail "security-config" "SecurityConfiguration assente"
  fi

  # Controllers pubblici attesi senza PreAuthorize
  echo ""
  echo "  Controller senza @PreAuthorize (review manuale se non public/admin/dev):"
  while IFS= read -r f; do
    if ! rg -q '@PreAuthorize' "$f"; then
      rel="${f#"$ROOT_DIR"/}"
      case "$rel" in
        *publicapi*|*security/api*|*billing/api/StripeWebhook*|*dev/*|*admin/api*)
          echo "    (atteso) $rel"
          ;;
        *)
          warn "preauthorize" "controller senza @PreAuthorize: $rel"
          ;;
      esac
    fi
  done < <(find "$JAVA_MAIN" -name '*Controller.java')

  # Job list
  echo ""
  echo "  Job @Scheduled:"
  rg -n '@Scheduled' "$JAVA_MAIN" --glob '*.java' -A1 | sed 's/^/    /' || true

  # Namespace RequestMapping inventory
  echo ""
  echo "  @RequestMapping su controller (radar namespace):"
  rg -n '@RequestMapping\(' "$JAVA_MAIN" --glob '*Controller*.java' | sed 's/^/    /' || true
fi

# ---------------------------------------------------------------------------
# CodeGraph
# ---------------------------------------------------------------------------
if [[ "$RUN_CODEGRAPH" -eq 1 ]]; then
  print_header "4. CodeGraph sync + status + blast symbols"

  if [[ ! -x "$CG_BIN" ]]; then
    warn "codegraph" "CLI non trovato in $CG_BIN — esegui npm install in devtools/codegraph"
  else
    if "$CG_BIN" sync >/tmp/luxury-cg-sync.log 2>&1; then
      pass "codegraph-sync" "sync completato"
    else
      fail "codegraph-sync" "sync fallito (vedi /tmp/luxury-cg-sync.log)"
    fi

    echo ""
    "$CG_BIN" status || warn "codegraph-status" "status fallito"

    BLAST_SYMBOLS=(
      StudioGroupOwnerResolver
      SalonLocationAccessService
      AppointmentBookingService
      AvailabilityService
      SalonPremiumEntitlementService
      StripeWebhookProcessor
      SalonSubscriptionLifecycleService
      SalonLuxuryChatService
      MeSalonNotificationInboxService
      AppointmentNotificationService
      SecurityConfiguration
      GlobalExceptionHandler
    )

    echo ""
    echo "  Blast radius (prime righe explore):"
    for sym in "${BLAST_SYMBOLS[@]}"; do
      echo "  ---- $sym ----"
      if ! "$CG_BIN" explore "$sym" 2>/dev/null | rg -A6 'Blast radius|Found [0-9]+ symbols' | head -12; then
        # explore può non avere sezione blast: mostra header
        "$CG_BIN" explore "$sym" 2>/dev/null | head -8 || warn "codegraph-explore" "explore fallito per $sym"
      fi
    done
    pass "codegraph-explore" "explore eseguito su ${#BLAST_SYMBOLS[@]} simboli critici"
  fi
fi

# ---------------------------------------------------------------------------
# Maven tests
# ---------------------------------------------------------------------------
if [[ "$RUN_TEST" -eq 1 ]]; then
  print_header "5. Maven test (luxury/)"

  if [[ ! -x luxury/mvnw ]]; then
    fail "mvn" "luxury/mvnw non eseguibile"
  else
    if (cd luxury && ./mvnw -q test); then
      pass "mvn-test" "tutti i test Java passati"
    else
      fail "mvn-test" "fallimento ./mvnw test"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "Riepilogo manutenzione backend"

FAIL_N=0
PASS_N=0
for row in "${SUMMARY[@]}"; do
  status="${row%%|*}"
  rest="${row#*|}"
  mod="${rest%%|*}"
  msg="${rest#*|}"
  printf "  %-5s %-18s %s\n" "$status" "$mod" "$msg"
  case "$status" in
    FAIL) FAIL_N=$((FAIL_N + 1)) ;;
    PASS) PASS_N=$((PASS_N + 1)) ;;
  esac
done

echo ""
echo "  PASS=$PASS_N  WARN=$WARN_COUNT  FAIL=$FAIL_N"
echo ""
echo "  Prossimo passo agent: checklist package-by-package in"
echo "  .cursor/skills/manutenzione-backend/CHECKLIST.md"
echo ""

exit "$OVERALL_STATUS"
