#!/usr/bin/env python3
"""
Stress test: prenotazioni B2C + conferma titolare + recensioni sui saloni seed @test.com.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, timedelta

API_BASE = os.environ.get("LUXURY_API_BASE", "http://127.0.0.1:8080")
PASSWORD = os.environ.get("LUXURY_SEED_PASSWORD", "chelsea95")
DB_PASSWORD = os.environ.get("PGPASSWORD", "postgres")

COMMENTS = [
    "Ottimo servizio, tornerò sicuramente!",
    "Personale gentile e professionale.",
    "Ambiente pulito e accogliente.",
    "Risultato migliore del previsto, consigliato.",
    "Tempi rispettati, esperienza positiva.",
    "Buon rapporto qualità-prezzo.",
    "Colore perfetto, grazie al team.",
    "Massaggio rilassante, mi sono sentito rigenerato.",
    "Trattamento viso eccellente.",
    "Taglio preciso, molto soddisfatto.",
]


@dataclass
class SalonRow:
    email: str
    slug: str
    name: str


def api_json(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, object]:
    url = f"{API_BASE.rstrip('/')}{path}"
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw.strip() else {"message": raw}
        except json.JSONDecodeError:
            payload = {"message": raw}
        return e.code, payload


def login(email: str) -> str:
    code, res = api_json("POST", "/api/v1/auth/login", {"email": email, "password": PASSWORD})
    if code != 200 or not isinstance(res, dict) or not res.get("accessToken"):
        raise RuntimeError(f"Login fallito {email}: {code} {res}")
    return res["accessToken"]


def psql(sql: str) -> str:
    proc = subprocess.run(
        ["psql", "-h", "127.0.0.1", "-U", "postgres", "-d", "c1luxury", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql],
        capture_output=True,
        text=True,
        env={**os.environ, "PGPASSWORD": DB_PASSWORD},
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout)
    return proc.stdout.strip()


def ensure_clients(count: int) -> list[str]:
    existing = psql(
        """
        SELECT email FROM c1luxury.consumer_profiles
        WHERE email ~ '^cliente[0-9]+@test\\.com$' AND deleted_at IS NULL
        ORDER BY email;
        """
    )
    emails = [e for e in existing.splitlines() if e.strip()]
    if len(emails) >= count:
        return emails[:count]
    psql(
        f"""
        INSERT INTO c1luxury.consumer_profiles (
          id, auth_sub, email, password_hash, security_roles,
          email_verified_at, display_name, country, created_at, terms_accepted_at, legal_document_version
        )
        SELECT
          gen_random_uuid(),
          ('c' || lpad(i::text, 7, '0') || '-0000-4000-8000-000000000001'),
          'cliente' || i || '@test.com',
          (SELECT password_hash FROM c1luxury.consumer_profiles WHERE email = 'parrucchiere1@test.com' LIMIT 1),
          'CLIENT',
          now(),
          'Cliente Stress ' || i,
          'IT',
          now(),
          now(),
          '2026-06-25'
        FROM generate_series(1, {count}) AS i
        WHERE NOT EXISTS (
          SELECT 1 FROM c1luxury.consumer_profiles cp WHERE cp.email = 'cliente' || i || '@test.com'
        );
        """
    )
    emails = [
        e
        for e in psql(
            f"""
            SELECT email FROM c1luxury.consumer_profiles
            WHERE email ~ '^cliente[0-9]+@test\\.com$' AND deleted_at IS NULL
            ORDER BY email LIMIT {count};
            """
        ).splitlines()
        if e.strip()
    ]
    print(f"  clienti pronti: {len(emails)} (password {PASSWORD})")
    return emails


def load_salons() -> list[SalonRow]:
    rows = psql(
        """
        SELECT g.owner_email, l.slug, l.name
        FROM c1luxury.studio_groups g
        JOIN c1luxury.locations l ON l.studio_group_id = g.id
        WHERE g.owner_email ~ '^(parrucchiere|estetista|massaggiatore)[0-9]+@test\\.com$'
        ORDER BY g.owner_email;
        """
    )
    out: list[SalonRow] = []
    for line in rows.splitlines():
        if not line.strip():
            continue
        email, slug, name = line.split("|", 2)
        out.append(SalonRow(email=email, slug=slug, name=name))
    return out


def pick_slot(slug: str, service_id: str, operator_id: str) -> str | None:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=21)
    path = (
        f"/api/v1/public/organizations/{slug}/availability"
        f"?serviceId={service_id}&operatorId={operator_id}"
        f"&from={start.isoformat()}&to={end.isoformat()}"
    )
    code, days = api_json("GET", path)
    if code != 200 or not isinstance(days, list):
        return None
    slots: list[str] = []
    for day in days:
        if isinstance(day, dict):
            slots.extend(day.get("slotsIso") or [])
    return random.choice(slots) if slots else None


def book_one(client_email: str, salon: SalonRow) -> dict | None:
    token = login(client_email)
    code, services = api_json("GET", f"/api/v1/public/organizations/{salon.slug}/services")
    if code != 200 or not isinstance(services, list) or not services:
        return None
    service = random.choice(services)
    svc_id = service["id"]
    code, operators = api_json(
        "GET", f"/api/v1/public/organizations/{salon.slug}/operators?serviceId={svc_id}"
    )
    if code != 200 or not isinstance(operators, list) or not operators:
        return None
    op = random.choice(operators)
    slot = pick_slot(salon.slug, svc_id, op["id"])
    if not slot:
        return None
    code, appt = api_json(
        "POST",
        "/api/v1/me/appointments",
        {
            "organizationSlug": salon.slug,
            "serviceId": svc_id,
            "operatorId": op["id"],
            "start": slot,
        },
        token=token,
    )
    if code not in (200, 201) or not isinstance(appt, dict):
        return {"error": appt, "client": client_email, "salon": salon.slug, "code": code}
    return {
        "appointmentId": appt["id"],
        "status": appt.get("status"),
        "client": client_email,
        "owner": salon.email,
        "slug": salon.slug,
    }


def confirm_booked(owner_email: str, appointment_id: str) -> tuple[int, object]:
    token = login(owner_email)
    return api_json("POST", f"/api/v1/me/salon/appointments/{appointment_id}/confirm", token=token)


def backdate_for_reviews() -> int:
    return int(
        psql(
            """
          WITH updated AS (
            UPDATE c1luxury.appointments a
            SET
              starts_at = now() - interval '5 hours',
              ends_at = now() - interval '3 hours',
              status = 'CONFIRMED'
            FROM c1luxury.locations l
            JOIN c1luxury.studio_groups g ON g.id = l.studio_group_id
            WHERE a.location_id = l.id
              AND g.owner_email ~ '^(parrucchiere|estetista|massaggiatore)[0-9]+@test\\.com$'
              AND a.status IN ('BOOKED', 'CONFIRMED')
              AND a.ends_at > now() - interval '2 hours'
              AND NOT EXISTS (SELECT 1 FROM c1luxury.reviews r WHERE r.appointment_id = a.id)
            RETURNING a.id
          )
          SELECT COUNT(*) FROM updated;
          """
        )
        or "0"
    )


def submit_reviews() -> tuple[int, list[str]]:
    rows = psql(
        """
        SELECT a.id::text, cp.email
        FROM c1luxury.appointments a
        JOIN c1luxury.consumer_profiles cp ON cp.id = a.consumer_profile_id
        JOIN c1luxury.locations l ON l.id = a.location_id
        JOIN c1luxury.studio_groups g ON g.id = l.studio_group_id
        WHERE g.owner_email ~ '^(parrucchiere|estetista|massaggiatore)[0-9]+@test\\.com$'
          AND a.ends_at < now() - interval '2 hours'
          AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
          AND NOT EXISTS (SELECT 1 FROM c1luxury.reviews r WHERE r.appointment_id = a.id)
        ORDER BY a.starts_at
        LIMIT 500;
        """
    )
    ok = 0
    errors: list[str] = []
    for line in rows.splitlines():
        if not line.strip():
            continue
        appt_id, client_email = line.split("|", 1)
        try:
            token = login(client_email)
        except RuntimeError as e:
            errors.append(str(e))
            continue
        rating = random.randint(3, 5)
        staff_rating = random.randint(3, 5)
        comment = random.choice(COMMENTS)
        code, res = api_json(
            "POST",
            "/api/v1/me/reviews",
            {
                "appointmentId": appt_id,
                "rating": rating,
                "staffRating": staff_rating,
                "comment": comment,
            },
            token=token,
        )
        if code == 200:
            ok += 1
        else:
            errors.append(f"{client_email} appt={appt_id[:8]}… -> {code} {res}")
    return ok, errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Stress appuntamenti + recensioni su saloni demo.")
    parser.add_argument("--clients", type=int, default=40)
    parser.add_argument("--per-salon", type=int, default=5, help="Prenotazioni per salone.")
    parser.add_argument("--reviews-only", action="store_true")
    parser.add_argument("--book-only", action="store_true")
    args = parser.parse_args()

    code, _ = api_json("GET", "/api/v1/public/health")
    if code != 200:
        print("Backend non raggiungibile.", file=sys.stderr)
        return 1

    salons = load_salons()
    if not salons:
        print("Nessun salone seed trovato. Esegui prima seed-demo-salons-batch.py", file=sys.stderr)
        return 1

    print(f"Saloni: {len(salons)}")

    if not args.reviews_only:
        clients = ensure_clients(args.clients)
        booked: list[dict] = []
        book_errors: list[str] = []
        confirm_errors: list[str] = []

        print(f"\n=== Fase 1: prenotazioni ({args.per_salon}/salone) ===")
        client_idx = 0
        for salon in salons:
            for n in range(args.per_salon):
                client = clients[client_idx % len(clients)]
                client_idx += 1
                try:
                    res = book_one(client, salon)
                except Exception as ex:
                    book_errors.append(f"{client} @ {salon.slug}: {ex}")
                    continue
                if not res:
                    book_errors.append(f"{client} @ {salon.slug}: nessuno slot/servizio")
                    continue
                if res.get("error"):
                    book_errors.append(f"{client} @ {salon.slug}: {res}")
                    continue
                booked.append(res)
                if len(booked) % 25 == 0:
                    print(f"  prenotati: {len(booked)}…")
                time.sleep(0.05)

        print(f"Prenotazioni create: {len(booked)} | errori: {len(book_errors)}")

        print("\n=== Fase 2: conferma titolare (BOOKED → CONFIRMED) ===")
        confirmed = 0
        for b in booked:
            if b.get("status") != "BOOKED":
                confirmed += 1
                continue
            code, res = confirm_booked(b["owner"], b["appointmentId"])
            if code == 200:
                confirmed += 1
            else:
                confirm_errors.append(f"{b['appointmentId'][:8]}… {code} {res}")
        print(f"Confermate: {confirmed} | errori conferma: {len(confirm_errors)}")

        print("\n=== Fase 3: backdate appuntamenti (recensioni ammissibili) ===")
        backdated = backdate_for_reviews()
        print(f"Appuntamenti retrodatati: {backdated}")

        if book_errors:
            print("\n--- Errori prenotazione (primi 15) ---")
            for e in book_errors[:15]:
                print(f"  {e}")
        if confirm_errors:
            print("\n--- Errori conferma (primi 15) ---")
            for e in confirm_errors[:15]:
                print(f"  {e}")

    if args.book_only:
        return 0

    print("\n=== Fase 4: invio recensioni ===")
    review_ok, review_errors = submit_reviews()
    total_reviews = psql(
        """
        SELECT COUNT(*) FROM c1luxury.reviews r
        JOIN c1luxury.appointments a ON a.id = r.appointment_id
        JOIN c1luxury.locations l ON l.id = a.location_id
        JOIN c1luxury.studio_groups g ON g.id = l.studio_group_id
        WHERE g.owner_email ~ '^(parrucchiere|estetista|massaggiatore)[0-9]+@test\\.com$';
        """
    )
    total_appts = psql(
        """
        SELECT COUNT(*) FROM c1luxury.appointments a
        JOIN c1luxury.locations l ON l.id = a.location_id
        JOIN c1luxury.studio_groups g ON g.id = l.studio_group_id
        WHERE g.owner_email ~ '^(parrucchiere|estetista|massaggiatore)[0-9]+@test\\.com$'
          AND a.status NOT IN ('CANCELLED');
        """
    )
    print(f"Recensioni inviate ora: {review_ok} | errori: {len(review_errors)}")
    print(f"Totale DB — appuntamenti attivi: {total_appts} | recensioni: {total_reviews}")
    if review_errors:
        print("\n--- Errori recensioni (primi 15) ---")
        for e in review_errors[:15]:
            print(f"  {e}")

    return 0 if not review_errors and not (not args.reviews_only and book_errors) else 1


if __name__ == "__main__":
    raise SystemExit(main())
