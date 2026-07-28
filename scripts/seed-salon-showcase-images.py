#!/usr/bin/env python3
"""Genera immagini demo (JPEG data URL) e le salva in salon_site_content per una sede."""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    print("Dipendenza mancante: pip install pillow", file=sys.stderr)
    raise SystemExit(1) from exc


def hash32(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.isfile(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _jpeg_data_url(img: Image.Image, quality: int = 78) -> str:
    buf = io.BytesIO()
    rgb = img.convert("RGB")
    rgb.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _salon_image(slug: str, slot: int, w: int, h: int, label: str) -> str:
    seed = (hash32(slug) + slot * 9973) & 0xFFFFFFFF
    hue0 = seed % 360
    hue1 = (hue0 + 28 + slot * 17) % 360
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        # approssimazione gradiente caldo stile parrucchiere
        r = int(40 + t * 80 + (hue0 % 40))
        g = int(24 + t * 50 + (hue1 % 30))
        b = int(18 + t * 35)
        draw.line([(0, y), (w, y)], fill=(min(r, 255), min(g, 255), min(b, 255)))

    for i in range(5 + (seed % 4)):
        cx = ((seed * (i + 7)) % max(w - 160, 1)) + 80
        cy = ((seed * (i + 11)) % max(h - 160, 1)) + 80
        radius = 80 + ((seed >> (i * 3)) % 120)
        color = (
            200 + (i * 7) % 40,
            120 + (i * 11) % 60,
            60 + (i * 5) % 40,
        )
        draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=color,
            outline=None,
        )

    title_font = _font(28 + (slot % 3) * 4)
    sub_font = _font(18)
    draw.text((24, 24), label, fill=(255, 251, 235), font=title_font)
    draw.text((24, 64), f"{slug} · {slot + 1}", fill=(255, 220, 180), font=sub_font)
    return _jpeg_data_url(img)


def _logo_data_url(slug: str, title: str) -> str:
    size = 480
    img = Image.new("RGB", (size, size), (255, 237, 213))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((24, 24, size - 24, size - 24), radius=48, fill=(234, 88, 12))
    initials = "".join(p[0].upper() for p in title.split() if p)[:3] or "SL"
    font = _font(120)
    bbox = draw.textbbox((0, 0), initials, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - 10), initials, fill=(255, 251, 235), font=font)
    return _jpeg_data_url(img, quality=82)


def build_showcase_payload(slug: str, salon_name: str) -> str:
    gallery = [_salon_image(slug, i, 880, 560, salon_name) for i in range(6)]
    carousel = gallery[:5]
    data = {
        "version": 1,
        "logoDataUrl": _logo_data_url(slug, salon_name),
        "siteImageDataUrls": carousel,
        "siteShowcaseDescription": (
            f"{salon_name} — taglio, styling e cura del capello a Malito. "
            "Team dedicato, consulenza personalizzata e atmosfera accogliente."
        ),
        "showcaseServiceTextHexOnLight": None,
        "showcaseServiceTextHexOnDark": None,
        "showcaseSiteDescHexOnLight": None,
        "showcaseSiteDescHexOnDark": None,
        "servicePhotoDataUrls": {},
        "servicePhotoObjectPositions": {},
        "exploreGalleryImageDataUrls": gallery,
        "publicLayoutTemplateId": None,
        "publicAmbientBgIndex": None,
        "publicCustomLayout": None,
        "publicCustomTextStyles": None,
    }
    return json.dumps(data, ensure_ascii=False)


def build_personal_page_payload(slug: str, salon_name: str) -> str:
    gallery = [_salon_image(slug, i + 10, 880, 560, salon_name) for i in range(6)]
    data = {
        "heroTitle": salon_name,
        "heroSubtitle": "Taglio, colore e cura del capello nel cuore di Malito — consulenza su misura e prodotti professionali.",
        "ownerIntro": (
            f"Siamo {salon_name}: parrucchieri che lavorano con passione per valorizzare il tuo stile. "
            "Ti accogliamo in salone per ascoltare i tuoi obiettivi e proporti un look realistico."
        ),
        "about": (
            "Crediamo in un servizio trasparente: tempi chiari, consigli onesti e attenzione alla salute del capello. "
            "Ogni visita è pensata per farti sentire a tuo agio."
        ),
        "strengths": (
            "· Taglio uomo su misura\n"
            "· Styling e finish professionali\n"
            "· Trattamenti ristrutturanti\n"
            "· Consulenza forma e texture"
        ),
        "openingHours": "Mar–Sab 9:00–19:00 · Lun e Dom chiuso (su appuntamento)",
        "bookingNote": "Prenota online in pochi click: scegli servizio e fascia oraria.",
        "bookingCtaLabel": "Prenota ora",
        "instagramUrl": "",
        "facebookUrl": "",
        "contactsNote": "Contrada Vallelunga, Malito (CS) — passa in salone o prenota dalla scheda su Saloni Luxury.",
        "galleryImageDataUrls": gallery,
    }
    return json.dumps(data, ensure_ascii=False)


def upsert_content(db_url: str, slug: str, kind: str, payload: str, work_dir: str) -> None:
    row_id = str(uuid.uuid4())
    updated_at = datetime.now(timezone.utc).isoformat()
    tag = f"luxury_payload_{kind.lower()}"
    sql_path = os.path.join(work_dir, f"{slug}-{kind}.sql")
    with open(sql_path, "w", encoding="utf-8") as fh:
        fh.write("SET search_path TO c1luxury;\n")
        fh.write(
            f"INSERT INTO salon_site_content (id, slug, kind, payload, updated_at)\n"
            f"VALUES ('{row_id}', '{slug}', '{kind}', ${tag}${payload}${tag}$, '{updated_at}')\n"
            f"ON CONFLICT ON CONSTRAINT uk_salon_site_content_slug_kind\n"
            f"DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at;\n"
        )
    proc = subprocess.run(
        ["psql", db_url, "-v", "ON_ERROR_STOP=1", "-f", sql_path],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(proc.stderr or proc.stdout, file=sys.stderr)
        raise SystemExit(proc.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description="Popola immagini vetrina/sito salone nel DB.")
    parser.add_argument("--slug", default="vallelunga-hair")
    parser.add_argument("--name", default="Vallelunga Hair")
    parser.add_argument(
        "--db-url",
        default=os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@127.0.0.1:5432/c1luxury",
        ),
    )
    args = parser.parse_args()
    slug = args.slug.strip().lower()
    salon_name = args.name.strip()

    showcase = build_showcase_payload(slug, salon_name)
    personal = build_personal_page_payload(slug, salon_name)

    work_dir = os.path.join(os.path.dirname(__file__), ".seed-tmp")
    os.makedirs(work_dir, exist_ok=True)
    upsert_content(args.db_url, slug, "SHOWCASE", showcase, work_dir)
    upsert_content(args.db_url, slug, "PERSONAL_PAGE", personal, work_dir)

    print(f"OK — immagini salvate per slug «{slug}» (SHOWCASE + PERSONAL_PAGE).")
    print(f"  payload SHOWCASE: {len(showcase) // 1024} KB")
    print(f"  payload PERSONAL_PAGE: {len(personal) // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
