# Salon Platform — Gestionale SaaS B2B2C per saloni

Piattaforma per parrucchieri, estetisti e massaggiatori con:

- **Area privata** (Admin React + App Flutter) per gestire i saloni.
- **Area pubblica web** indicizzabile da Google, con ricerca geolocalizzata e
  pagine salone ottimizzate per la **Local SEO**.

## Struttura

```
my-salon-platform/
├── backend/            # Java 21 · Spring Boot 3 · Spring Security 6 · PostGIS · Redis
├── frontend-web/       # React + TS + Vite + Tailwind (SEO / JSON-LD)
├── frontend-mobile/    # Flutter · Dio · flutter_secure_storage
└── infrastructure/     # Docker Compose prod + Nginx indurito
```

## Sviluppo frontend-web

```bash
cd frontend-web
npm install
npm run dev        # http://localhost:5173 (proxy /api -> http://localhost:8080)
```

## Avvio in produzione

```bash
# 1) Build della SPA
cd frontend-web && npm install && npm run build

# 2) Copia la build dove Nginx e il backend la leggono
cp -r frontend-web/dist infrastructure/frontend-web-dist

# 3) Avvia lo stack (certificati TLS in infrastructure/nginx/certs)
cd infrastructure
cp .env.example .env        # valorizza segreti + SITE_BASE_URL
docker compose -f docker-compose.prod.yml up -d --build
```

## Prima del go-live (promemoria)

Quando il software è finito e stai per andare in produzione / sugli store:

```bash
./go-live-status.sh             # cosa è fatto / cosa resta da fare
./go-live-check.sh              # scan placeholder legali, segreti dev, .env + checklist
./go-live-check.sh --reminder   # solo checklist
./velvet-audit.sh && ./go-live-status.sh && ./go-live-check.sh
```

Dettaglio: [docs/GO_LIVE.md](docs/GO_LIVE.md)

## SEO — come viene indicizzato

- **`/saloni/{slug}`** è servito da Nginx → backend Spring Boot, che inietta lato
  server i meta tag e il JSON-LD (`HairSalon`/`BeautySalon`) nel `<head>`:
  Google legge i dati strutturati **senza eseguire JavaScript**.
- **`/sitemap.xml`** è generata dinamicamente dal backend (un'entry per ogni salone
  attivo, con `lastmod`); va inviata a Google Search Console.
- **`/robots.txt`** punta alla sitemap e blocca `/api/`.
- La SPA React idrata la pagina per l'interattività e aggiorna l'head sulle
  navigazioni client-side.

## Endpoint chiave

| Metodo | Path | Auth | Note |
|--------|------|------|------|
| GET | `/api/v1/public/saloni/search?lat=&lng=&raggio_km=` | pubblico | ricerca geospaziale PostGIS |
| GET | `/api/v1/public/saloni/{slug}` | pubblico | profilo JSON per la SPA |
| GET | `/saloni/{slug}` | pubblico | pagina HTML con SSR dell'head (SEO) |
| GET | `/sitemap.xml` · `/robots.txt` | pubblico | discovery per i crawler |
| POST | `/api/v1/auth/login` · `/register` · `/refresh` | pubblico | JWT + refresh rotation Redis |
| DELETE | `/api/v1/users/me` | JWT | eliminazione account (GDPR / Store) |

## Dipendenze Flutter (pubspec.yaml)

```yaml
dependencies:
  dio: ^5.7.0
  flutter_secure_storage: ^9.2.2
  crypto: ^3.0.5
```
