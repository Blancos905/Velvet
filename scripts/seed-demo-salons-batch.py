#!/usr/bin/env python3
"""
Crea 30 saloni demo (10 parrucchieri, 10 estetisti, 10 massaggiatori) via API pubblica,
conferma email automaticamente (token dai log backend) e popola servizi + vetrina con foto.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = None  # type: ignore

API_BASE = os.environ.get("LUXURY_API_BASE", "http://127.0.0.1:8080")
PASSWORD = os.environ.get("LUXURY_SEED_PASSWORD", "chelsea95")
LEGAL_VERSION = "2026-06-25"

TOKEN_RE = re.compile(r"account=([^\s]+)\s+link:\s+\S+\?token=([a-f0-9]{64})")

# Foto stock Unsplash per categoria (w=880, qualità media per data URL ragionevoli)
STOCK_URLS: dict[str, list[str]] = {
    "HAIR": [
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1595476108010-bb9d846bfa2d?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1633681926022-84c23e8cb04d?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3d1?auto=format&fit=crop&w=880&q=75",
    ],
    "BEAUTY": [
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1570172619644-dfd03ed5d2bb?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1610992085024-e70d5d4e8e0d?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=880&q=75",
    ],
    "MASSAGE": [
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1519823551278-64b92733cd25?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1596178065880-792a4b4d3f6c?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=880&q=75",
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=880&q=75",
    ],
}

SERVICES: dict[str, list[tuple[str, int, int, str]]] = {
    "HAIR": [
        ("Taglio donna", 45, 3500, "Taglio e piega con consulenza forma e texture."),
        ("Taglio uomo", 30, 2200, "Taglio classico o sfumato, shampoo incluso."),
        ("Colore completo", 120, 8500, "Tintura radici-punte o colore uniforme."),
        ("Balayage", 150, 12000, "Schiariture naturali a mano libera."),
        ("Piega", 30, 2000, "Finish styling con phon e prodotti professionali."),
    ],
    "BEAUTY": [
        ("Manicure", 45, 2800, "Cura unghie, limatura e smalto."),
        ("Pedicure", 60, 3500, "Trattamento completo piedi e smalto."),
        ("Epilazione gambe", 45, 3000, "Ceretta tradizionale o monouso."),
        ("Trattamento viso", 60, 5500, "Pulizia profonda e maschera idratante."),
        ("Sopracciglia", 20, 1500, "Definizione con pinzetta o ceretta."),
    ],
    "MASSAGE": [
        ("Massaggio rilassante", 60, 5000, "Movimenti lenti per sciogliere tensioni."),
        ("Decontratturante", 50, 5500, "Pressione media su zone contratte."),
        ("Linfodrenaggio", 60, 6000, "Drenaggio dolce per gambe e addome."),
        ("Hot stone", 75, 7000, "Pietre calde e oli essenziali."),
        ("Massaggio sportivo", 45, 5200, "Recupero muscolare post allenamento."),
    ],
}

CITIES = [
    ("Milano", "20121", "MI", "Via Torino 12", 45.4642, 9.1900),
    ("Roma", "00186", "RM", "Via del Corso 88", 41.9028, 12.4964),
    ("Bologna", "40121", "BO", "Via Indipendenza 33", 44.4949, 11.3426),
    ("Firenze", "50122", "FI", "Via Calzaiuoli 15", 43.7696, 11.2558),
    ("Torino", "10121", "TO", "Via Roma 5", 45.0703, 7.6869),
    ("Napoli", "80132", "NA", "Via Toledo 100", 40.8518, 14.2681),
    ("Palermo", "90133", "PA", "Via Maqueda 50", 38.1157, 13.3615),
    ("Genova", "16121", "GE", "Via XX Settembre 120", 44.4056, 8.9463),
    ("Venezia", "30124", "VE", "Calle Larga 22", 45.4408, 12.3155),
    ("Verona", "37121", "VR", "Corso Porta Borsari 8", 45.4384, 10.9916),
]


@dataclass
class SalonSpec:
    email: str
    salon_name: str
    first_name: str
    last_name: str
    business_type: str
    city_idx: int


def build_specs() -> list[SalonSpec]:
    specs: list[SalonSpec] = []
    hair_names = [
        "Hair Studio", "Taglio & Colore", "Parrucchieri Elite", "Capelli Chic",
        "Hair Boutique", "Style Room", "Color Lab", "Hair Atelier",
        "Scissors & Co", "Bellezza Capelli",
    ]
    beauty_names = [
        "Beauty Lab", "Centro Estetico Luna", "Glow Skin", "Estetica Dolce",
        "Nail & Beauty", "Istituto Bellezza", "Skin Care Studio", "Estetica Moderna",
        "Beauty Corner", "Ritual Spa Viso",
    ]
    massage_names = [
        "Oasi Massage", "Centro Benessere", "Relax & Body", "Massaggi Zen",
        "Wellness Room", "Touch Therapy", "Armonia Massage", "Body Balance",
        "Spa Moment", "Equilibrio Massage",
    ]
    for i in range(10):
        city = i
        specs.append(
            SalonSpec(
                email=f"parrucchiere{i + 1}@test.com",
                salon_name=f"{hair_names[i]} {CITIES[city][0]}",
                first_name="Marco",
                last_name=f"Rossi{i + 1}",
                business_type="HAIR",
                city_idx=city,
            )
        )
    for i in range(10):
        city = i
        specs.append(
            SalonSpec(
                email=f"estetista{i + 1}@test.com",
                salon_name=f"{beauty_names[i]} {CITIES[city][0]}",
                first_name="Laura",
                last_name=f"Bianchi{i + 1}",
                business_type="BEAUTY",
                city_idx=city,
            )
        )
    for i in range(10):
        city = i
        specs.append(
            SalonSpec(
                email=f"massaggiatore{i + 1}@test.com",
                salon_name=f"{massage_names[i]} {CITIES[city][0]}",
                first_name="Paolo",
                last_name=f"Verdi{i + 1}",
                business_type="MASSAGE",
                city_idx=city,
            )
        )
    return specs


def api_base_url() -> str:
    return os.environ.get("LUXURY_API_BASE", API_BASE).rstrip("/")


def api_json(method: str, path: str, body: dict | None = None, token: str | None = None) -> Any:
    url = f"{api_base_url()}{path}"
    data = None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            if not raw.strip():
                return None
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} -> HTTP {e.code}: {detail}") from e


def tokens_for_email_in_log(log_path: str, email: str) -> set[str]:
    if not os.path.isfile(log_path):
        return set()
    email_l = email.lower()
    with open(log_path, "r", encoding="utf-8", errors="replace") as fh:
        content = fh.read()
    return {m.group(2) for m in TOKEN_RE.finditer(content) if m.group(1).lower() == email_l}


def parse_token_from_log(
    log_path: str, email: str, exclude_tokens: set[str], timeout_s: float = 45.0
) -> str | None:
    """Attende un nuovo token di conferma nel log backend (dopo la registrazione appena inviata)."""
    deadline = time.time() + timeout_s
    email_l = email.lower()
    while time.time() < deadline:
        if not os.path.isfile(log_path):
            time.sleep(0.3)
            continue
        with open(log_path, "r", encoding="utf-8", errors="replace") as fh:
            content = fh.read()
        found: str | None = None
        for m in TOKEN_RE.finditer(content):
            if m.group(1).lower() == email_l:
                tok = m.group(2)
                if tok not in exclude_tokens:
                    found = tok
        if found:
            return found
        time.sleep(0.5)
    return None


_image_cache: dict[str, list[str]] = {}


def _font(size: int):
    if Image is None:
        return None
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.isfile(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _jpeg_data_url(img_bytes: bytes) -> str:
    if Image is not None:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=78, optimize=True)
        img_bytes = buf.getvalue()
    b64 = base64.b64encode(img_bytes).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _fallback_image(label: str, slot: int, business_type: str) -> str:
    if Image is None:
        # minimo 1x1 jpeg
        return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q=="
    hues = {"HAIR": 25, "BEAUTY": 320, "MASSAGE": 160}
    hue = hues.get(business_type, 40)
    w, h = 880, 560
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(30 + t * 70 + (hue % 50))
        g = int(20 + t * 45 + (slot * 7 % 40))
        b = int(15 + t * 30)
        draw.line([(0, y), (w, y)], fill=(min(r, 255), min(g, 255), min(b, 255)))
    font = _font(32)
    draw.text((24, 24), label[:40], fill=(255, 251, 235), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=78, optimize=True)
    return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"


def load_category_images(business_type: str) -> list[str]:
    if business_type in _image_cache:
        return _image_cache[business_type]
    urls = STOCK_URLS.get(business_type, STOCK_URLS["HAIR"])
    out: list[str] = []
    for i, url in enumerate(urls):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LuxurySeed/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                out.append(_jpeg_data_url(resp.read()))
        except Exception:
            out.append(_fallback_image(f"Demo {business_type}", i, business_type))
    _image_cache[business_type] = out
    return out


def build_showcase_payload(
    slug: str,
    salon_name: str,
    business_type: str,
    service_ids: list[str],
    images: list[str],
) -> str:
    gallery = images[:6]
    service_photos = {}
    for idx, sid in enumerate(service_ids):
        service_photos[sid] = images[idx % len(images)]
    data = {
        "version": 1,
        "logoDataUrl": images[0],
        "siteImageDataUrls": gallery[:5],
        "siteShowcaseDescription": (
            f"{salon_name} — esperienza professionale e accoglienza curata. "
            "Prenota online il tuo trattamento."
        ),
        "showcaseServiceTextHexOnLight": None,
        "showcaseServiceTextHexOnDark": None,
        "showcaseSiteDescHexOnLight": None,
        "showcaseSiteDescHexOnDark": None,
        "servicePhotoDataUrls": service_photos,
        "servicePhotoObjectPositions": {sid: "50% 40%" for sid in service_ids},
        "exploreGalleryImageDataUrls": gallery,
        "publicLayoutTemplateId": None,
        "publicAmbientBgIndex": None,
        "publicCustomLayout": None,
        "publicCustomTextStyles": None,
    }
    return json.dumps(data, ensure_ascii=False)


def build_personal_page_payload(salon_name: str, business_type: str, city: str, images: list[str]) -> str:
    intros = {
        "HAIR": "Taglio, colore e styling con prodotti professionali.",
        "BEAUTY": "Trattamenti viso, corpo e unghie in ambiente rilassante.",
        "MASSAGE": "Massaggi e rituali benessere per ritrovare equilibrio.",
    }
    gallery = images[1:7] if len(images) > 6 else images
    data = {
        "heroTitle": salon_name,
        "heroSubtitle": intros.get(business_type, "Benessere e cura della persona."),
        "ownerIntro": (
            f"Benvenuti da {salon_name}. Il nostro team ti accoglie a {city} "
            "con consulenza personalizzata e attenzione ai dettagli."
        ),
        "about": (
            "Crediamo in un servizio trasparente e di qualità. Ogni trattamento è pensato "
            "per valorizzare il tuo stile e il tuo benessere."
        ),
        "strengths": "· Team qualificato\n· Prodotti selezionati\n· Ambiente accogliente\n· Prenotazione online",
        "openingHours": "Mar–Sab 9:00–19:00 · Lun e Dom chiuso",
        "bookingNote": "Prenota online: scegli servizio e orario.",
        "bookingCtaLabel": "Prenota ora",
        "instagramUrl": "",
        "facebookUrl": "",
        "contactsNote": f"Siamo in centro a {city}. Passa a trovarci o prenota dalla scheda Saloni Luxury.",
        "galleryImageDataUrls": gallery,
    }
    return json.dumps(data, ensure_ascii=False)


def register_salon(spec: SalonSpec) -> bool:
    city, cap, prov, addr, lat, lon = CITIES[spec.city_idx]
    body = {
        "email": spec.email,
        "password": PASSWORD,
        "firstName": spec.first_name,
        "lastName": spec.last_name,
        "phone": "+393331234567",
        "salonName": spec.salon_name,
        "planTier": "BASE",
        "salonAddressLine1": addr,
        "salonPostalCode": cap,
        "salonCity": city,
        "salonProvince": prov,
        "salonCountry": "IT",
        "salonBusinessTypes": [spec.business_type],
        "salonClientGenders": ["MALE", "FEMALE"],
        "acceptedTermsAndPrivacy": True,
        "legalDocumentVersion": LEGAL_VERSION,
        "acceptedDataProcessingAgreement": True,
        "dpaDocumentVersion": LEGAL_VERSION,
    }
    try:
        res = api_json("POST", "/api/v1/public/consumer-registration", body)
    except RuntimeError as e:
        msg = str(e)
        if "EMAIL_ALREADY_REGISTERED" in msg or "EMAIL_ALREADY_IN_USE" in msg:
            return False
        if "EMAIL_NOT_VERIFIED" in msg:
            return True
        raise
    return bool(res and res.get("emailVerificationRequired", True))


def login(email: str) -> str:
    res = api_json("POST", "/api/v1/auth/login", {"email": email, "password": PASSWORD})
    token = res.get("accessToken") if res else None
    if not token:
        raise RuntimeError(f"Login fallito per {email}")
    return token


def seed_one(spec: SalonSpec, log_path: str, dry_run: bool) -> dict[str, str]:
    email = spec.email.lower()
    print(f"\n→ {spec.salon_name} ({email}) [{spec.business_type}]")

    if dry_run:
        return {"email": email, "status": "dry-run"}

    # Già attivo?
    try:
        token = login(email)
        summary = api_json("GET", "/api/v1/me/salon", token=token)
        if summary and summary.get("provisioned"):
            slug = summary["primaryLocationSlug"]
            print(f"  già presente, slug={slug}")
            return {"email": email, "slug": slug, "status": "exists"}
    except RuntimeError:
        pass

    prior_tokens = tokens_for_email_in_log(log_path, email)
    needs_confirm = register_salon(spec)
    token: str | None = None

    if needs_confirm:
        plain = parse_token_from_log(log_path, email, prior_tokens)
        if not plain:
            raise RuntimeError(f"Token conferma email non trovato nel log per {email}")
        confirm = api_json("POST", "/api/v1/auth/email-verification/confirm", {"token": plain})
        token = confirm.get("accessToken") if confirm else None
        print("  email confermata")
    if not token:
        token = login(email)

    summary = api_json("GET", "/api/v1/me/salon", token=token)
    if not summary or not summary.get("provisioned"):
        raise RuntimeError(f"Salone non provisionato per {email}")
    slug = summary["primaryLocationSlug"]
    print(f"  slug={slug}")

    images = load_category_images(spec.business_type)
    service_defs = SERVICES[spec.business_type]
    created_services: list[dict] = []
    for name, duration, price, desc in service_defs:
        svc = api_json(
            "POST",
            "/api/v1/me/salon/services",
            {"name": name, "durationMinutes": duration, "priceCents": price, "description": desc},
            token=token,
        )
        created_services.append(svc)
    print(f"  {len(created_services)} servizi creati")

    staff_names = [
        ("Giulia", "Conti", "Senior"),
        ("Sara", "Ferrari", "Specialist"),
    ]
    for i, (fn, ln, role) in enumerate(staff_names):
        staff_email = email.replace("@", f"+staff{i + 1}@")
        try:
            api_json(
                "POST",
                "/api/v1/me/salon/staff",
                {
                    "firstName": fn,
                    "lastName": ln,
                    "role": role,
                    "email": staff_email,
                    "password": PASSWORD,
                    "photoDataUrl": images[(i + 2) % len(images)],
                    "workMorningStartMinuteOfDay": 9 * 60,
                    "workMorningEndMinuteOfDay": 13 * 60,
                    "workAfternoonStartMinuteOfDay": 14 * 60,
                    "workAfternoonEndMinuteOfDay": 19 * 60,
                },
                token=token,
            )
        except RuntimeError as e:
            if "EMAIL_ALREADY_REGISTERED" not in str(e):
                raise
    print("  staff creato (2 operatori)")

    service_ids = [str(s["id"]) for s in created_services]
    showcase = build_showcase_payload(slug, spec.salon_name, spec.business_type, service_ids, images)
    personal = build_personal_page_payload(
        spec.salon_name, spec.business_type, CITIES[spec.city_idx][0], images
    )
    api_json(
        "PUT",
        f"/api/v1/me/salon/site-content/{slug}/showcase",
        {"payload": showcase},
        token=token,
    )
    api_json(
        "PUT",
        f"/api/v1/me/salon/site-content/{slug}/personal-page",
        {"payload": personal},
        token=token,
    )
    print("  vetrina e sito popolati con foto")

    return {"email": email, "slug": slug, "status": "created"}


def upgrade_salons_public_visibility(db_password: str = "postgres") -> None:
    """PREMIUM + billing trialing + coordinate (ricerca pubblica richiede entitlement Premium)."""
    import subprocess

    sql = """
    UPDATE c1luxury.consumer_profiles SET plan_tier = 'PREMIUM'
    WHERE email LIKE '%@test.com' AND deleted_at IS NULL;
    UPDATE c1luxury.studio_groups SET plan_tier = 'PREMIUM' WHERE owner_email LIKE '%@test.com';
    INSERT INTO c1luxury.billing_accounts (
      id, studio_group_id, stripe_customer_id, stripe_subscription_id,
      subscription_status, stripe_price_id, current_period_end,
      cancel_at_period_end, synced_at, created_at, updated_at
    )
    SELECT gen_random_uuid(), g.id,
      'cus_seed_' || replace(g.id::text, '-', ''),
      'sub_seed_' || replace(g.id::text, '-', ''),
      'trialing', 'price_seed_dev', now() + interval '30 days',
      false, now(), now(), now()
    FROM c1luxury.studio_groups g
    WHERE g.owner_email LIKE '%@test.com'
      AND NOT EXISTS (SELECT 1 FROM c1luxury.billing_accounts b WHERE b.studio_group_id = g.id);
    UPDATE c1luxury.locations l SET latitude = v.lat, longitude = v.lng
    FROM (VALUES
      ('Milano', 45.4642, 9.1900), ('Roma', 41.9028, 12.4964),
      ('Bologna', 44.4949, 11.3426), ('Firenze', 43.7696, 11.2558),
      ('Torino', 45.0703, 7.6869), ('Napoli', 40.8518, 14.2681),
      ('Palermo', 38.1157, 13.3615), ('Genova', 44.4056, 8.9463),
      ('Venezia', 45.4408, 12.3155), ('Verona', 45.4384, 10.9916)
    ) AS v(city, lat, lng)
    WHERE l.city = v.city
      AND l.studio_group_id IN (SELECT id FROM c1luxury.studio_groups WHERE owner_email LIKE '%@test.com');
    """
    env = {**os.environ, "PGPASSWORD": db_password}
    proc = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "c1luxury", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
        env=env,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or "psql upgrade failed")
    print("  upgrade DB: PREMIUM + billing trialing + coordinate")
    parser = argparse.ArgumentParser(description="Seed 30 saloni demo Luxury (parrucchieri, estetisti, massaggiatori).")
    parser.add_argument("--api-base", default=API_BASE)
    parser.add_argument(
        "--backend-log",
        default=os.environ.get(
            "LUXURY_BACKEND_LOG",
            os.path.expanduser(
                "~/.cursor/projects/Users-michelecostantino-Developer-Luxury-my-salon-platform/terminals/3.txt"
            ),
        ),
        help="File log Spring (per estrarre token conferma email).",
    )
    parser.add_argument("--skip-db-upgrade", action="store_true", help="Non eseguire upgrade PREMIUM/geocoding post-seed.")
    parser.add_argument("--db-password", default=os.environ.get("PGPASSWORD", "postgres"))
    parser.add_argument("--only", help="Filtra per email (substring).")
    args = parser.parse_args()

    os.environ["LUXURY_API_BASE"] = args.api_base.rstrip("/")

    try:
        api_json("GET", "/api/v1/public/health")
    except Exception as e:
        print(f"Backend non raggiungibile su {api_base_url()}: {e}", file=sys.stderr)
        return 1

    specs = build_specs()
    if args.only:
        needle = args.only.lower()
        specs = [s for s in specs if s.email.lower() == needle or s.email.lower().startswith(needle + "@")]

    print(f"Seed {len(specs)} saloni — password: {PASSWORD}")
    print(f"Log backend: {args.backend_log}")

    results: list[dict] = []
    errors: list[str] = []
    for spec in specs:
        try:
            results.append(seed_one(spec, args.backend_log, args.dry_run))
        except Exception as ex:
            errors.append(f"{spec.email}: {ex}")
            print(f"  ERRORE: {ex}", file=sys.stderr)

    created = sum(1 for r in results if r.get("status") == "created")
    exists = sum(1 for r in results if r.get("status") == "exists")
    print(f"\nCompletato: {created} creati, {exists} già presenti, {len(errors)} errori.")

    if not args.dry_run and not args.skip_db_upgrade and not errors:
        try:
            upgrade_salons_public_visibility(args.db_password)
        except Exception as ex:
            print(f"ATTENZIONE: upgrade visibilità pubblica fallito: {ex}", file=sys.stderr)

    if errors:
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
