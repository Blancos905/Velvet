#!/usr/bin/env bash
# Copia il JSON del service account Firebase nel path atteso dal backend Velvet.
# Uso:
#   ./scripts/setup-firebase-credentials.sh ~/Downloads/velvet-xxxxx-firebase-adminsdk-xxxxx.json
#
# Il file di destinazione è gitignored: non verrà committato.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${ROOT}/src/main/resources/firebase-service-account.json"
SOURCE="${1:-}"

if [[ -z "${SOURCE}" ]]; then
	echo "Uso: $0 <path-al-file-json-scaricato-da-firebase>" >&2
	echo "" >&2
	echo "Passi Firebase Console:" >&2
	echo "  1. Project Settings → Service accounts" >&2
	echo "  2. Generate new private key" >&2
	echo "  3. Esegui di nuovo questo script passando il file scaricato" >&2
	exit 1
fi

if [[ ! -f "${SOURCE}" ]]; then
	echo "File non trovato: ${SOURCE}" >&2
	exit 1
fi

if ! grep -q '"type"[[:space:]]*:[[:space:]]*"service_account"' "${SOURCE}"; then
	echo "Il file non sembra un service account Firebase (manca type=service_account): ${SOURCE}" >&2
	exit 1
fi

mkdir -p "$(dirname "${TARGET}")"
cp "${SOURCE}" "${TARGET}"
chmod 600 "${TARGET}"

echo "Credenziali Firebase installate in:"
echo "  ${TARGET}"
echo ""
echo "Riavvia il backend Velvet. All'avvio dovresti vedere:"
echo "  Firebase Admin SDK inizializzato"
echo ""
echo "Il file è in .gitignore e non va committato."
