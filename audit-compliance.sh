#!/usr/bin/env bash
# Wrapper retrocompatibile — usa velvet-audit.sh
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/velvet-audit.sh" "$@"
