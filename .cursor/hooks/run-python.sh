#!/bin/bash
# python3 di sistema, se parte. Altrimenti Python 3.12 di Homebrew.
target="$1"
if python3 -c 'import json' >/dev/null 2>&1; then
  exec python3 "$target"
fi
if [[ -x /opt/homebrew/bin/python3.12 ]]; then
  exec /opt/homebrew/bin/python3.12 "$target"
fi
exit 1
