#!/usr/bin/env python3
"""Se il turno è chiuso e ci sono file in coda, chiede la skill verify-change."""

import json
import sys
from pathlib import Path

from source_paths import is_verifiable

PENDING = Path(__file__).resolve().parent / ".verify-pending"


def emit(payload):
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        emit({})
        return
    status = data.get("status")
    try:
        loop_count = int(data.get("loop_count", 0))
    except (TypeError, ValueError):
        loop_count = 0
    paths = []
    if PENDING.exists():
        paths = [line.strip() for line in PENDING.read_text(encoding="utf-8").splitlines() if line.strip()]
    verifiable = [path for path in paths if is_verifiable(path)]
    if verifiable != paths:
        PENDING.write_text(("\n".join(verifiable) + "\n") if verifiable else "", encoding="utf-8")
    if status == "completed" and loop_count == 0 and verifiable:
        listed = "\n".join(f"- {path}" for path in verifiable)
        emit(
            {
                "followup_message": (
                    "Esegui la skill verify-change su questi path, poi svuota il file "
                    ".cursor/hooks/.verify-pending:\n" + listed
                )
            }
        )
        return
    emit({})


if __name__ == "__main__":
    main()
