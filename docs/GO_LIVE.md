# Go-Live — Salon Platform (Luxury)

Checklist e riferimenti per la pubblicazione in produzione.  
**Script automatico:** dalla root del monorepo:

```bash
chmod +x go-live-check.sh go-live-status.sh   # una tantum
./go-live-status.sh           # elenco ✔ fatto / ○ da fare (aggiornato a ogni run)
./go-live-check.sh            # controlli + promemoria
./go-live-check.sh --reminder # solo checklist (senza scan)
```

Combinare con l’audit tecnico:

```bash
./luxury-audit.sh && ./go-live-status.sh && ./go-live-check.sh
```

---

## 1. Legali (`luxury-frontend`)

| File / area | Prima del go-live |
|-------------|-------------------|
| `src/content/legalEntity.ts` | `VITE_LEGAL_ENTITY_*` — niente `[TODO_LEGAL: …]` in produzione |
| `src/content/legalSharedCopy.ts` | `LEGAL_UPDATED_AT`, `LEGAL_DOCUMENT_VERSION` allineati alla data di rilascio |
| `src/pages/legal/LegalPrivacyAccordion.tsx` | Sostituire «Fase di Sviluppo (Pre-Release)» |
| Privacy B2B `/privacy`, B2C `/privacy/clienti`, Staff `/privacy/staff` | Testo rivisto; retention log definita (non `[es. 30/90 giorni]`) |
| Email | `privacy@saloniluxury.it`, `assistenza@saloniluxury.it` attive (SPF/DKIM) |

**URL per store:** vedi `src/content/luxuryLegalPanelPaths.ts` e hub `/legale`.

### Checklist legale penale-first (post-audit giugno 2026)

| Priorità | Voce | Stato | Azione |
|----------|------|-------|--------|
| 🔴 Bloccante | Dati societari reali (`VITE_COMPANY_*`, P.IVA, sede) | Placeholder | Valorizzare `.env.production` prima di raccogliere dati |
| 🔴 Bloccante | DPA Art. 28 firmati con saloni partner | **Implementato** | Click-wrap registrazione + `/legale/accordo-trattamento`; SQL colonne DPA su prod |
| 🔴 Alta | RoPA + DPIA | Organizzativo | Redazione con consulente (non sostituibile da LegalBlink generico) |
| 🟠 Media | Registro consensi cookie server-side | **Implementato** | Tabella `cookie_consent_events` + `POST /api/v1/public/cookie-consent`; applicare SQL in `luxury/deploy/sql/add_cookie_consent_events_*.sql` su DB prod |
| 🟠 Media | Piano incident response (art. 167-bis) | Da documentare | Procedura breach + notifica Garante/interessati |
| 🟠 Media | Play / App Store Data Safety ↔ privacy | Manuale | Allineare dopo build finale |
| 🟢 OK | Export/cancellazione account, gate cookie, informative layered | In codice | Verificare con `./luxury-audit.sh` |

**LegalBlink:** non adottare come sostituto delle informative custom; eventuale audit esterno una tantum sì.

**Go-live senza Stripe / senza incassi (prova Premium):** vedi checklist dedicata [`GO_LIVE_LEGALE_SENZA_STRIPE.md`](./GO_LIVE_LEGALE_SENZA_STRIPE.md).

### Aruba — tre credenziali diverse (non confondere la Gmail)

| Contesto | Username | Password |
|----------|----------|----------|
| **Login area clienti Aruba** ([aruba.it](https://www.aruba.it) / Hosting e domini) | `19867967@aruba.it` | Password scelta in fase di ordine/registrazione Aruba |
| **Webmail caselle** ([webmail.aruba.it](https://webmail.aruba.it)) | `privacy@`, `assistenza@` o `noreply@saloniluxury.it` | Password della singola casella |
| **SMTP backend** (`SPRING_MAIL_USERNAME` in `.env`) | `noreply@saloniluxury.it` | Password della casella `noreply@` |

La **Gmail personale** è solo l’email di **contatto** dell’account Aruba (fatture, comunicazioni, eventuale reset password): **non** va usata come username per il login al pannello né per SMTP.

---

## 2. Build frontend

```bash
cd luxury-frontend
cp .env.example .env.production   # valorizza VITE_LEGAL_* e store/maps
npm run build
cp -r dist ../infrastructure/frontend-web-dist/
```

---

## 3. Backend (`luxury`)

| Variabile / file | Produzione |
|------------------|------------|
| `LUXURY_TOKEN_SECRET` | Chiave casuale lunga (mai `luxury-dev-token-secret…`) |
| `LUXURY_PUBLIC_FRONTEND_URL` | `https://www.saloniluxury.it` |
| `LUXURY_CORS_ALLOWED_ORIGINS` | `www`, apex, `salone.` e `admin.` — solo HTTPS |
| `LUXURY_REFRESH_COOKIE_DOMAIN` | `saloniluxury.it` (default prod): la sessione vale sulle tre origini |
| Certificato TLS | SAN per `salone.saloniluxury.it` e `admin.saloniluxury.it` |
| Super admin | BCrypt hash; revocare `LUXURY_SUPER_ADMIN_SETUP_TOKEN` dopo setup |
| Email SMTP | `LUXURY_MAIL_ENABLED=true` + `SPRING_MAIL_*` (Aruba `smtps.aruba.it:465` SSL, user `noreply@saloniluxury.it`) — auth, prenotazioni, billing, chat, lifecycle account |
| Refresh token | Documentato come Redis; implementazione attuale su **Postgres** — allineare testi o codice |
| Chat Premium multi-thread | **Implementato** | Thread separati titolare / operatore su `salon_luxury_chat_*`; su DB esistenti applicare `luxury/deploy/sql/align_salon_luxury_chat_read_state_indexes_postgres.sql` (o riavviare backend: `SalonLuxuryChatSchemaAlignmentRunner` allinea indici all'avvio) |

Template server VM: `luxury/deploy/luxury.env.example`  
Profilo Docker: `application-docker.properties` + `infrastructure/.env`.

---

## 4. Infrastructure

```bash
cd infrastructure
cp .env.example .env    # JWT_SECRET, DB_PASSWORD, REDIS_PASSWORD, SITE_BASE_URL, CORS_ORIGINS
# NO localhost in SITE_BASE_URL / CORS_ORIGINS
docker compose -f docker-compose.prod.yml up -d --build
```

Certificati TLS in `nginx/certs/`. Non committare `.env` né certificati.

---

## 5. App mobile (`luxury-app`)

- `LUXURY_WEB_BASE_URL=https://saloniluxury.it`
- WebView legali: stessi path del sito (`?embed=1`)

---

## 6. Gate finale

- [ ] `./luxury-audit.sh` exit 0
- [ ] `./go-live-check.sh` exit 0 (o solo WARN accettati)
- [ ] Play Console / App Store Connect allineati alle informative pubblicate
- [ ] Note reviewer: `docs/APP_STORE_REVIEW_NOTES.md`
