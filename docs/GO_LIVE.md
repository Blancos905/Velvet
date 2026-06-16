# Go-Live — Salon Platform (Velvet)

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
./velvet-audit.sh && ./go-live-status.sh && ./go-live-check.sh
```

---

## 1. Legali (`velvet-frontend`)

| File / area | Prima del go-live |
|-------------|-------------------|
| `src/content/legalEntity.ts` | `VITE_LEGAL_ENTITY_*` — niente `[TODO_LEGAL: …]` in produzione |
| `src/content/legalSharedCopy.ts` | `LEGAL_UPDATED_AT`, `LEGAL_DOCUMENT_VERSION` allineati alla data di rilascio |
| `src/pages/legal/LegalPrivacyAccordion.tsx` | Sostituire «Fase di Sviluppo (Pre-Release)» |
| Privacy B2B `/privacy`, B2C `/privacy/clienti`, Staff `/privacy/staff` | Testo rivisto; retention log definita (non `[es. 30/90 giorni]`) |
| Email | `privacy@saloniluxury.it`, `assistenza@saloniluxury.it` attive (SPF/DKIM) |

**URL per store:** vedi `src/content/velvetLegalPanelPaths.ts` e hub `/legale`.

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
cd velvet-frontend
cp .env.example .env.production   # valorizza VITE_LEGAL_* e store/maps
npm run build
cp -r dist ../infrastructure/frontend-web-dist/
```

---

## 3. Backend (`velvet`)

| Variabile / file | Produzione |
|------------------|------------|
| `VELVET_TOKEN_SECRET` | Chiave casuale lunga (mai `velvet-dev-token-secret…`) |
| `VELVET_PUBLIC_FRONTEND_URL` | `https://www.saloniluxury.it` |
| `VELVET_CORS_ALLOWED_ORIGINS` | Solo domini HTTPS reali |
| Super admin | BCrypt hash; revocare `VELVET_SUPER_ADMIN_SETUP_TOKEN` dopo setup |
| Email SMTP | `VELVET_MAIL_ENABLED=true` + `SPRING_MAIL_*` (Aruba `smtps.aruba.it:465` SSL, user `noreply@saloniluxury.it`) — conferme prenotazione e promemoria |
| Refresh token | Documentato come Redis; implementazione attuale su **Postgres** — allineare testi o codice |

Template server VM: `velvet/deploy/velvet.env.example`  
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

## 5. App mobile (`velvet-app`)

- `VELVET_WEB_BASE_URL=https://saloniluxury.it`
- WebView legali: stessi path del sito (`?embed=1`)

---

## 6. Gate finale

- [ ] `./velvet-audit.sh` exit 0
- [ ] `./go-live-check.sh` exit 0 (o solo WARN accettati)
- [ ] Play Console / App Store Connect allineati alle informative pubblicate
