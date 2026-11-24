#!/usr/bin/env python3
"""Accoda il file modificato in .cursor/hooks/.verify-pending, senza duplicati.

Immagini, screenshot e i path fuori dal repo non entrano in coda.
"""

import json
import sys
from pathlib import Path

from source_paths import is_verifiable

ROOT = Path(__file__).resolve().parents[2]
PENDING = ROOT / ".cursor" / "hooks" / ".verify-pending"


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        json.dump({}, sys.stdout)
        sys.stdout.write("\n")
        return
    raw = data.get("file_path") or ""
    if not isinstance(raw, str) or not raw.strip():
        json.dump({}, sys.stdout)
        sys.stdout.write("\n")
        return
    path = os_norm(raw.strip())
    if not is_verifiable(path):
        json.dump({}, sys.stdout)
        sys.stdout.write("\n")
        return
    existing = []
    if PENDING.exists():
        existing = [line.strip() for line in PENDING.read_text(encoding="utf-8").splitlines() if line.strip()]
    if path not in existing:
        existing.append(path)
    PENDING.parent.mkdir(parents=True, exist_ok=True)
    PENDING.write_text("\n".join(existing) + "\n", encoding="utf-8")
    json.dump({}, sys.stdout)
    sys.stdout.write("\n")


def os_norm(path):
    return str(Path(path))


if __name__ == "__main__":
    main()
