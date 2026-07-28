#!/usr/bin/env python3
"""
Migrazione globale luxury → luxury: contenuti, nomi file e directory.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SKIP_DIR_NAMES = {
    ".git",
    ".codegraph",
    "node_modules",
    "target",
    "build",
    ".dart_tool",
    "dist",
    ".gradle",
    ".idea",
    "__pycache__",
}

SKIP_PATH_PARTS = {
    "frontend-web-dist",
}

BINARY_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".db",
    ".jar",
    ".class",
    ".so",
    ".dylib",
    ".a",
    ".o",
    ".p12",
    ".keystore",
    ".jks",
    ".pdf",
    ".zip",
    ".gz",
    ".tar",
    ".mp4",
    ".mov",
    ".wav",
    ".mp3",
    ".iml",
    ".lock",
    ".bin",
    ".dat",
    ".exe",
    ".dll",
    ".wasm",
    ".map",
}

REPLACEMENTS = [
    ("LUXURY", "LUXURY"),
    ("Luxury", "Luxury"),
    ("luxury", "luxury"),
]


def should_skip_dir(name: str) -> bool:
    return name in SKIP_DIR_NAMES


def should_skip_path(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIR_NAMES or part in SKIP_PATH_PARTS:
            return True
    return False


def is_text_file(path: Path) -> bool:
    if path.suffix.lower() in BINARY_EXTENSIONS:
        return False
    try:
        with path.open("rb") as f:
            chunk = f.read(8192)
        if b"\x00" in chunk:
            return False
    except OSError:
        return False
    return True


def replace_content(text: str) -> str:
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    return text


def collect_paths_with_luxury() -> list[Path]:
    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT, topdown=True):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
        base = Path(dirpath)
        if should_skip_path(base.relative_to(ROOT)):
            continue
        for name in dirnames + filenames:
            if "luxury" in name.lower():
                found.append(base / name)
    return found


def luxury_target_for_luxury_file(path: Path) -> Path | None:
    """Se esiste già un file luxury equivalente, restituisce quel path."""
    name = path.name
    lower = name.lower()
    if "luxury" not in lower:
        return None
    parent = path.parent
    if lower.startswith("luxury-"):
        luxury_name = "luxury-" + name[len("luxury-") :]
        luxury_path = parent / luxury_name
        if luxury_path.exists() and luxury_path != path:
            return luxury_path
    # LuxuryFoo.tsx -> LuxuryFoo.tsx
    m = re.match(r"^([Vv]elvet)(.+)$", name)
    if m:
        luxury_name = "Luxury" + m.group(2)
        luxury_path = parent / luxury_name
        if luxury_path.exists() and luxury_path != path:
            return luxury_path
    return None


def replace_in_all_files() -> int:
    changed = 0
    for dirpath, dirnames, filenames in os.walk(ROOT, topdown=True):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]
        base = Path(dirpath)
        rel = base.relative_to(ROOT)
        if should_skip_path(rel):
            continue
        for filename in filenames:
            path = base / filename
            if not is_text_file(path):
                continue
            try:
                original = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            updated = replace_content(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
    return changed


def delete_orphan_duplicates() -> int:
    deleted = 0
    for path in collect_paths_with_luxury():
        if not path.is_file():
            continue
        target = luxury_target_for_luxury_file(path)
        if target is not None:
            path.unlink()
            deleted += 1
            print(f"DELETE duplicate: {path.relative_to(ROOT)}")
    return deleted


def rename_luxury_paths() -> int:
    paths = collect_paths_with_luxury()
    # deepest first
    paths.sort(key=lambda p: len(p.parts), reverse=True)
    renamed = 0
    for path in paths:
        if not path.exists():
            continue
        name = path.name
        new_name = replace_content(name)
        if new_name == name:
            continue
        new_path = path.parent / new_name
        if new_path.exists():
            print(f"SKIP rename (target exists): {path} -> {new_path}", file=sys.stderr)
            continue
        path.rename(new_path)
        renamed += 1
        print(f"RENAME: {path.relative_to(ROOT)} -> {new_path.relative_to(ROOT)}")
    return renamed


def main() -> int:
    os.chdir(ROOT)
    print("=== Step 1: replace content in all text files ===")
    n_content = replace_in_all_files()
    print(f"Updated {n_content} files")

    print("\n=== Step 2: delete orphan luxury duplicates (luxury exists) ===")
    n_deleted = delete_orphan_duplicates()
    print(f"Deleted {n_deleted} duplicate files")

    print("\n=== Step 3: rename remaining luxury paths ===")
    n_renamed = rename_luxury_paths()
    print(f"Renamed {n_renamed} paths")

    # Verify no luxury remains in paths
    remaining = [p for p in collect_paths_with_luxury() if p.exists()]
    if remaining:
        print(f"\nWARNING: {len(remaining)} paths still contain 'luxury':", file=sys.stderr)
        for p in remaining[:20]:
            print(f"  {p.relative_to(ROOT)}", file=sys.stderr)
        return 1

    print("\nDone: no paths with 'luxury' in name remain.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
