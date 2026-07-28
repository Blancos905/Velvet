#!/usr/bin/env bash
#
# luxury-app-maintenance.sh — Manutenzione meccanica dell'app Luxury (Flutter)
#
# Inventario, smell, domain guard / Free path radar, CodeGraph, flutter analyze/test.
# Trigger Cursor: «manutenzione app».
# NON sostituisce la checklist CodeGraph modulo-by-modulo (vedi skill).
#
# Uso:
#   ./luxury-app-maintenance.sh           # completo
#   ./luxury-app-maintenance.sh --fast    # senza flutter test/analyze
#   ./luxury-app-maintenance.sh --smells
#   ./luxury-app-maintenance.sh --codegraph
#   ./luxury-app-maintenance.sh --test
#   ./luxury-app-maintenance.sh --help
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

APP_LIB="luxury-app/lib"
APP_TEST="luxury-app/test"
GUARDS_JSON="luxury-app/assets/luxury_subscription_guards.json"
FE_GUARDS="luxury-frontend/src/lib/subscription-guards.ts"
CG_BIN="devtools/codegraph/node_modules/.bin/codegraph"

# ---------------------------------------------------------------------------
if [[ "$RUN_SMELLS" -eq 1 ]]; then
  print_header "1. Inventario app (luxury-app/)"

  DART_LIB=$(find "$APP_LIB" -name '*.dart' | wc -l | tr -d ' ')
  DART_TEST=$(find "$APP_TEST" -name '*.dart' 2>/dev/null | wc -l | tr -d ' ')
  BRIDGES=$(find "$APP_LIB" -name '*bridge*.dart' | wc -l | tr -d ' ')
  SHELL=$(find "$APP_LIB/shell" -name '*.dart' 2>/dev/null | wc -l | tr -d ' ')

  echo "  Dart lib:     $DART_LIB"
  echo "  Dart test:    $DART_TEST"
  echo "  Shell files:  $SHELL"
  echo "  Bridges:      $BRIDGES"

  if [[ "$DART_LIB" -ge 25 && "$DART_LIB" -le 80 ]]; then
    pass "inventory" "scala shell attesa ($DART_LIB dart in lib/)"
  else
    warn "inventory" "conteggio dart anomalo per una shell WebView (lib=$DART_LIB) — verificare UI duplicata"
  fi

  if [[ "$DART_LIB" -gt 100 ]]; then
    fail "inventory" "troppi file Dart ($DART_LIB): rischio logica UI duplicata fuori WebView"
  fi

  if [[ "$DART_TEST" -lt 3 ]]; then
    warn "tests-count" "pochi test ($DART_TEST)"
  else
    pass "tests-count" "test file=$DART_TEST (baseline: jwt + free policy + widget)"
  fi

  print_header "2. Smell statici + architettura shell"

  TODOS=$(rg -n 'TODO|FIXME' "$APP_LIB" --glob '*.dart' 2>/dev/null || true)
  if [[ -z "$TODOS" ]]; then
    pass "todos" "nessun TODO/FIXME"
  else
    warn "todos" "TODO/FIXME presenti"
    echo "$TODOS" | head -15 | sed 's/^/    /'
  fi

  # print( vs debugPrint — print è smell
  PRINTS=$(rg -n '(^|[^a-zA-Z])print\(' "$APP_LIB" --glob '*.dart' 2>/dev/null || true)
  if [[ -z "$PRINTS" ]]; then
    pass "print" "nessun print() (solo debugPrint atteso)"
  else
    fail "print" "print() trovato — usare debugPrint"
    echo "$PRINTS" | head -10 | sed 's/^/    /'
  fi

  # Token logging
  TOKEN_LOG=$(rg -n 'debugPrint.*[Tt]oken|FCM token =' "$APP_LIB" --glob '*.dart' 2>/dev/null || true)
  if [[ -n "$TOKEN_LOG" ]]; then
    warn "token-log" "log di token FCM/sessione via debugPrint — ok in debug, verificare assenza in release profiling"
    echo "$TOKEN_LOG" | head -8 | sed 's/^/    /'
  else
    pass "token-log" "nessun log token evidente"
  fi

  # Core files
  for f in \
    "$APP_LIB/main.dart" \
    "$APP_LIB/shell/free_account_wrapper.dart" \
    "$APP_LIB/shell/luxury_web_shell.dart" \
    "$APP_LIB/security/luxury_domain_guard.dart" \
    "$APP_LIB/config/luxury_app_config.dart" \
    "$APP_LIB/config/luxury_subscription_guards.dart" \
    "$APP_LIB/free/luxury_free_plan_policy.dart" \
    "$APP_LIB/push/luxury_fcm_service.dart" \
    "$GUARDS_JSON"
  do
    if [[ -f "$f" ]]; then
      echo "    ok ${f#luxury-app/}"
    else
      fail "core-files" "manca $f"
    fi
  done
  if ! printf '%s\n' "${SUMMARY[@]}" | rg -q '^FAIL\|core-files\|'; then
    pass "core-files" "file core shell/security/guards/FCM presenti"
  fi

  # JS channels: declaration vs registration
  print_header "3. Bridge channels + domain/Free radar"

  echo "  Channel dichiarati:"
  rg -n 'channelName\s*=' "$APP_LIB" --glob '*.dart' | sed 's/^/    /' || true

  for ch in LuxuryNativeGeolocation LuxuryProfileMenu LuxuryPaywall; do
    if rg -q "$ch" "$APP_LIB/shell/luxury_web_shell.dart"; then
      echo "    ok registrato in shell: $ch"
    else
      fail "channels" "channel $ch non referenziato in luxury_web_shell.dart"
    fi
  done
  if ! printf '%s\n' "${SUMMARY[@]}" | rg -q '^FAIL\|channels\|'; then
    pass "channels" "canali JS principali referenziati in LuxuryWebShell"
  fi

  if rg -q 'onNavigationRequest|LuxuryDomainGuard' "$APP_LIB/shell/luxury_web_shell.dart"; then
    pass "nav-guard" "navigation request + domain guard collegati"
  else
    fail "nav-guard" "LuxuryWebShell senza domain guard / onNavigationRequest"
  fi

  # Free blocked paths must appear in JSON
  if [[ -f "$GUARDS_JSON" ]]; then
    for p in '/account/chat' '/account/salone/staff' '/account/salone/statistiche' '/admin'; do
      if rg -q "$p" "$GUARDS_JSON"; then
        echo "    ok blocked/listed in guards JSON: $p"
      else
        warn "free-paths" "path $p non trovato in guards JSON — verificare policy"
      fi
    done
    pass "guards-json" "asset luxury_subscription_guards.json leggibile"
  else
    fail "guards-json" "asset guards assente"
  fi

  # FE alignment presence
  if [[ -f "$FE_GUARDS" ]]; then
    if rg -q 'SUBSCRIPTION_GUARDS|subscription-guards|freeOwner' "$FE_GUARDS"; then
      pass "guards-fe" "FE subscription-guards.ts presente (sync manuale in checklist)"
    else
      warn "guards-fe" "FE guards file senza marker attesi"
    fi
  else
    warn "guards-fe" "manca $FE_GUARDS"
  fi

  # pubspec asset
  if rg -q 'luxury_subscription_guards.json' luxury-app/pubspec.yaml; then
    pass "pubspec-asset" "guards JSON dichiarato in pubspec assets"
  else
    fail "pubspec-asset" "guards JSON non in pubspec.yaml assets"
  fi

  # Secrets in repo (fail if key.properties tracked by git)
  if git ls-files --error-unmatch luxury-app/android/key.properties >/dev/null 2>&1; then
    fail "secrets" "android/key.properties è tracciato da git"
  else
    pass "secrets" "key.properties non tracciato (ok se solo locale)"
  fi
  if git ls-files --error-unmatch 'luxury-app/android/*.jks' >/dev/null 2>&1 \
    || git ls-files --error-unmatch 'luxury-app/android/upload-keystore.jks' >/dev/null 2>&1; then
    fail "secrets" "keystore .jks tracciato da git"
  else
    pass "secrets-jks" "keystore non tracciato da git"
  fi

  # UA marker
  if rg -q 'SaloniLuxuryApp' "$APP_LIB/shell/luxury_web_shell.dart"; then
    pass "ua" "User-Agent include SaloniLuxuryApp"
  else
    fail "ua" "manca marker SaloniLuxuryApp nell'UA WebView"
  fi

  # Suspicious large UI widgets (heuristic): Material pages with many Scaffold routes
  HEAVY=$(rg -l 'class \w+Page extends' "$APP_LIB" --glob '*.dart' 2>/dev/null || true)
  if [[ -z "$HEAVY" ]]; then
    pass "no-ui-pages" "nessuna *Page Flutter — shell ok"
  else
    warn "no-ui-pages" "trovate classi *Page — verificare non siano UI prodotto duplicate"
    echo "$HEAVY" | sed 's/^/    /'
  fi
fi

# ---------------------------------------------------------------------------
if [[ "$RUN_CODEGRAPH" -eq 1 ]]; then
  print_header "4. CodeGraph sync + blast symbols"

  if [[ ! -x "$CG_BIN" ]]; then
    warn "codegraph" "CLI non trovato in $CG_BIN"
  else
    if "$CG_BIN" sync >/tmp/luxury-cg-sync-app.log 2>&1; then
      pass "codegraph-sync" "sync completato"
    else
      fail "codegraph-sync" "sync fallito (vedi /tmp/luxury-cg-sync-app.log)"
    fi

    echo ""
    "$CG_BIN" status || warn "codegraph-status" "status fallito"

    BLAST_SYMBOLS=(
      FreeAccountWrapper
      LuxuryWebShell
      LuxuryDomainGuard
      LuxuryAppConfig
      LuxurySubscriptionGuards
      LuxuryFreePlanPolicy
      LuxuryNativeAppWebBridge
      LuxuryFcmService
      LuxurySessionController
      LuxuryGeolocationWebBridge
      LuxuryAppLinkListener
      LuxuryJwt
    )

    echo ""
    echo "  Blast radius (prime righe explore):"
    for sym in "${BLAST_SYMBOLS[@]}"; do
      echo "  ---- $sym ----"
      if ! "$CG_BIN" explore "$sym" 2>/dev/null | rg -A6 'Blast radius|Found [0-9]+ symbols' | head -12; then
        "$CG_BIN" explore "$sym" 2>/dev/null | head -8 || warn "codegraph-explore" "explore fallito per $sym"
      fi
    done
    pass "codegraph-explore" "explore eseguito su ${#BLAST_SYMBOLS[@]} simboli critici"
  fi
fi

# ---------------------------------------------------------------------------
if [[ "$RUN_TEST" -eq 1 ]]; then
  print_header "5. flutter analyze + flutter test"

  if ! command -v flutter >/dev/null 2>&1; then
    fail "flutter" "flutter non nel PATH"
  else
    if (cd luxury-app && flutter analyze); then
      pass "analyze" "flutter analyze ok"
    else
      fail "analyze" "flutter analyze fallito"
    fi
    if (cd luxury-app && flutter test); then
      pass "test" "flutter test ok"
    else
      fail "test" "flutter test fallito"
    fi
  fi
fi

# ---------------------------------------------------------------------------
print_header "Riepilogo manutenzione app"

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
echo "  Prossimo passo agent: checklist modulo-by-modulo in"
echo "  .cursor/skills/manutenzione-app/CHECKLIST.md"
echo ""

exit "$OVERALL_STATUS"
