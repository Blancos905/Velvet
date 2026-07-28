#!/usr/bin/env bash
#
# Crea upload-keystore.jks e android/key.properties per firma release Play Store.
# Non committare keystore né key.properties (già in .gitignore).
#
# Uso interattivo:
#   ./scripts/setup-android-release-signing.sh
#
# Uso non interattivo (CI / script):
#   LUXURY_ANDROID_STORE_PASSWORD='…' LUXURY_ANDROID_KEY_PASSWORD='…' ./scripts/setup-android-release-signing.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
KEYSTORE="$ANDROID_DIR/upload-keystore.jks"
KEY_PROPS="$ANDROID_DIR/key.properties"
KEY_ALIAS="${LUXURY_ANDROID_KEY_ALIAS:-upload}"
VALIDITY_DAYS="${LUXURY_ANDROID_KEY_VALIDITY_DAYS:-10000}"

if [[ -f "$KEYSTORE" && -f "$KEY_PROPS" ]]; then
  echo "✔ Keystore e key.properties già presenti:"
  echo "  $KEYSTORE"
  echo "  $KEY_PROPS"
  exit 0
fi

if [[ -f "$KEYSTORE" && ! -f "$KEY_PROPS" ]]; then
  echo "Keystore trovato ma manca key.properties. Crea $KEY_PROPS da android/key.properties.example" >&2
  exit 1
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool non trovato (JDK). Installa Java e riprova." >&2
  exit 1
fi

read_secret() {
  local prompt="$1"
  local var_name="$2"
  local value="${!var_name:-}"
  if [[ -n "$value" ]]; then
    return 0
  fi
  read -r -s -p "$prompt" value
  echo ""
  if [[ -z "$value" ]]; then
    echo "Password obbligatoria." >&2
    exit 1
  fi
  printf -v "$var_name" '%s' "$value"
}

read_secret "Password keystore (storePassword): " LUXURY_ANDROID_STORE_PASSWORD
read_secret "Password chiave (keyPassword, Invio = uguale a store): " LUXURY_ANDROID_KEY_PASSWORD
if [[ -z "${LUXURY_ANDROID_KEY_PASSWORD}" ]]; then
  LUXURY_ANDROID_KEY_PASSWORD="$LUXURY_ANDROID_STORE_PASSWORD"
fi

DN="${LUXURY_ANDROID_CERT_DN:-CN=Saloni Luxury, OU=Mobile, O=Saloni Luxury, L=Roma, ST=RM, C=IT}"

echo ""
echo "Generazione keystore release in:"
echo "  $KEYSTORE"
echo "  alias=$KEY_ALIAS  validità=${VALIDITY_DAYS} giorni"
echo ""

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storepass "$LUXURY_ANDROID_STORE_PASSWORD" \
  -keypass "$LUXURY_ANDROID_KEY_PASSWORD" \
  -dname "$DN"

cat >"$KEY_PROPS" <<EOF
storePassword=$LUXURY_ANDROID_STORE_PASSWORD
keyPassword=$LUXURY_ANDROID_KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=upload-keystore.jks
EOF

chmod 600 "$KEY_PROPS" 2>/dev/null || true

echo ""
echo "✔ Creati:"
echo "  $KEYSTORE"
echo "  $KEY_PROPS"
echo ""
echo "Backup del keystore in luogo sicuro (password manager / vault)."
echo "Play App Signing: al primo upload Play Console può richiedere il certificato upload — conserva questo .jks."
echo ""
echo "Build AAB:"
echo "  ./scripts/build-android-release.sh"
