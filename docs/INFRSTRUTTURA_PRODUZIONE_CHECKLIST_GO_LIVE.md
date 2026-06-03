# Infrastruttura di Produzione & Checklist Go-Live

**Progetto:** Salon Platform (Velvet) — monorepo `my-salon-platform`  
**Data analisi:** 3 giugno 2026  
**Ambiente target:** Ubuntu Linux + Docker Compose (`infrastructure/docker-compose.prod.yml`)  
**Domini di riferimento nel repo:** `salonivelvet.it`, `www.salonivelvet.it`

---

## Executive summary

| Area | Stato nel codice oggi | Azione go-live |
|------|----------------------|----------------|
| Stack Docker prod | Definito (Nginx + API + PostGIS + Redis) | Build SPA, `.env` reale, TLS, `docker compose up` |
| Email SMTP | **Non implementato** | Notifiche in-app + log; password reset solo in log |
| Redis nel compose | Container presente | **Non usato** da Spring (refresh token su **PostgreSQL**) |
| CORS | Opzionale se API e SPA stesso host | Valorizzare solo se origini diverse |
| App Flutter | Shell WebView → sito | `VELVET_WEB_BASE_URL=https://salonivelvet.it`; firma release Android/iOS |
| Deploy alternativo | `application-prod` + MariaDB ISPConfig | Percorso parallelo, non Docker |

**Percorsi di deploy supportati dal codice:**

1. **Consigliato per Ubuntu “tutto in Docker”:** `infrastructure/docker-compose.prod.yml`
2. **Legacy VM ISPConfig:** profilo `prod` + `velvet/deploy/velvet.env.example` + snippet Nginx su porta `8082`

---

## 1. Architettura di Produzione

### 1.1 Cosa gira sul server Ubuntu (stack Docker)

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │  nginx :80/:443 │  edge (unica superficie pubblica)
              │  TLS termination│
              │  SPA statica    │  /usr/share/nginx/html ← frontend-web-dist
              │  proxy /api/*   │
              │  proxy /saloni/*, landing SEO, sitemap
              └────────┬────────┘
                       │ rete Docker "edge"
                       ▼
              ┌─────────────────┐
              │  api :8080      │  Spring Boot (profilo docker, Java 21)
              │  (expose only)  │  NON pubblicato sull'host
              └────────┬────────┘
                       │ rete "backplane" (internal: true)
         ┌─────────────┴─────────────┐
         ▼                           ▼
  ┌──────────────┐            ┌──────────────┐
  │ postgres     │            │ redis        │
  │ PostGIS 16   │            │ 7.4-alpine   │
  │ (no host port)│            │ (no host port)│
  └──────────────┘            └──────────────┘
```

**Flusso dati:**

| Traffico | Percorso |
|----------|----------|
| Utente web / WebView app | `HTTPS → nginx → index.html` (React) o `proxy_pass → api:8080` per `/api/`, `/saloni/{slug}`, `/sitemap.xml`, `/robots.txt` |
| API → DB | `jdbc:postgresql://postgres:5432/${DB_NAME}` (solo rete interna) |
| Refresh token | Tabella Postgres `auth_refresh_token` (cookie `velvet_rt`, rotazione) — **non** Redis |
| Notifiche prenotazione | Coda `scheduled_notification` → processor → **log** + inbox in-app; opzionale **WhatsApp** via webhook HTTP |
| Link “Gestisci” / recensione / reset password | Costruiti con `velvet.notifications.frontend-base-url` = `SITE_BASE_URL` / `VELVET_PUBLIC_FRONTEND_URL` |

**Porte esposte sull’host Ubuntu:**

| Porta | Servizio | Note |
|-------|----------|------|
| **80** | nginx | Redirect HTTPS + challenge ACME `/.well-known/acme-challenge/` |
| **443** | nginx | SPA + API reverse-proxied |
| *nessuna* | 5432, 6379, 8080 | DB, Redis e API **non** mappati su host (hardening) |

**Limiti risorse definiti in `docker-compose.prod.yml` (somma limiti container):**

| Servizio | CPU (limit) | RAM (limit) |
|----------|-------------|-------------|
| nginx | 0.50 | 128 MB |
| api | 1.50 | 1024 MB (+ reservation 512 MB) |
| postgres | 1.00 | 1024 MB |
| redis | 0.50 | 256 MB |
| **Totale limiti** | **~3.5 vCPU** | **~2.4 GB** |

**Requisiti minimi stimati (Ubuntu host):**

| Profilo | vCPU | RAM | Disco |
|---------|------|-----|-------|
| **Minimo** (traffico iniziale) | 2 | **4 GB** | 40 GB SSD (OS + `pg_data` + log + build) |
| **Consigliato** | 4 | **8 GB** | 80 GB SSD |
| **Con margine** (backup locali, picchi JVM) | 4+ | 16 GB | 100 GB+ |

> I limiti Docker non preallocano tutta la RAM, ma sotto carico i container possono avvicinarsi ai limit; 4 GB host è il minimo realistico con OS + Docker overhead.

### 1.2 Nginx, SSL e Certbot

**Config:** `infrastructure/nginx/conf.d/app.conf`

- `server_name salonivelvet.it www.salonivelvet.it`
- Certificati montati: `./nginx/certs/fullchain.pem` + `privkey.pem`
- HTTP-01: `location /.well-known/acme-challenge/` → `root /var/www/certbot` (path **non** montato nel compose attuale)

**Procedura tipica su Ubuntu (host, non container dedicato certbot nel compose):**

```bash
# Esempio: Certbot standalone o webroot con nginx fermo / webroot condiviso
sudo apt install certbot
sudo mkdir -p /var/www/certbot
# Aggiungere volume al servizio nginx in compose, es.:
#   - /var/www/certbot:/var/www/certbot:ro
sudo certbot certonly --webroot -w /var/www/certbot \
  -d salonivelvet.it -d www.salonivelvet.it
sudo cp /etc/letsencrypt/live/salonivelvet.it/fullchain.pem infrastructure/nginx/certs/
sudo cp /etc/letsencrypt/live/salonivelvet.it/privkey.pem infrastructure/nginx/certs/
# Cron rinnovo + reload nginx
```

**Attenzione CSP:** in `app.conf`, `connect-src` include `https://api.salonivelvet.it`, mentre l’architettura Docker serve l’API su **stesso host** via `/api/` (`connect-src 'self'` è sufficiente). Se non esiste un sottodominio API reale, aggiornare la CSP per evitare blocchi browser su chiamate `fetch` verso host inesistente quando `VITE_API_BASE_URL` punta altrove.

### 1.3 Build e deploy pipeline

```bash
# 1) Frontend produzione
cd velvet-frontend
cp .env.example .env.production   # valorizzare VITE_* (vedi tabella §2)
npm ci && npm run build

# 2) Artefatto statico per nginx + SSR backend
cp -r dist ../infrastructure/frontend-web-dist/

# 3) Stack
cd ../infrastructure
cp .env.example .env              # segreti reali, NO localhost
docker compose -f docker-compose.prod.yml up -d --build
```

**Verifica:** `curl -sf https://www.salonivelvet.it/actuator/health` non è esposto pubblicamente (solo rete interna); usare `https://www.salonivelvet.it/api/...` o health via `docker compose exec api wget -qO- http://localhost:8080/actuator/health`.

### 1.4 Percorso alternativo: VM ISPConfig (MariaDB)

- Profilo: `velvet/src/main/resources/application-prod.properties` (`jdbc:mariadb`, porta default **8082**)
- Env: `velvet/deploy/velvet.env.example` → `/etc/velvet/velvet.env`
- Systemd: `velvet/deploy/velvet.service.example`
- Nginx sito: `velvet/deploy/nginx-velvet-api-location.snippet.conf` (proxy `/api/` → `127.0.0.1:8082`)

Non mescolare questo percorso con lo stack PostGIS Docker senza migrazione dati esplicita.

### 1.5 App mobile (architettura)

L’app **non chiama direttamente** l’API Spring: è una **WebView** su `velvet-frontend`.

```
Flutter (velvet-app)
  └── WebView → VELVET_WEB_BASE_URL (default https://salonivelvet.it)
        └── React SPA
              └── /api/v1/... (path relativi se VITE_API_BASE_URL vuoto)
                    └── nginx → Spring Boot
```

**Implicazione go-live:** deployare prima (o insieme) il sito su HTTPS; l’app in store non richiede un endpoint API dedicato nell’APK, solo l’origine web corretta.

---

## 2. Variabili d’Ambiente da valorizzare

### 2.1 Infrastructure — `infrastructure/.env`

| Chiave | File di riferimento | Tipo valore reale | Mappatura backend |
|--------|---------------------|-------------------|-------------------|
| `DB_NAME` | `.env.example` | Nome DB, es. `salonplatform` | `POSTGRES_DB` |
| `DB_USER` | `.env.example` | Utente non `postgres` | `SPRING_DATASOURCE_USERNAME` |
| `DB_PASSWORD` | `.env.example` | Password ≥ 20 caratteri casuali | `SPRING_DATASOURCE_PASSWORD` |
| `REDIS_PASSWORD` | `.env.example` | Password forte | `redis-server --requirepass` (container; **API non connessa**) |
| `JWT_SECRET` | `.env.example` | `openssl rand -base64 48` | `VELVET_TOKEN_SECRET`, `VELVET_AUTH_JWT_SECRET` |
| `CORS_ORIGINS` | `.env.example` | `https://www.salonivelvet.it,https://salonivelvet.it` (virgola, no spazi superflui) | `VELVET_CORS_ALLOWED_ORIGINS` |
| `SITE_BASE_URL` | `.env.example` | URL canonico HTTPS, es. `https://www.salonivelvet.it` | `VELVET_PUBLIC_FRONTEND_URL` |
| `VELVET_SUPER_ADMIN_USERNAME` | `docker-compose.prod.yml` | Email admin | Bootstrap super admin |
| `VELVET_SUPER_ADMIN_PASSWORD` | compose (opz.) | Password forte **oppure** usare hash | Solo prima installazione; preferire BCrypt hash in prod |
| `VELVET_SUPER_ADMIN_SETUP_TOKEN` | compose (opz.) | Token lungo monouso | `POST /api/v1/admin/auth/register` — **revocare dopo setup** |

**Non presenti nel compose ma disponibili in Spring** (aggiungere sotto `api.environment` se servono):

| Chiave | Tipo | Uso |
|--------|------|-----|
| `VELVET_SUPER_ADMIN_PASSWORD_HASH` | BCrypt | Preferito al posto password in chiaro |
| `VELVET_NOTIFICATIONS_WHATSAPP_ENABLED` | `true`/`false` | Canale esterno WhatsApp |
| `VELVET_NOTIFICATIONS_WHATSAPP_WEBHOOK_URL` | URL interno/esterno | Es. bridge `http://host:3099/webhooks/whatsapp` |
| `VELVET_NOTIFICATIONS_WHATSAPP_BEARER_TOKEN` | Segreto | Auth verso bridge |
| `VELVET_REVIEW_INVITE_OFFSET_HOURS` | intero | Default 2 |
| `VELVET_AUTH_ACCESS_TTL_MINUTES` | intero | Default 15 |
| `VELVET_REFRESH_TOKEN_TTL_DAYS` | intero | Default 30 |

### 2.2 Backend — profilo Docker (`application-docker.properties`)

| Proprietà Spring | Env Docker | Note |
|------------------|------------|------|
| `velvet.security.token-secret` | `VELVET_TOKEN_SECRET` | Obbligatorio, mai default dev |
| `velvet.security.auth-jwt-secret` | `VELVET_AUTH_JWT_SECRET` | Default = token secret |
| `velvet.notifications.frontend-base-url` | `VELVET_PUBLIC_FRONTEND_URL` | Link gestione/recensione/reset |
| `velvet.cors.allowed-origins` | `VELVET_CORS_ALLOWED_ORIGINS` | Bean CORS solo se valorizzato e non vuoto |
| `velvet.super-admin.*` | vedi compose | Nessun default sicuro in docker |

### 2.3 Backend — VM prod (`velvet/deploy/velvet.env.example`)

Stesse variabili `VELVET_*` + `SPRING_DATASOURCE_*` per MariaDB + `SERVER_PORT=8082`.

### 2.4 Frontend — `.env.production` (build-time Vite)

| Chiave | Tipo valore | Obbligatorietà go-live |
|--------|-------------|------------------------|
| `VITE_API_BASE_URL` | Vuoto **oppure** `https://www.salonivelvet.it` | Vuoto = `/api` same-origin (consigliato con nginx attuale) |
| `VITE_LEGAL_ENTITY_NAME` | Ragione commerciale | Obbligatorio (no `[TODO_LEGAL]`) |
| `VITE_LEGAL_ENTITY_LEGAL_NAME` | Ragione sociale completa | Obbligatorio |
| `VITE_LEGAL_ENTITY_ADDRESS` | Indirizzo sede | Obbligatorio |
| `VITE_LEGAL_ENTITY_VAT` | P.IVA | Obbligatorio |
| `VITE_LEGAL_ENTITY_DPO_EMAIL` | es. `privacy@salonivelvet.it` | Consigliato |
| `VITE_GOOGLE_MAPS_EMBED_API_KEY` | Chiave Google Cloud | Se usi embed mappa in dashboard |
| `VITE_PLAY_STORE_URL` | URL listing Play | Footer / CTA |
| `VITE_APP_STORE_URL` | URL App Store con `id` | Sostituire placeholder ricerca generica |
| `VITE_PARTNER_CONTACT_EMAIL` | Email B2B | Pagina partner |
| `VITE_PARTNER_SIGNUP_URL` | URL esterno o `/partner` | Opzionale |
| `VITE_PROXY_API_TARGET` | Solo dev | Non usare in production build |

### 2.5 App Flutter — `--dart-define` (compile-time)

| Chiave | Default nel codice | Produzione |
|--------|-------------------|------------|
| `VELVET_WEB_BASE_URL` | `https://salonivelvet.it` | **HTTPS** dominio live (con o senza `www`, coerente con certificato) |
| `VELVET_WEB_INITIAL_PATH` | `/` | Opzionale, es. `/ricerca` |
| `VELVET_WEB_USER_AGENT` | Chrome Mobile UA | Raramente da cambiare |

**Esempio build release:**

```bash
cd velvet-app
flutter build appbundle --release \
  --dart-define=VELVET_WEB_BASE_URL=https://www.salonivelvet.it
flutter build ipa --release \
  --dart-define=VELVET_WEB_BASE_URL=https://www.salonivelvet.it
```

### 2.6 Email / SMTP — stato attuale

**Non esistono** variabili `spring.mail.*`, `SMTP_*`, né integrazione JavaMail nel backend.

| Funzione | Implementazione | Env necessarie per “email reale” |
|----------|-----------------|----------------------------------|
| Conferme / promemoria prenotazione | Inbox in-app + `ScheduledNotificationProcessor` log | **Da integrare** (SMTP o provider API) |
| Reset password | `VelvetPasswordResetService` — link **solo in log** | **Da integrare** + `VELVET_PUBLIC_FRONTEND_URL` già usato per costruire URL |
| Messaggi super admin | Solo in-app | N/A |

**Se si aggiunge SMTP in futuro (non nel repo oggi), tipicamente:**

| Chiave (proposta) | Esempio |
|-------------------|---------|
| `SPRING_MAIL_HOST` | `smtp.sendgrid.net` |
| `SPRING_MAIL_PORT` | `587` |
| `SPRING_MAIL_USERNAME` | `apikey` |
| `SPRING_MAIL_PASSWORD` | segreto provider |
| `VELVET_MAIL_FROM` | `noreply@salonivelvet.it` |

### 2.7 WhatsApp bridge (opzionale) — `velvet/deploy/whatsapp-bridge/env.example`

| Chiave | Uso |
|--------|-----|
| `PORT` | Default 3099 |
| `VELVET_BRIDGE_BEARER_TOKEN` | = `VELVET_NOTIFICATIONS_WHATSAPP_BEARER_TOKEN` lato API |
| `VELVET_BRIDGE_PROVIDER` | `meta` \| `twilio` \| `log` |
| `WHATSAPP_CLOUD_*` / `TWILIO_*` | Credenziali provider |

---

## 3. Configurazione DNS & Mail

### 3.1 Record DNS (dominio `salonivelvet.it`)

| Tipo | Host | Valore | Scopo |
|------|------|--------|-------|
| **A** | `@` | IP pubblico VPS Ubuntu | Apex → server |
| **A** | `www` | IP pubblico (o stesso del apex) | Sito canonico |
| **A** o **CNAME** | `api` | Solo se si usa sottodominio API separato | Opzionale; **non richiesto** dallo stack Docker attuale (API su `/api/`) |
| **CNAME** | `www` → `@ | Alternativa ad A duplicato | Redirect gestito da nginx |
| **AAAA** | `@`, `www` | IPv6 del server | Se il provider espone IPv6 |

**Non richiesti per funzionamento app/API:** TXT per Google Search Console (consigliato post-deploy), record MX se non ricevi mail sul dominio.

### 3.2 Email — SPF, DKIM, DMARC

Allineare i domini nelle informative (`legalReferences.ts` oggi cita `saloniluxury.it`; infrastruttura e compose usano `salonivelvet.it`) **prima** di pubblicare SPF.

**Caselle tipiche go-live** (da attivare sul provider mail):

- `privacy@salonivelvet.it` — DPO / diritti interessato  
- `assistenza@salonivelvet.it` — supporto e store  
- `noreply@salonivelvet.it` — futuro SMTP transazionale  

| Tipo | Esempio (provider SMTP `mail.salonivelvet.it`) |
|------|-----------------------------------------------|
| **MX** | Priorità 10 → hostname provider (Google Workspace, Aruba, ecc.) |
| **TXT (SPF)** | `v=spf1 include:_spf.google.com ~all` (adattare al provider) |
| **TXT (DKIM)** | Record `selector._domainkey` fornito dal provider |
| **TXT (DMARC)** | `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:dmarc@salonivelvet.it` |

Finché **non** c’è invio SMTP dal backend, SPF/DKIM sono comunque necessari per le caselle **umane** (assistenza/privacy) e per eventuali `mailto:` nel sito.

### 3.3 CORS — quando configurarlo

| Scenario | `CORS_ORIGINS` / `velvet.cors.allowed-origins` |
|----------|-----------------------------------------------|
| SPA e API su **stesso** `https://www.salonivelvet.it`, `VITE_API_BASE_URL` vuoto | CORS **non necessario** per il browser (same-origin) |
| SPA su `www` e API su `api.salonivelvet.it` | Obbligatorio: entrambe le origini HTTPS esatte |
| Dev Vite `localhost:5173` → API diretta | `http://localhost:5173` (solo lab) |

Implementazione: `VelvetCorsConfiguration.java` — attivo solo se `velvet.cors.allowed-origins` non vuoto; path `/api/**`; `allowCredentials=false`.

### 3.4 Cookie refresh e dominio

Refresh token: cookie `velvet_rt`, path `/api/v1/auth`, `Secure` in produzione. SPA e API devono condividere **stesso site** (stesso registrable domain) per il refresh via cookie.

---

## 4. Checklist Store Mobile (Flutter `velvet-app`)

### 4.1 Endpoint di produzione

| Componente | URL produzione | Note |
|------------|----------------|------|
| Sito / WebView | `https://salonivelvet.it` o `https://www.salonivelvet.it` | `--dart-define=VELVET_WEB_BASE_URL=...` |
| API REST | `https://<stesso-host>/api/v1/...` | Gestita dal frontend, **non** dall’app nativa |
| Legal embed | `{WEB_BASE}/privacy/clienti?embed=1` ecc. | `velvetLegalPanelPaths.ts` |

**Non usare in release:** `http://127.0.0.1:5173`, `http://10.0.2.2:5173`, IP LAN.

### 4.2 Identificativi store (verificare coerenza)

| Piattaforma | Identificativo nel repo | Azione |
|-------------|-------------------------|--------|
| Android | `applicationId` = `it.salonivelvet.velvet_app` | Deve coincidere con Play Console |
| iOS | `PRODUCT_BUNDLE_IDENTIFIER` = `it.salonivelvet.velvetApp` | **Diverso da Android** — registrare bundle Apple corretto |
| Versione | `pubspec.yaml` `1.0.0+1` | Incrementare `version` per ogni upload |

### 4.3 Android — build produzione

| Step | Comando / file |
|------|----------------|
| Keystore release | Creare `upload-keystore.jks`; configurare `signingConfigs` in `android/app/build.gradle.kts` (**oggi firma debug in release — da correggere**) |
| Cleartext | `AndroidManifest.xml` ha `usesCleartextTraffic="true"` — per prod usare solo HTTPS; collegare `network_security_config.xml` nel manifest |
| Permessi | `INTERNET` in debug/profile; geolocalizzazione **non** a livello nativo (Web API nel browser/WebView) |
| AAB Play Store | `flutter build appbundle --release --dart-define=VELVET_WEB_BASE_URL=https://www.salonivelvet.it` |
| APK sideload | `flutter build apk --release` (stesso define) |

### 4.4 iOS — build produzione

| Step | Comando / file |
|------|----------------|
| Team / certificati | Xcode → Signing & Capabilities |
| Display name | `Info.plist` → `Velvet App` (allineare branding store) |
| ATS | `NSAllowsLocalNetworking` = true (utile dev); produzione solo HTTPS |
| Geolocalizzazione | **Nessuna** `NSLocationWhenInUseUsageDescription` oggi — se in futuro si espone GPS nativo, aggiungere stringa |
| IPA / TestFlight | `flutter build ipa --release --dart-define=VELVET_WEB_BASE_URL=https://www.salonivelvet.it` |
| Upload | Xcode Organizer o `xcrun altool` / Transporter |

### 4.5 Sicurezza WebView

- `VelvetDomainGuard` — navigazione limitata a `salonivelvet.it`, `www.salonivelvet.it` + host dev se `isLocalDev`
- Link esterni `tel:`, `mailto:`, `whatsapp:` → `url_launcher`

### 4.6 Console store — URL obbligatori

Pubblicare su Play Console / App Store Connect (coerenti con deploy):

| Documento | Path |
|-----------|------|
| Privacy B2C (app cliente) | `/privacy/clienti` |
| Privacy staff | `/privacy/staff` |
| Privacy B2B saloni | `/privacy` |
| Elimina account | `/privacy/elimina-account` |
| Termini | `/termini` |
| Hub legale | `/legale` |

Base: `https://www.salonivelvet.it` + path (con `?embed=1` solo in-app, non richiesto dalle console).

### 4.7 Checklist pre-upload

- [ ] Sito produzione live su HTTPS
- [ ] `VELVET_WEB_BASE_URL` = dominio live nella build release
- [ ] Firma release Android configurata (non debug)
- [ ] Bundle ID iOS registrato su Apple Developer
- [ ] Screenshot e policy data safety allineati a privacy B2C pubblicata
- [ ] `./velvet-audit.sh` e `./go-live-check.sh` senza FAIL critici

---

## 5. Gap e tasselli mancanti (priorità)

| Priorità | Gap | Impatto |
|----------|-----|---------|
| **P0** | Segreti dev in `application.properties` default super admin | Sicurezza — sovrascrivere tutto via env in prod |
| **P0** | `infrastructure/.env` con `localhost` / placeholder | Link e CORS errati |
| **P0** | Firma Android release (debug keys) | Play Store rifiuta o rischio sicurezza |
| **P1** | SMTP / invio email reale | UX reset password e notifiche esterne |
| **P1** | Allineamento domini email (`saloniluxury.it` vs `salonivelvet.it`) | SPF e fiducia utente |
| **P1** | CSP `api.salonivelvet.it` vs same-origin | Possibili errori runtime frontend |
| **P2** | Redis nel compose non usato dall’API | Costo risorse o futuro uso cache |
| **P2** | `ddl-auto=update` in docker | Usare `validate` + migrazioni Flyway/Liquibase per prod madura |
| **P2** | Servizio Certbot / volume webroot in compose | Automazione rinnovo TLS |
| **P2** | Variabili WhatsApp non nel `docker-compose.prod.yml` | Deploy bridge separato da documentare |

---

## 6. Piano d’azione operativo (ordine suggerito)

1. **Server Ubuntu:** provisioning 4+ GB RAM, Docker, firewall (solo 80/443).
2. **DNS:** A/AAAA verso VPS; decidere canonico `www` vs apex (nginx gestisce entrambi).
3. **TLS:** Certbot + copia cert in `infrastructure/nginx/certs/`.
4. **Segreti:** `infrastructure/.env` da `.env.example`; ruotare `JWT_SECRET`, password DB/Redis.
5. **Legal + frontend:** `.env.production` completo; `npm run build`; copia in `frontend-web-dist`.
6. **Stack:** `docker compose -f docker-compose.prod.yml up -d --build`; smoke test login, ricerca, prenotazione.
7. **Super admin:** setup token o register; poi **rimuovere** `VELVET_SUPER_ADMIN_SETUP_TOKEN` e password in chiaro.
8. **Search Console:** invio `sitemap.xml`.
9. **Mobile:** fix signing Android; build AAB/IPA con `VELVET_WEB_BASE_URL`; upload store.
10. **Post go-live:** valutare SMTP, allineare copy “Redis” vs Postgres, hardening `ddl-auto`.

---

## 7. Riferimenti file nel monorepo

| Area | Path |
|------|------|
| Compose prod | `infrastructure/docker-compose.prod.yml` |
| Nginx | `infrastructure/nginx/conf.d/app.conf` |
| Env infra | `infrastructure/.env.example` |
| Backend Docker | `velvet/Dockerfile`, `velvet/src/main/resources/application-docker.properties` |
| Backend VM prod | `velvet/src/main/resources/application-prod.properties`, `velvet/deploy/velvet.env.example` |
| CORS | `velvet/src/main/java/it/velvet/config/VelvetCorsConfiguration.java` |
| Notifiche / no email | `velvet/.../ScheduledNotificationProcessor.java`, `VelvetPasswordResetService.java` |
| Frontend env | `velvet-frontend/.env.example`, `velvet-frontend/src/config/env.ts` |
| App mobile | `velvet-app/lib/config/velvet_app_config.dart`, `velvet-app/README.md` |
| Script verifica | `go-live-check.sh`, `velvet-audit.sh`, `docs/GO_LIVE.md` |

---

*Documento generato da analisi statica del monorepo. Eseguire `./go-live-check.sh` e `./velvet-audit.sh` sul branch da rilasciare prima del deploy.*
