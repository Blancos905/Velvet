#!/usr/bin/env bash
# IP LAN del Mac (Wi‑Fi/Ethernet) per dispositivo fisico o Vite --host.
# Fallback: 127.0.0.1 (simulatore iOS).
set -euo pipefail

for iface in en0 en1 en2; do
  ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  if [[ -n "$ip" ]]; then
    echo "$ip"
    exit 0
  fi
done

echo "ATTENZIONE: IP LAN non trovato (en0/en1/en2). Su iPhone fisico usa l'IP mostrato da Vite (Network: http://192.168.x.x:5173)." >&2
echo "127.0.0.1"
