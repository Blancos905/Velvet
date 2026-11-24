# Checklist manutenzione database / infrastruttura

Usare insieme a `SKILL.md` e `./luxury-database-maintenance.sh`.

---

## compose / rete / hardening

| Check | Verifica | □ |
|------|----------|---|
| `docker-compose.prod.yml` | solo `nginx` con `ports:` 80/443 | □ |
| `api` | solo `expose`, niente `ports` host | □ |
| `postgres` | nessuna porta host, volume `pg_data` | □ |
| `redis` | nessuna porta host, volume `redis_data` | □ |
| reti | `backplane.internal: true` | □ |
| hardening | `no-new-privileges`, restart, logging, limiti risorse | □ |
| healthcheck | `api`, `postgres`, `redis` presenti | □ |
| log rotation | `json-file` `max-size/max-file` | □ |

---

## nginx / TLS / edge

| Check | Verifica | □ |
|------|----------|---|
| `app.conf` | redirect 80→443 | □ |
| TLS | `fullchain.pem` + `privkey.pem` montati | □ |
| headers | HSTS, XFO, nosniff, referrer policy, permissions policy | □ |
| CSP | coerente con same-origin `/api` o sottodominio reale | □ |
| asset cache | `/assets/` immutable | □ |
| SPA fallback | `try_files ... /index.html` | □ |
| SSR SEO | proxy `/saloni/`, `robots.txt`, `sitemap.xml` | □ |
| ACME | webroot certbot montato o procedura host documentata | □ |

---

## PostgreSQL / PostGIS

| Check | Verifica | □ |
|------|----------|---|
| image | `postgis/postgis` coerente | □ |
| env | `DB_NAME`, `DB_USER`, `DB_PASSWORD` da `.env` | □ |
| volume | `pg_data` persistente | □ |
| health | `pg_isready` | □ |
| restore path | dump `.sql.gz` ripristinabile via `psql` | □ |
| SQL manuali | inventario `luxury/deploy/sql/*.sql` presente | □ |
| backup ricorrente | `scripts/backup-postgres.sh` + cron | □ |
| retention | prune giorni configurabile | □ |

---

## Redis

| Check | Verifica | □ |
|------|----------|---|
| password | `--requirepass ${REDIS_PASSWORD}` | □ |
| persistence | `--save 60 1` + `--appendonly yes` | □ |
| volume | `redis_data` persistente | □ |
| health | `redis-cli ... ping` | □ |
| backup ricorrente | export AOF/RDB via `scripts/backup-redis.sh` | □ |
| restore path | file dump copiabili e ricaricabili | □ |

---

## segreti / file sensibili

| Check | Verifica | □ |
|------|----------|---|
| `.gitignore` | ignora `infrastructure/.env`, cert, backup | □ |
| `.env.example` | solo placeholder, niente segreti reali | □ |
| `.env` reale | non committato | □ |
| dump | nessun dump SQL/RDB/AOF in git | □ |
| cert | nessun certificato reale in git | □ |

---

## backup / restore / schedulazione

| Check | Verifica | □ |
|------|----------|---|
| `backup-postgres.sh` | dump compresso + metadata | □ |
| `backup-redis.sh` | snapshot Redis + metadata | □ |
| `backup-database-stack.sh` | orchestration unica | □ |
| `install-database-backup-cron.sh` | cron ogni 6h (o simile) con retention | □ |
| retention | default documentata (`BACKUP_RETENTION_DAYS`) | □ |
| destinazione | `BACKUP_ROOT` esterno/gitignored | □ |
| restore smoke | comando di restore stampato nei metadata | □ |

---

## query / SQL / schema drift

| Check | Verifica | □ |
|------|----------|---|
| SQL patches | file in `luxury/deploy/sql/` inventariati | □ |
| schema drift | modifiche entity ↔ patch SQL allineate | □ |
| reset scripts | `reset_luxury_users_and_salons.sql` non usato in prod | □ |
| naming | patch postgres/mariadb separate dove serve | □ |

---

## smell noti da monitorare

| Finding | Severità | Note |
|--------|----------|------|
| CSP `connect-src https://api.saloniluxury.it` vs same-origin `/api` | WARN | possibile mismatch runtime |
| ACME webroot non montato nel compose attuale | WARN | rinnovo TLS da automatizzare |
| backup non presenti prima di questa manutenzione | FAIL storico | ora coperti da nuovi script |

---

## Output atteso di `manutenzione database`

1. Stato compose/hardening
2. Stato Nginx/TLS/CSP
3. Stato Postgres/Redis/volumi
4. Stato backup/restore/cron
5. Rischi e azioni prioritarie
