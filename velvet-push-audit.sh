#!/usr/bin/env bash
#
# velvet-push-audit.sh — Diagnostica completa push FCM + inbox notifiche Velvet
#
# Controlla catena end-to-end:
#   Flutter (FCM token) → WebView bridge → React → Spring Boot → Firebase Admin → dispositivo
#
# Uso:
#   ./velvet-push-audit.sh              # audit repo + runtime (backend, DB se possibile)
#   ./velvet-push-audit.sh --repo-only  # solo file/codice, niente rete/DB
#   ./velvet-push-audit.sh --help
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RUN_RUNTIME=1
API_BASE="${VELVET_API_BASE:-http://127.0.0.1:8080}"

for arg in "$@"; do
  case "$arg" in
    --repo-only) RUN_RUNTIME=0 ;;
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

OVERALL_STATUS=0
FAIL_COUNT=0
WARN_COUNT=0
PASS_COUNT=0
declare -a FIXES=()

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m' C_RED=$'\033[1;31m' C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m' C_BLUE=$'\033[1;34m' C_CYAN=$'\033[1;36m' C_BOLD=$'\033[1m'
else
  C_RESET="" C_RED="" C_GREEN="" C_YELLOW="" C_BLUE="" C_CYAN="" C_BOLD=""
fi

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "${C_GREEN}✔ PASS${C_RESET}  $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo "${C_YELLOW}⚠ WARN${C_RESET}  $1"
  FIXES+=("WARN: $2")
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  OVERALL_STATUS=1
  echo "${C_RED}✘ FAIL${C_RESET}  $1"
  FIXES+=("FAIL: $2")
}

info() {
  echo "${C_CYAN}ℹ INFO${C_RESET}  $1"
}

section() {
  echo ""
  echo "${C_BLUE}${C_BOLD}── $1 ──${C_RESET}"
}

file_exists() {
  [[ -f "$1" ]]
}

grep_file() {
  grep -qE "$1" "$2" 2>/dev/null
}

print_header() {
  echo ""
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
  echo "${C_BLUE}${C_BOLD}  Velvet — audit notifiche push FCM + inbox${C_RESET}"
  echo "${C_BLUE}${C_BOLD}======================================================================${C_RESET}"
}

# ---------------------------------------------------------------------------
print_header

# --- 1. Backend Firebase Admin ---
section "Backend — Firebase Admin SDK"

FIREBASE_JSON="$ROOT_DIR/velvet/src/main/resources/firebase-service-account.json"
if file_exists "$FIREBASE_JSON"; then
  pass "Credenziali Firebase presenti: velvet/src/main/resources/firebase-service-account.json"
  if grep_file '"type"[[:space:]]*:[[:space:]]*"service_account"' "$FIREBASE_JSON"; then
    pass "JSON service account valido (type=service_account)"
    PROJECT_ID="$(grep -oE '"project_id"[[:space:]]*:[[:space:]]*"[^"]+"' "$FIREBASE_JSON" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
    info "Firebase project_id nel JSON: ${PROJECT_ID:-?}"
    if [[ "${PROJECT_ID:-}" != "saloniluxury" ]]; then
      warn "project_id Firebase ≠ saloniluxury (atteso per app mobile)" \
        "Allinea progetto Firebase mobile (GoogleService-Info.plist) e service account backend."
    fi
  else
    fail "JSON Firebase non sembra un service account" \
      "Rigenera la chiave in Firebase Console → Service accounts → Generate new private key, poi ./velvet/scripts/setup-firebase-credentials.sh <file.json>"
  fi
else
  fail "Manca firebase-service-account.json sul backend" \
    "Esegui: cd velvet && ./scripts/setup-firebase-credentials.sh ~/Downloads/saloniluxury-*-firebase-adminsdk-*.json && riavvia Spring Boot"
fi

PROPS="$ROOT_DIR/velvet/src/main/resources/application.properties"
LOCAL_PROPS="$ROOT_DIR/velvet/src/main/resources/application-local.properties"
if grep_file 'velvet\.firebase\.enabled=false' "$PROPS" 2>/dev/null || \
   { file_exists "$LOCAL_PROPS" && grep_file 'velvet\.firebase\.enabled=false' "$LOCAL_PROPS"; }; then
  fail "velvet.firebase.enabled=false" \
    "Rimuovi velvet.firebase.enabled=false o imposta true in application-local.properties"
else
  pass "Firebase non disabilitato esplicitamente in properties"
fi

if file_exists "$LOCAL_PROPS" && grep_file 'velvet\.firebase\.service-account-path=' "$LOCAL_PROPS"; then
  CUSTOM_PATH="$(grep 'velvet\.firebase\.service-account-path=' "$LOCAL_PROPS" | tail -1 | cut -d= -f2- | tr -d '[:space:]')"
  if [[ -n "$CUSTOM_PATH" && ! -f "$CUSTOM_PATH" ]]; then
    fail "velvet.firebase.service-account-path punta a file assente: $CUSTOM_PATH" \
      "Correggi il path in application-local.properties o usa setup-firebase-credentials.sh"
  elif [[ -n "$CUSTOM_PATH" ]]; then
    pass "Path custom Firebase in application-local.properties esiste"
  fi
fi

# Codice invio push
if grep -rq 'fcmPushDispatchService\.dispatchForScheduledNotification' "$ROOT_DIR/velvet/src/main/java" 2>/dev/null; then
  pass "Backend collega FcmPushDispatchService al processor/notifiche"
else
  fail "FcmPushDispatchService non chiamato dal flusso notifiche" \
    "Il backend logga ma non invia push: collega dispatch in ScheduledNotificationProcessor e AppointmentNotificationService"
fi

if grep -rq 'sendPushNotification' "$ROOT_DIR/velvet/src/main/java/it/velvet/notification" 2>/dev/null; then
  pass "NotificationService.sendPushNotification presente"
else
  fail "NotificationService.sendPushNotification assente"
fi

if grep -rq 'MeDevicesController' "$ROOT_DIR/velvet/src/main/java" 2>/dev/null; then
  pass "API POST /api/v1/me/devices presente (registrazione token)"
else
  fail "MeDevicesController assente — impossibile registrare token FCM"
fi

if grep_file 'velvet\.notifications\.enabled=true' "$PROPS"; then
  pass "velvet.notifications.enabled=true"
else
  warn "velvet.notifications.enabled non è true in application.properties" \
    "Imposta velvet.notifications.enabled=true o le notifiche non vengono accodate"
fi

# --- 2. Frontend React bridge ---
section "Frontend — bridge FCM (velvet-frontend)"

FE="$ROOT_DIR/velvet-frontend"
for f in src/hooks/useFcmToken.ts src/api/fcmDevice.ts src/components/VelvetFcmTokenSync.tsx; do
  if file_exists "$FE/$f"; then pass "Presente: velvet-frontend/$f"
  else fail "Manca: velvet-frontend/$f" "Ripristina i file del bridge FCM React"
  fi
done

if grep_file 'VelvetFcmTokenSync' "$FE/src/providers/AppProviders.tsx" 2>/dev/null || \
   grep -rq 'VelvetFcmTokenSync' "$FE/src" 2>/dev/null; then
  pass "VelvetFcmTokenSync montato nell'app React"
else
  fail "VelvetFcmTokenSync non montato in AppProviders" \
    "Aggiungi <VelvetFcmTokenSync /> in AppProviders.tsx"
fi

if grep_file 'isVelvetNativeAppShell' "$FE/src/hooks/useFcmToken.ts"; then
  pass "useFcmToken limitato alla shell nativa (WebView)"
else
  warn "useFcmToken potrebbe non distinguere shell nativa vs browser"
fi

# --- 3. Flutter app ---
section "Flutter — velvet-app (FCM nativo)"

APP="$ROOT_DIR/velvet-app"
for f in lib/push/velvet_fcm_service.dart lib/push/velvet_fcm_web_bridge.dart; do
  if file_exists "$APP/$f"; then pass "Presente: velvet-app/$f"
  else fail "Manca: velvet-app/$f"
  fi
done

if grep_file 'firebase_core:' "$APP/pubspec.yaml" && grep_file 'firebase_messaging:' "$APP/pubspec.yaml"; then
  pass "Dipendenze firebase_core + firebase_messaging in pubspec.yaml"
else
  fail "Dipendenze Firebase mancanti in velvet-app/pubspec.yaml"
fi

if file_exists "$APP/ios/Runner/GoogleService-Info.plist"; then
  pass "GoogleService-Info.plist (iOS) presente"
  IOS_BUNDLE_PLIST="$(grep -A1 'BUNDLE_ID' "$APP/ios/Runner/GoogleService-Info.plist" | tail -1 | sed 's/.*<string>\([^<]*\)<\/string>.*/\1/')"
  IOS_BUNDLE_XCODE="$(grep 'PRODUCT_BUNDLE_IDENTIFIER = ' "$APP/ios/Runner.xcodeproj/project.pbxproj" | head -1 | awk '{print $3}' | tr -d ';')"
  info "Bundle iOS Xcode: ${IOS_BUNDLE_XCODE:-?} | GoogleService-Info: ${IOS_BUNDLE_PLIST:-?}"
  if [[ -n "${IOS_BUNDLE_XCODE:-}" && -n "${IOS_BUNDLE_PLIST:-}" && "$IOS_BUNDLE_XCODE" != "$IOS_BUNDLE_PLIST" ]]; then
    fail "Bundle ID iOS non allineato tra Xcode e Firebase" \
      "Allinea PRODUCT_BUNDLE_IDENTIFIER e app iOS in Firebase Console (atteso: it.saloniluxury.velvetApp)"
  else
    pass "Bundle ID iOS coerente"
  fi
else
  fail "Manca GoogleService-Info.plist" "Scaricalo da Firebase Console → app iOS e mettilo in velvet-app/ios/Runner/"
fi

if file_exists "$APP/android/app/google-services.json"; then
  pass "google-services.json (Android) presente"
else
  warn "Manca google-services.json Android" "Scaricalo da Firebase Console se testi anche su Android"
fi

if grep_file 'remote-notification' "$APP/ios/Runner/Info.plist"; then
  pass "iOS UIBackgroundModes: remote-notification"
else
  fail "Manca remote-notification in Info.plist" "Aggiungi UIBackgroundModes remote-notification per push in background"
fi

IOS_ENTITLEMENTS="$APP/ios/Runner/Runner.entitlements"
PBXPROJ="$APP/ios/Runner.xcodeproj/project.pbxproj"
if file_exists "$IOS_ENTITLEMENTS" && grep_file 'aps-environment' "$IOS_ENTITLEMENTS"; then
  pass "File Runner.entitlements con aps-environment presente"
  if file_exists "$PBXPROJ" && grep -q 'CODE_SIGN_ENTITLEMENTS = Runner/Runner.entitlements' "$PBXPROJ" 2>/dev/null; then
    pass "Debug Xcode usa entitlements Push"
    warn "Push su iPhone richiede Apple Developer Program a pagamento (team personale = CodeSign fallito)" \
      "Con account \$99/anno: ./velvet-app/scripts/enable-ios-push-entitlements.sh. Con team gratuito: ./scripts/disable-ios-push-entitlements.sh e testa push su Android"
  else
    warn "Entitlements Push non attivi su build Debug (default team personale)" \
      "flutter run compila senza push iOS. Con Developer Program: ./velvet-app/scripts/enable-ios-push-entitlements.sh"
  fi
else
  fail "Manca Runner.entitlements con aps-environment" \
    "Crea velvet-app/ios/Runner/Runner.entitlements; per attivarli: ./velvet-app/scripts/enable-ios-push-entitlements.sh (solo account Developer pagato)"
fi

if grep_file 'registerForRemoteNotifications' "$APP/ios/Runner/AppDelegate.swift"; then
  pass "AppDelegate registra APNs (registerForRemoteNotifications)"
else
  warn "AppDelegate non chiama registerForRemoteNotifications" \
    "Aggiungi application.registerForRemoteNotifications() in AppDelegate.swift dopo super.application(...)"
fi

if grep_file 'POST_NOTIFICATIONS' "$APP/android/app/src/main/AndroidManifest.xml"; then
  pass "Android POST_NOTIFICATIONS dichiarato"
else
  warn "Manca POST_NOTIFICATIONS su Android" "Aggiungi permesso per Android 13+"
fi

if grep -rq 'VelvetFcmService' "$APP/lib/shell" 2>/dev/null; then
  pass "VelvetFcmService inizializzato nella WebView shell"
else
  fail "VelvetFcmService non referenziato in lib/shell" "Inizializza FCM in velvet_web_shell.dart"
fi

# --- 4. Runtime (backend, DB) ---
if [[ "$RUN_RUNTIME" -eq 1 ]]; then
  section "Runtime — backend e database"

  if curl -sf --max-time 3 "${API_BASE}/actuator/health" >/dev/null 2>&1 || \
     curl -sf --max-time 3 "${API_BASE}/api/v1/public/health" >/dev/null 2>&1; then
    pass "Backend raggiungibile su ${API_BASE}"
  else
    fail "Backend NON raggiungibile su ${API_BASE}" \
      "Avvia: cd velvet && ./mvnw spring-boot:run (e frontend: cd velvet-frontend && npm run dev -- --host)"
  fi

  # Prova a leggere log Firebase da processo recente — hint only
  info "All'avvio backend cerca nel log: 'Firebase Admin SDK inizializzato' oppure 'credenziali assenti'"

  # DB user_devices (Spring datasource da application-local.properties se esiste)
  DB_URL="" DB_USER="" DB_PASS=""
  if file_exists "$LOCAL_PROPS"; then
    DB_URL="$(grep '^spring\.datasource\.url=' "$LOCAL_PROPS" | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
    DB_USER="$(grep '^spring\.datasource\.username=' "$LOCAL_PROPS" | tail -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
    DB_PASS="$(grep '^spring\.datasource\.password=' "$LOCAL_PROPS" | tail -1 | cut -d= -f2- || true)"
  fi

  if [[ -n "$DB_URL" && "$DB_URL" == jdbc:postgresql:* ]] && command -v psql >/dev/null 2>&1; then
    PGHOST="$(echo "$DB_URL" | sed -n 's|jdbc:postgresql://\([^:/]*\).*|\1|p')"
    PGPORT="$(echo "$DB_URL" | sed -n 's|jdbc:postgresql://[^:/]*:\([0-9]*\).*|\1|p')"
    PGPORT="${PGPORT:-5432}"
    PGDB="$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')"
    export PGPASSWORD="$DB_PASS"
    DEVICE_COUNT="$(psql -h "$PGHOST" -p "$PGPORT" -U "$DB_USER" -d "$PGDB" -tAc 'SELECT COUNT(*) FROM user_devices;' 2>/dev/null | tr -d '[:space:]' || echo "")"
    NOTIF_PENDING="$(psql -h "$PGHOST" -p "$PGPORT" -U "$DB_USER" -d "$PGDB" -tAc "SELECT COUNT(*) FROM scheduled_notifications WHERE status='PENDING';" 2>/dev/null | tr -d '[:space:]' || echo "")"
    NOTIF_SENT="$(psql -h "$PGHOST" -p "$PGPORT" -U "$DB_USER" -d "$PGDB" -tAc "SELECT COUNT(*) FROM scheduled_notifications WHERE status='SENT';" 2>/dev/null | tr -d '[:space:]' || echo "")"
    unset PGPASSWORD

    if [[ -n "$DEVICE_COUNT" ]]; then
      info "user_devices in DB: ${DEVICE_COUNT} righe"
      if [[ "$DEVICE_COUNT" == "0" ]]; then
        warn "Nessun token FCM registrato in user_devices" \
          "Apri app iPhone, accetta notifiche, fai LOGIN nell'app. Verifica APNs su Firebase e log Flutter (APNS token)."
      else
        pass "Almeno un dispositivo registrato in user_devices"
      fi
      info "scheduled_notifications: PENDING=${NOTIF_PENDING:-?} SENT=${NOTIF_SENT:-?}"
    else
      info "Impossibile interrogare PostgreSQL (psql o credenziali). Query manuali:"
      info "  SELECT * FROM user_devices;"
      info "  SELECT type, status, scheduled_at, sent_at FROM scheduled_notifications ORDER BY scheduled_at DESC LIMIT 10;"
    fi
  else
    info "Skip query DB (manca application-local.properties o psql). Query manuali sopra."
  fi

  section "Runtime — dev iPhone / WebView"
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "?")"
  info "IP LAN Mac (en0/en1): ${LAN_IP} — usa flutter run --dart-define=VELVET_WEB_BASE_URL=http://${LAN_IP}:5173"
  info "NON usare VELVET_WEB_URL (nome sbagliato). Backend proxy Vite → 127.0.0.1:8080"
fi

# --- 5. Cose che NON si possono verificare da repo ---
section "Configurazione esterna (manuale — non verificabile da git)"

info "Firebase Console → Cloud Messaging → app iOS it.saloniluxury.velvetApp → chiave APNs (.p8) CARICATA"
info "Apple Developer → Keys → APNs Authentication Key (Team ID ZJSFDL6PV6)"
info "iPhone: Impostazioni → Notifiche → Velvet App → consentite"
info "iPhone: Developer Mode + profilo sviluppatore fidato"
info "Email SMTP: NON usata per notifiche prenotazione (solo inbox web + push FCM)"

# --- Riepilogo ---
section "Riepilogo"

echo ""
echo "  ${C_GREEN}PASS: ${PASS_COUNT}${C_RESET}  ${C_YELLOW}WARN: ${WARN_COUNT}${C_RESET}  ${C_RED}FAIL: ${FAIL_COUNT}${C_RESET}"
echo ""

if [[ ${#FIXES[@]} -gt 0 ]]; then
  echo "${C_BOLD}Azioni consigliate (in ordine di priorità):${C_RESET}"
  i=1
  for fix in "${FIXES[@]}"; do
    echo "  $i. $fix"
    i=$((i + 1))
  done
  echo ""
fi

if [[ "$OVERALL_STATUS" -eq 0 && "$WARN_COUNT" -eq 0 ]]; then
  echo "${C_GREEN}${C_BOLD}Tutto OK lato repo/runtime verificabile.${C_RESET}"
  echo "Se la push non arriva ancora: quasi sempre manca APNs su Firebase o login/token su iPhone."
elif [[ "$OVERALL_STATUS" -eq 0 ]]; then
  echo "${C_YELLOW}${C_BOLD}Nessun FAIL critico, ma ci sono WARN da risolvere.${C_RESET}"
else
  echo "${C_RED}${C_BOLD}Ci sono FAIL — risolvili prima di aspettarti push funzionanti.${C_RESET}"
fi

echo ""
exit "$OVERALL_STATUS"
