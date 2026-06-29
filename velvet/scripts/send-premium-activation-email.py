#!/usr/bin/env python3
"""Invio manuale email Premium attivato (stesso layout HTML del backend)."""
from __future__ import annotations

import os
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "src/main/resources/email/logo-saloni-luxury.png"
LOGO_CID = "velvet-logo"


def build_html(intro: str, salon: str, period: str, profile_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:Georgia,'Times New Roman',serif;color:#f5ead8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3ee;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1c1814;border:1px solid #2a2420;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:28px 24px 12px;">
          <img src="cid:{LOGO_CID}" alt="Saloni Luxury" width="96" height="96" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;border-radius:50%;" />
        </td></tr>
        <tr><td style="padding:0 24px 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5a0;">Saloni Luxury</td></tr>
        <tr><td style="padding:0 24px 16px;font-size:22px;line-height:1.35;color:#f5ead8;">{intro}</td></tr>
        <tr><td style="padding:0 24px 8px;font-size:15px;line-height:1.6;color:#e8dfd0;">
          Grazie per aver scelto l'abbonamento Premium Saloni Luxury.
        </td></tr>
        <tr><td style="padding:16px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#2a2420;border-radius:8px;">
            <tr><td style="padding:16px;font-size:15px;line-height:1.7;color:#e8dfd0;">
              <strong>Salone:</strong> {salon}<br>
              <strong>Prossimo rinnovo:</strong> {period}<br>
              <strong>Piano:</strong> Premium — tutte le funzionalità attive
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 24px 28px;" align="center">
          <a href="{profile_url}" style="display:inline-block;padding:14px 28px;background:#f5ead8;color:#1c1814;text-decoration:none;border-radius:999px;font-size:15px;font-weight:600;letter-spacing:0.02em;">Gestisci abbonamento</a>
        </td></tr>
        <tr><td style="padding:0 24px 24px;font-size:13px;line-height:1.5;color:#9a8f82;text-align:center;">
          Per assistenza scrivi a supporto@saloniluxury.it
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def main() -> int:
    to = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("VELVET_TEST_EMAIL_TO", "")
    if not to or "@" not in to:
        print("Usage: send-premium-activation-email.py recipient@example.com", file=sys.stderr)
        return 1

    host = os.environ.get("SPRING_MAIL_HOST", "")
    port = int(os.environ.get("SPRING_MAIL_PORT", "465"))
    user = os.environ.get("SPRING_MAIL_USERNAME", "")
    password = os.environ.get("SPRING_MAIL_PASSWORD", "")
    mail_from = os.environ.get("VELVET_MAIL_FROM", user or "noreply@saloniluxury.it")
    from_name = os.environ.get("VELVET_MAIL_FROM_DISPLAY_NAME", "Saloni Luxury")
    profile_url = os.environ.get("VELVET_FRONTEND_BASE_URL", "https://saloniluxury.it").rstrip("/") + "/account/profilo"

    if not host or not user or not password:
        print("SMTP non configurato: imposta SPRING_MAIL_* in spring-dev.local.env", file=sys.stderr)
        return 1

    intro = "Abbonamento Premium attivato."
    salon = "Salone Demo Premium"
    period = "23 luglio 2026"
    subject = "Grazie — abbonamento Premium attivato"
    plain = f"""Grazie per aver scelto l'abbonamento Premium Saloni Luxury.

Salone: {salon}
Prossimo rinnovo: {period}
Piano: Premium — tutte le funzionalità attive

Gestisci metodo di pagamento e fatture dal tuo profilo:
{profile_url}

Per assistenza scrivi a supporto@saloniluxury.it
"""
    html = build_html(intro, salon, period, profile_url)

    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{mail_from}>"
    msg["To"] = to

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(plain, "plain", "utf-8"))
    alt.attach(MIMEText(html, "html", "utf-8"))
    msg.attach(alt)

    if LOGO.is_file():
        with LOGO.open("rb") as logo_file:
            img = MIMEImage(logo_file.read(), _subtype="png")
        img.add_header("Content-ID", f"<{LOGO_CID}>")
        img.add_header("Content-Disposition", "inline", filename="logo-saloni-luxury.png")
        msg.attach(img)

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, port, context=context, timeout=60) as server:
        server.login(user, password)
        server.sendmail(mail_from, [to], msg.as_string())

    print(f"Email inviata → {to} ({datetime.now(timezone.utc).isoformat()})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
