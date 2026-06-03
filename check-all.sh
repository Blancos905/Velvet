#!/usr/bin/env bash
#
# check-all.sh — Verifica di coerenza dell'intero ecosistema Velvet.
#
# Esegue test, lint e type-check per ognuno dei tre moduli:
#   - velvet           Backend Java 17 / Spring Boot (Maven)
#   - velvet-frontend  Frontend TypeScript / Vite / React (Vitest)
#   - velvet-app       Shell mobile Flutter / Dart (WebView)
#
# Output colorato (verde = OK, rosso = FAIL). Termina con exit code != 0
# se anche un solo step di un solo modulo fallisce.
#
# Uso:
#   ./check-all.sh                 # esegue tutti i moduli
#   ./check-all.sh velvet-frontend # esegue solo il modulo indicato
#   ./check-all.sh velvet velvet-app
#
set -uo pipefail

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colori (disattivati automaticamente se l'output non è un terminale).
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

OVERALL_STATUS=0
declare -a SUMMARY=()

# ---------------------------------------------------------------------------
# Helper di stampa
# ---------------------------------------------------------------------------
print_header() {
  echo ""
  echo "${C_BLUE}${C_BOLD}========================================================${C_RESET}"
  echo "${C_BLUE}${C_BOLD}  $1${C_RESET}"
  echo "${C_BLUE}${C_BOLD}========================================================${C_RESET}"
}

# run_step <modulo> <etichetta> <comando...>
# Esegue il comando nella directory corrente, stampa PASS/FAIL e aggiorna lo stato.
run_step() {
  local module="$1"; shift
  local label="$1"; shift

  echo ""
  echo "${C_CYAN}▶ [${module}] ${label}${C_RESET}"
  echo "${C_CYAN}  \$ $*${C_RESET}"

  if "$@"; then
    echo "${C_GREEN}✔ [${module}] ${label} — PASS${C_RESET}"
    SUMMARY+=("${C_GREEN}✔ PASS${C_RESET}  ${module} :: ${label}")
    return 0
  else
    local code=$?
    echo "${C_RED}✘ [${module}] ${label} — FAIL (exit ${code})${C_RESET}"
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ${module} :: ${label}")
    OVERALL_STATUS=1
    return "$code"
  fi
}

# Verifica che un comando esista; se manca lo registra come FAIL.
require_tool() {
  local module="$1" tool="$2"
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "${C_RED}✘ [${module}] strumento richiesto non trovato: '${tool}'${C_RESET}"
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  ${module} :: tool mancante (${tool})")
    OVERALL_STATUS=1
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Moduli
# ---------------------------------------------------------------------------

check_velvet() {
  print_header "velvet — Backend Java / Spring Boot (Maven)"
  cd "$ROOT_DIR/velvet" || { OVERALL_STATUS=1; return 1; }

  local mvn_cmd
  if [[ -x "./mvnw" ]]; then
    mvn_cmd="./mvnw"
  elif command -v mvn >/dev/null 2>&1; then
    mvn_cmd="mvn"
  else
    echo "${C_RED}✘ [velvet] né ./mvnw né mvn disponibili${C_RESET}"
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  velvet :: tool mancante (maven)")
    OVERALL_STATUS=1
    return 1
  fi

  # Compilazione = type-check del backend Java (sorgenti + test).
  run_step "velvet" "Type-check / compile" \
    "$mvn_cmd" -q -B -DskipTests clean test-compile
  # Test unitari e di integrazione (surefire).
  run_step "velvet" "Test (unit + integration)" \
    "$mvn_cmd" -q -B test
}

check_frontend() {
  print_header "velvet-frontend — TypeScript / Vite / React (Vitest)"
  cd "$ROOT_DIR/velvet-frontend" || { OVERALL_STATUS=1; return 1; }

  require_tool "velvet-frontend" npm || return 1

  if [[ ! -d node_modules ]]; then
    run_step "velvet-frontend" "Install dipendenze (npm ci)" npm ci
  fi

  # IMPORTANTE: si usa il binario locale, NON `npx tsc`.
  # `npx tsc` proverebbe a scaricare il pacchetto deprecato `tsc` dal registry
  # (e si blocca/fallisce), invece della TypeScript installata localmente.
  local tsc_bin="node_modules/.bin/tsc"
  if [[ -x "$tsc_bin" ]]; then
    # Type-check TypeScript (tsc -b, come nello script di build).
    run_step "velvet-frontend" "Type-check (tsc)" "$tsc_bin" -b --pretty
  else
    echo "${C_RED}✘ [velvet-frontend] TypeScript non installata (${tsc_bin} assente)${C_RESET}"
    SUMMARY+=("${C_RED}✘ FAIL${C_RESET}  velvet-frontend :: tool mancante (tsc)")
    OVERALL_STATUS=1
  fi
  # Test unitari (Vitest in modalità run, non watch) tramite lo script npm.
  run_step "velvet-frontend" "Test (vitest run)" npm run test --silent
}

check_app() {
  print_header "velvet-app — Flutter / Dart (WebView shell)"
  cd "$ROOT_DIR/velvet-app" || { OVERALL_STATUS=1; return 1; }

  require_tool "velvet-app" flutter || return 1

  # Lint + analisi statica (anche type-check) tramite analysis_options.yaml.
  run_step "velvet-app" "Lint + analyze (flutter analyze)" flutter analyze
  # Test (widget/unit).
  run_step "velvet-app" "Test (flutter test)" flutter test
}

# ---------------------------------------------------------------------------
# Dispatch (compatibile con bash 3.2 di macOS: niente array associativi)
# ---------------------------------------------------------------------------
ORDER=(velvet velvet-frontend velvet-app)

# Mappa nome modulo -> funzione.
run_module() {
  case "$1" in
    velvet)          check_velvet ;;
    velvet-frontend) check_frontend ;;
    velvet-app)      check_app ;;
    *)
      echo "${C_RED}Modulo sconosciuto: '$1'${C_RESET}"
      echo "Moduli validi: ${ORDER[*]}"
      exit 2
      ;;
  esac
}

selected=()
if [[ $# -gt 0 ]]; then
  for arg in "$@"; do
    case " ${ORDER[*]} " in
      *" $arg "*) selected+=("$arg") ;;
      *)
        echo "${C_RED}Modulo sconosciuto: '${arg}'${C_RESET}"
        echo "Moduli validi: ${ORDER[*]}"
        exit 2
        ;;
    esac
  done
else
  selected=("${ORDER[@]}")
fi

echo "${C_BOLD}Velvet — verifica di coerenza dell'ecosistema${C_RESET}"
echo "Root: ${ROOT_DIR}"
echo "Moduli da controllare: ${selected[*]}"

for module in "${selected[@]}"; do
  run_module "$module"
done

# ---------------------------------------------------------------------------
# Riepilogo finale
# ---------------------------------------------------------------------------
print_header "Riepilogo"
if [[ ${#SUMMARY[@]} -gt 0 ]]; then
  for line in "${SUMMARY[@]}"; do
    echo "  $line"
  done
fi
echo ""

if [[ "$OVERALL_STATUS" -eq 0 ]]; then
  echo "${C_GREEN}${C_BOLD}✔ Tutti i controlli sono passati. Ecosistema coerente.${C_RESET}"
else
  echo "${C_RED}${C_BOLD}✘ Alcuni controlli sono falliti. Vedi il riepilogo sopra.${C_RESET}"
fi

exit "$OVERALL_STATUS"
