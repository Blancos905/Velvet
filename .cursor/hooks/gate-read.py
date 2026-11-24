#!/usr/bin/env python3
"""Blocca la lettura dei file .env, consenti .env.example."""

import json
import os
import re
import sys

LOCAL_ENV = re.compile(r"^\.env\..+\.local$")


def emit(payload):
    json.dump(payload, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def is_secret(path):
    name = os.path.basename(path)
    if name == ".env.example":
        return False
    if name in {".env", ".env.local"}:
        return True
    return LOCAL_ENV.fullmatch(name) is not None


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        emit(
            {
                "permission": "deny",
                "user_message": "Lettura bloccata: percorso non leggibile.",
            }
        )
        return
    path = data.get("file_path") or ""
    if not isinstance(path, str):
        path = str(path)
    if is_secret(path):
        emit(
            {
                "permission": "deny",
                "user_message": "Lettura del file .env bloccata.",
            }
        )
        return
    emit({"permission": "allow"})


if __name__ == "__main__":
    main()
