# Briefing progetto "Velvet" (Salon Platform) — contesto per Gemini

> Documento di contesto da incollare a un assistente AI (Gemini) per spiegargli
> cosa stiamo costruendo, com'è organizzato il repo e con quali tecnologie.
> Monorepo: `my-salon-platform/`.

---

## 1. In una frase

Stiamo costruendo **Velvet**, un **gestionale SaaS B2B2C per saloni** (parrucchieri,
estetisti, massaggiatori): da un lato dà ai titolari un'area privata per gestire
salone, appuntamenti, clienti e catalogo servizi; dall'altro espone un'**area
pubblica web indicizzabile da Google** con ricerca geolocalizzata dei saloni e
pagine ottimizzate per la **Local SEO**.

I due tipi di utente:
- **B2B** — i saloni (staff/titolari) che gestiscono la propria attività.
- **B2C** — i consumatori finali che cercano un salone, prenotano e lasciano recensioni.

---

## 2. Architettura del monorepo

```
my-salon-platform/
├── velvet/            # BACKEND  — Java 17 · Spring Boot · Spring Security · JPA · PostgreSQL/PostGIS · Redis
├── velvet-frontend/   # WEB      — React 18 + TypeScript + Vite + Tailwind (SPA + SSR dell'<head> per SEO)
├── velvet-app/        # MOBILE   — Flutter: shell WebView che carica velvet-frontend (nessuna logica duplicata)
├── infrastructure/    # DEVOPS   — Docker Compose di produzione + Nginx indurito + PostGIS + Redis
├── check-all.sh       # gate tecnico: compile, type-check, test (tutti i moduli)
├── velvet-audit.sh    # audit Cursor/CI: statici, test, flussi API, compliance App/Play Store
└── README.md
```

> Nota: il README storico cita i nomi `backend/`, `frontend-web/`, `frontend-mobile/`.
> Le cartelle reali oggi sono `velvet/`, `velvet-frontend/`, `velvet-app/`.

---

## 3. Backend — `velvet/` (Java + Spring Boot)

- **Stack**: Java 17, Spring Boot (parent 4.x), Spring Security 6, Spring Data JPA,
  Bean Validation, Spring MVC, Actuator, springdoc-openapi (Swagger UI).
- **Database**: PostgreSQL + **PostGIS** (ricerca geospaziale). H2 in-memory per i test,
  driver MariaDB/Postgres a runtime.
- **Auth**: JWT firmati HS256 (nimbus-jose-jwt) + **refresh token rotation su Redis**.
  Supporto OIDC. Setup super-admin alla prima installazione via setup-token.
- **Build**: Maven (`./mvnw`). Main class `it.velvet.VelvetApplication`.

### Moduli (package `it.velvet.*`)
- `security/` — autenticazione, audit, JWT, controller di login/register/refresh.
- `admin/` — funzioni **super-admin** (overview, stato sistema, gestione consumer).
- `staff/` — operatività **lato salone**: appuntamenti, catalogo, clienti, riepilogo giornaliero.
- `consumer/` — area **"me"** dell'utente finale: profilo, preferiti, recensioni, notifiche,
  appuntamenti, gestione salone/servizi/clienti, export dati (GDPR), supporto.
- `publicapi/` — endpoint **pubblici**: ricerca geolocalizzata (locate), pagine salone,
  registrazione consumer/cliente, gestione prenotazione, recensioni.
- `studio/`, `appointment/`, `catalog/`, `review/`, `notification/` — domini di business
  (servizi, appuntamenti, catalogo, recensioni, notifiche con job schedulati).
- `bootstrap/`, `config/`, `common/` — bootstrap, configurazione, utility condivise (jwt, oidc, api).

### SEO (punto chiave del prodotto)
- `/saloni/{slug}` è servito da Nginx → Spring Boot, che **inietta lato server** i meta tag
  e il **JSON-LD** (`HairSalon`/`BeautySalon`) nell'`<head>`: Google legge i dati strutturati
  **senza eseguire JavaScript**. La SPA React poi idrata la pagina per l'interattività.
- `/sitemap.xml` generata dinamicamente (un'entry per salone attivo, con `lastmod`).
- `/robots.txt` punta alla sitemap e blocca `/api/`.

### Endpoint chiave
| Metodo | Path | Auth | Note |
|--------|------|------|------|
| GET | `/api/v1/public/saloni/search?lat=&lng=&raggio_km=` | pubblico | ricerca geospaziale PostGIS |
| GET | `/api/v1/public/saloni/{slug}` | pubblico | profilo JSON per la SPA |
| GET | `/saloni/{slug}` | pubblico | pagina HTML con SSR dell'head (SEO) |
| GET | `/sitemap.xml` · `/robots.txt` | pubblico | discovery per i crawler |
| POST | `/api/v1/auth/login` · `/register` · `/refresh` | pubblico | JWT + refresh rotation Redis |
| DELETE | `/api/v1/me/account` | JWT | eliminazione account (GDPR / store) |

---

## 4. Frontend web — `velvet-frontend/` (React + TS + Vite)

- **Stack**: React 18, TypeScript, Vite 5, Tailwind 3, React Router 6,
  TanStack React Query, Framer Motion, lucide-react, jsPDF, react-rnd.
  Test con Vitest.
- **Ruolo**: è l'unica UI sia per il web pubblico sia per l'area privata; viene anche
  incapsulata nella WebView dell'app mobile.
- **Build di prod** copiata in `infrastructure/frontend-web-dist/` e servita da Nginx;
  lo stesso `dist` è montato anche nel backend per il SSR dell'`<head>`.

### Pagine principali (`src/pages/`)
`HomePage`, `SearchPage`, `SalonExplorePage`, `SalonPage`, `SalonPersonalPage`,
`SalonPlansPage`, `PartnerPage`, `ReviewPage`, `ClientSignupPage`,
`PasswordResetPage`, `OidcCallbackPage`, `MonthlyIdeaPage`, più sezioni `account/`,
`admin/`, `legal/`, `dev/`.

### Struttura `src/`
`api/` (client HTTP, gestione errori e sessione), `auth/`, `components/`, `hooks/`,
`layout/`, `providers/`, `content/`, `data/`, `lib/`, `styles/`, `utils/`.

---

## 5. App mobile — `velvet-app/` (Flutter)

- **Filosofia**: shell sottile, **niente logica duplicata**. L'app è una WebView che
  carica `velvet-frontend`.
- **Stack**: Flutter (Dart >=3.5), `webview_flutter` (+ Android/WKWebView), `url_launcher`.
- **Sicurezza**: `velvet_domain_guard.dart` limita la navigazione ai domini consentiti.
- **File chiave**: `lib/main.dart`, `lib/shell/velvet_web_shell.dart`,
  `lib/config/velvet_app_config.dart`, `lib/security/velvet_domain_guard.dart`.

---

## 6. Infrastruttura — `infrastructure/` (Docker + Nginx)

`docker-compose.prod.yml` con hardening forte:
- **Nginx** (`nginx:1.27-alpine`): unico servizio esposto (80/443), TLS termination,
  security headers, serve la SPA e fa da reverse proxy verso l'API.
- **api** (Spring Boot): build da `../velvet`, profilo `docker`, raggiunge DB e Redis;
  healthcheck su `/actuator/health`; **non** pubblica porte sull'host.
- **postgres** (`postgis/postgis:16-3.4`): **isolato** sulla rete interna `backplane`,
  nessuna porta verso Internet.
- **redis** (`redis:7.4-alpine`): isolato, con password, append-only; usato per la
  refresh-token rotation e cache.

Principi: due reti (`edge` pubblica, `backplane` `internal: true`), limiti CPU/RAM per
servizio, `no-new-privileges`, restart automatico, segreti via file `.env`
(`DB_*`, `JWT_SECRET`, `REDIS_PASSWORD`, `SITE_BASE_URL`, `CORS_ORIGINS`, super-admin).

---

## 7. Come gira (in breve)

```bash
# Frontend in sviluppo (proxy /api -> http://localhost:8080)
cd velvet-frontend && npm install && npm run dev

# Backend in sviluppo
cd velvet && ./mvnw spring-boot:run

# Produzione: build SPA -> copia in infrastructure/frontend-web-dist -> compose up
cd velvet-frontend && npm run build
cp -r velvet-frontend/dist infrastructure/frontend-web-dist
cd infrastructure && cp .env.example .env   # valorizza i segreti
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Piani salone (Free vs Premium) — regola importante

| Piano | Registrazione | Pannello web (`/account`) | App mobile |
|-------|---------------|---------------------------|------------|
| **Free (BASE)** | Solo dall'**app** (su `/piani` il web mostra: scarica l'app) | **Nessun pannello**: su `/account` da browser compare la card `SalonFreeWebPanelGate` (invito Premium, senza hub gestionale) | Stessa SPA in WebView con vincoli Free (`velvet_free_web_bridge.dart`) |
| **Premium** | Web (`/piani`) o app | Pannello completo (vetrina, brand, clienti, chat, statistiche, …) | Stessa SPA in WebView + funzioni Premium |

Anche dopo registrazione Free dall'app, il titolare sul web vede solo `SalonFreeWebPanelGate` in `AccountLayout` (può accedere con le credenziali ma non l'hub account). In app: tema e filtri nav in `velvet_free_web_bridge.dart`.

---

## 9. Cosa serve sapere quando ci aiuti

- È un **monorepo a 4 progetti** (backend Java, frontend React, app Flutter, infra Docker)
  fortemente integrati: la SPA è il cuore, riusata su web e mobile, con SSR dell'head per la SEO.
- La **SEO local** (JSON-LD, sitemap, slug per salone) è un requisito di prodotto, non un dettaglio.
- La **sicurezza** è centrale: JWT+refresh su Redis, DB/Redis isolati, Nginx unico ingresso.
- Convenzioni: codice e commenti del progetto sono in **italiano**; i package backend sotto `it.velvet`.
- **Email Aruba (`saloniluxury.it`):** login pannello hosting = `19867967@aruba.it` (non la Gmail di contatto); caselle `privacy@`, `assistenza@`, `noreply@`; SMTP backend usa `noreply@saloniluxury.it` su `smtps.aruba.it:465` (SSL).
