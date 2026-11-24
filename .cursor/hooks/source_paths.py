"""Path che la skill verify-change può controllare.

Immagini e path fuori dal repo non sono un modulo: non vanno in coda.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMAGE_SUFFIXES = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".bmp",
    ".heic",
    ".heif",
    ".avif",
    ".tif",
    ".tiff",
}


def is_verifiable(path):
    candidate = Path(path)
    if candidate.name == ".verify-pending":
        return False
    if candidate.suffix.lower() in IMAGE_SUFFIXES:
        return False
    try:
        candidate.resolve().relative_to(ROOT)
    except ValueError:
        return False
    return True
