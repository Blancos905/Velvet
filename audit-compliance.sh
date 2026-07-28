#!/usr/bin/env bash
# Wrapper retrocompatibile — usa luxury-audit.sh
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/luxury-audit.sh" "$@"
