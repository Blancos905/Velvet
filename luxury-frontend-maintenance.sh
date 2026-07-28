#!/usr/bin/env bash
#
# luxury-frontend-maintenance.sh — Manutenzione meccanica del frontend Luxury (React/TS)
#
# Inventario, smell statici, routing radar, CodeGraph sync/status, vitest + tsc.
# Pensato per il trigger Cursor «manutenzione frontend».
# NON sostituisce l'esplorazione area-by-area con CodeGraph (vedi skill).
#
# Uso:
#   ./luxury-frontend-maintenance.sh           # completo (smells + codegraph + test/build check)
#   ./luxury-frontend-maintenance.sh --fast    # senza vitest/tsc
#   ./luxury-frontend-maintenance.sh --smells  # solo smell / inventory / routes
#   ./luxury-frontend-maintenance.sh --codegraph
#   ./luxury-frontend-maintenance.sh --test
#   ./luxury-frontend-maintenance.sh --help
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

FE_SRC="luxury-frontend/src"
CG_BIN="devtools/codegraph/node_modules/.bin/codegraph"

# ---------------------------------------------------------------------------
# Inventory + smells
# ---------------------------------------------------------------------------
if [[ "$RUN_SMELLS" -eq 1 ]]; then
  print_header "1. Inventario frontend (luxury-frontend/)"

  TS_ALL=$(find "$FE_SRC" -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l | tr -d ' ')
  TSX=$(find "$FE_SRC" -name '*.tsx' | wc -l | tr -d ' ')
  TS=$(find "$FE_SRC" -name '*.ts' | wc -l | tr -d ' ')
  PAGES=$(find "$FE_SRC/pages" -name '*.tsx' 2>/dev/null | wc -l | tr -d ' ')
  HOOKS=$(find "$FE_SRC/hooks" -name 'use*.ts*' 2>/dev/null | wc -l | tr -d ' ')
  API=$(find "$FE_SRC/api" -name '*.ts' 2>/dev/null | wc -l | tr -d ' ')
  LIB=$(find "$FE_SRC/lib" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null | wc -l | tr -d ' ')
  TESTS=$(find luxury-frontend -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) | wc -l | tr -d ' ')
  CSS=$(find "$FE_SRC/styles" -name '*.css' 2>/dev/null | wc -l | tr -d ' ')
  AUTH_USE=$(rg -l 'useLuxuryAuth' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null | wc -l | tr -d ' ')

  echo "  TS/TSX:        $TS_ALL  (tsx=$TSX ts=$TS)"
  echo "  Pages:         $PAGES"
  echo "  Hooks:         $HOOKS"
  echo "  API modules:   $API"
  echo "  Lib modules:   $LIB"
  echo "  Styles CSS:    $CSS"
  echo "  Vitest files:  $TESTS"
  echo "  useLuxuryAuth: $AUTH_USE file"

  if [[ "$TS_ALL" -ge 300 && "$PAGES" -ge 40 ]]; then
    pass "inventory" "scala attesa ($TS_ALL ts/tsx, $PAGES pages)"
  else
    warn "inventory" "conteggi anomali (ts=$TS_ALL pages=$PAGES)"
  fi

  if [[ "$TESTS" -lt 20 ]]; then
    warn "tests-count" "pochi test Vitest ($TESTS) rispetto a $TS_ALL file sorgente"
  else
    pass "tests-count" "copertura test file=$TESTS"
  fi

  print_header "2. Smell statici"

  # window.confirm / alert in account (anti-pattern prodotto)
  CONFIRM=$(rg -n 'window\.confirm\(' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$CONFIRM" ]]; then
    pass "confirm" "nessun window.confirm"
  else
    KNOWN=0
    UNKNOWN=0
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      case "$line" in
        *TrustedSalonsPage*)
          KNOWN=$((KNOWN + 1))
          ;;
        *)
          UNKNOWN=$((UNKNOWN + 1))
          fail "confirm" "window.confirm non legacy: $line"
          ;;
      esac
    done <<< "$CONFIRM"
    if [[ "$UNKNOWN" -eq 0 ]]; then
      warn "confirm" "window.confirm legacy in TrustedSalonsPage ($KNOWN) — migrare a modale branded"
    fi
  fi

  ALERTS=$(rg -n 'window\.alert\(' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$ALERTS" ]]; then
    pass "alert" "nessun window.alert"
  else
    warn "alert" "window.alert presenti ($(echo "$ALERTS" | wc -l | tr -d ' ') righe) — preferire toast/modale"
    echo "$ALERTS" | head -15 | sed 's/^/    /'
  fi

  # console.log
  LOGS=$(rg -n 'console\.(log|debug)\(' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$LOGS" ]]; then
    pass "console" "nessun console.log/debug"
  else
    warn "console" "console.log/debug presenti ($(echo "$LOGS" | wc -l | tr -d ' ') righe)"
    echo "$LOGS" | head -15 | sed 's/^/    /'
  fi

  # TODO/FIXME
  TODOS=$(rg -n 'TODO|FIXME' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$TODOS" ]]; then
    pass "todos" "nessun TODO/FIXME"
  else
    warn "todos" "TODO/FIXME presenti ($(echo "$TODOS" | wc -l | tr -d ' ') righe)"
    echo "$TODOS" | head -15 | sed 's/^/    /'
  fi

  # JWT atob fuori da auth/ + lib documentati
  echo ""
  echo "  JWT atob / payload parse:"
  JWT_PARSE=$(rg -n 'atob\(' "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$JWT_PARSE" ]]; then
    pass "jwt-parse" "nessun atob"
  else
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      case "$line" in
        */auth/*|*/lib/realmRolesFromAccessToken*|*/lib/luxuryJwtHintsFromAccessToken*|*/lib/luxuryAccessTokenExpiry*|*/lib/trustedSalonsNavBadge*|*/utils/superAdminOverviewProfile*)
          echo "    (atteso) $line"
          ;;
        *)
          fail "jwt-parse" "parse JWT fuori helper documentati: $line"
          ;;
      esac
    done <<< "$JWT_PARSE"
    # se solo attesi, pass implicito se nessun fail già messo — aggiungi pass soft
    if ! printf '%s\n' "${SUMMARY[@]}" | rg -q '^FAIL\|jwt-parse\|'; then
      pass "jwt-parse" "atob solo in auth/lib/utils documentati"
    fi
  fi

  # fetch diretto sospetto verso /api (bypass client) — warn, non fail automatico
  RAW_FETCH=$(rg -n "fetch\(['\`]/api" "$FE_SRC" --glob '*.{ts,tsx}' 2>/dev/null || true)
  if [[ -z "$RAW_FETCH" ]]; then
    pass "fetch" "nessun fetch('/api...') grezzo ovvio"
  else
    warn "fetch" "fetch diretto verso /api — verificare se dovrebbe usare apiJson"
    echo "$RAW_FETCH" | head -10 | sed 's/^/    /'
  fi

  print_header "3. Routing / auth radar"

  if [[ -f "$FE_SRC/App.tsx" && -f "$FE_SRC/routes/lazyPages.ts" ]]; then
    pass "routes-files" "App.tsx + lazyPages.ts presenti"
    ROUTE_COUNT=$(rg -c 'path=' "$FE_SRC/App.tsx" 2>/dev/null || echo 0)
    LAZY_COUNT=$(rg -c 'lazy\(|lazyNamed\(' "$FE_SRC/routes/lazyPages.ts" 2>/dev/null || echo 0)
    echo "  path= in App.tsx:     $ROUTE_COUNT"
    echo "  lazy exports:         $LAZY_COUNT"
  else
    fail "routes-files" "App.tsx o lazyPages.ts assenti"
  fi

  # Route account essenziali (nested path= sotto /account)
  check_route() {
    local label="$1"
    local pattern="$2"
    if rg -q "$pattern" "$FE_SRC/App.tsx"; then
      echo "    ok route $label"
      return 0
    fi
    fail "routes" "manca riferimento a $label in App.tsx"
    return 1
  }
  check_route "/account/staff" 'path="staff"'
  check_route "/account/salone" 'path="salone"'
  check_route "/account/prenotazioni" 'path="prenotazioni"'
  check_route "/account/chat" 'path="chat"|SalonLuxuryChatPage'
  check_route "/admin/dashboard" 'path="dashboard"|/admin/dashboard'
  if ! printf '%s\n' "${SUMMARY[@]}" | rg -q '^FAIL\|routes\|'; then
    pass "routes" "route account/admin essenziali presenti"
  fi

  # Helper ruoli / booking gate
  for f in \
    "$FE_SRC/lib/parseLuxurySecurityRoles.ts" \
    "$FE_SRC/lib/luxuryConsumerBooking.ts" \
    "$FE_SRC/lib/luxuryNotificationPopup.ts" \
    "$FE_SRC/lib/nativeAccountHubPaths.ts" \
    "$FE_SRC/lib/subscription-guards.ts" \
    "$FE_SRC/components/BookingActionConfirmModal.tsx" \
    "$FE_SRC/components/ProtectedRoute.tsx" \
    "$FE_SRC/auth/LuxuryAuthProvider.tsx"
  do
    if [[ -f "$f" ]]; then
      echo "    ok $(basename "$f")"
    else
      fail "core-files" "manca $f"
    fi
  done
  if ! printf '%s\n' "${SUMMARY[@]}" | rg -q '^FAIL\|core-files\|'; then
    pass "core-files" "file core auth/ruoli/booking/chat presenti"
  fi

  echo ""
  echo "  Dev-only routes (devono essere dietro import.meta.env.DEV):"
  rg -n '/dev/' "$FE_SRC/App.tsx" | sed 's/^/    /' || true
fi

# ---------------------------------------------------------------------------
# CodeGraph
# ---------------------------------------------------------------------------
if [[ "$RUN_CODEGRAPH" -eq 1 ]]; then
  print_header "4. CodeGraph sync + status + blast symbols"

  if [[ ! -x "$CG_BIN" ]]; then
    warn "codegraph" "CLI non trovato in $CG_BIN — esegui npm install in devtools/codegraph"
  else
    if "$CG_BIN" sync >/tmp/luxury-cg-sync-fe.log 2>&1; then
      pass "codegraph-sync" "sync completato"
    else
      fail "codegraph-sync" "sync fallito (vedi /tmp/luxury-cg-sync-fe.log)"
    fi

    echo ""
    "$CG_BIN" status || warn "codegraph-status" "status fallito"

    BLAST_SYMBOLS=(
      LuxuryAuthProvider
      apiJson
      ProtectedRoute
      AdminProtectedRoute
      BookingActionConfirmModal
      useSalonBookingRequestAlerts
      SalonLuxuryChatPage
      useEffectiveSalonPlanTier
      parseLuxurySecurityRoles
      subscription-guards
      luxuryConsumerBooking
      nativeAccountHubPaths
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
# Vitest + tsc
# ---------------------------------------------------------------------------
if [[ "$RUN_TEST" -eq 1 ]]; then
  print_header "5. Vitest + TypeScript build check"

  if [[ ! -f luxury-frontend/package.json ]]; then
    fail "npm" "luxury-frontend/package.json assente"
  else
    if (cd luxury-frontend && npm run test); then
      pass "vitest" "tutti i test Vitest passati"
    else
      fail "vitest" "fallimento npm run test"
    fi

    if (cd luxury-frontend && npx tsc -b --pretty false); then
      pass "tsc" "tsc -b ok"
    else
      fail "tsc" "fallimento tsc -b"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_header "Riepilogo manutenzione frontend"

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
echo "  Prossimo passo agent: checklist area-by-area in"
echo "  .cursor/skills/manutenzione-frontend/CHECKLIST.md"
echo ""

exit "$OVERALL_STATUS"
