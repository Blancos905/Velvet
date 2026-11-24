# Luxury (`my-salon-platform`)

SaaS B2B2C per saloni (Saloni Luxury). La mappa e le porte sono quelle del repo, non quelle del README storico (`backend/`, `frontend-web/`).

## Mappa

| Cartella | Cosa contiene |
|---|---|
| `luxury/` | API Java 21, Spring Boot (`pom.xml`, `./mvnw`) |
| `luxury-frontend/` | UI React 18, TypeScript, Vite |
| `luxury-app/` | App Flutter: shell WebView sul frontend |
| `infrastructure/` | Docker Compose di sviluppo e di produzione |
| `scripts/` | Avvio e script di supporto |
| `docs/` | Documentazione |
| `.cursor/rules/` | Regole di prodotto già presenti |

## Avvio

```bash
./scripts/dev-docker.sh -d
```

Compose: `infrastructure/docker-compose.dev.yml`.

| Cosa | Indirizzo |
|---|---|
| Clienti e ricerca | http://127.0.0.1:8080 |
| Pannello salone | http://127.0.0.1:8083 |
| Super admin | http://127.0.0.1:8084 |
| API | http://127.0.0.1:8082/api/v1/public/health |
| Database di lavoro | PostgreSQL del Mac, `localhost:5432`, database e schema `c1luxury` |
| Redis | container, porta host `6380` |

Il Postgres del compose (profilo `embedded-db`) pubblica la porta host `5433` ed è un volume separato.

Verifica: `curl -sf http://127.0.0.1:8082/api/v1/public/health` e `curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/`.

Test già previsti dal repo: `cd luxury && ./mvnw test` e `cd luxury-frontend && npm test`.

## Documenti

La tabella è un indice. Si apre solo il documento del compito, non tutti a ogni modifica.

| Documento | Aprilo se |
|---|---|
| `docs/LUXURY_PROJECT_MASTER.md` | serve il contesto di prodotto |
| `.cursor/rules/*.mdc` | il compito tocca l’area di quella regola |
| `docs/GO_LIVE.md` | il compito tocca go-live, legali o store |

Una regola nuova di prodotto in `.cursor/rules/` si scrive solo se l’agente ha ripetuto lo stesso errore. Non a ogni feature.

## Definition of Done

Eseguire la skill `verify-change` sui moduli toccati.

## Code Graph

Per esplorare il codice di questo repo usa il tool `codegraph_explore` sul path `/Users/michelecostantino/Developer/Velvet/my-salon-platform`.
