---
name: manutenzione-database
description: Esegue la manutenzione completa di infrastruttura, Docker e database Luxury: compose prod, Nginx, PostgreSQL/PostGIS, Redis, SQL manuali, healthcheck, segreti e backup ricorrenti. Usa quando l'utente dice «manutenzione database», «manutenzione infrastruttura», «database maintenance», «controllo docker», «revisione database» o «scan infrastruttura».
---

# Manutenzione database / infrastruttura Luxury

## Trigger (verbatim)

Attiva questo workflow quando l'utente dice: **manutenzione database**

Sinonimi ammessi: manutenzione infrastruttura, database maintenance, infrastructure maintenance, controllo database, controllo docker, revisione infrastruttura, scan database.

## Obiettivo

Controllare **in profondità** `infrastructure/`, Docker Compose, Nginx, Postgres/PostGIS, Redis, SQL manuali e strategia backup/restore, e **correggere automaticamente** tutto ciò che è sicuro, locale e non distruttivo. Non limitarsi a un `docker compose config`.

## Principio operativo

- `nginx` è l'unica superficie pubblica.
- `api`, `postgres`, `redis` non devono esporre porte host.
- PostgreSQL è il dato primario; Redis è stato volatile ma persistito con AOF/RDB.
- I backup devono essere **ricorrenti**, con retention e prova di restore documentata.

## Workflow obbligatorio

```text
Manutenzione database — progress:
- [ ] 0. Leggere docs infra + compose
- [ ] 1. Script ./luxury-database-maintenance.sh
- [ ] 2. Checklist infrastructure/DB (CHECKLIST.md)
- [ ] 3. Verifica backup/restore e cron
- [ ] 4. Report finale
```

### 0. Documentazione da leggere

- `docs/LUXURY_PROJECT_MASTER.md`
- `docs/INFRSTRUTTURA_PRODUZIONE_CHECKLIST_GO_LIVE.md`
- `infrastructure/docker-compose.prod.yml`
- `infrastructure/nginx/conf.d/app.conf`
- `infrastructure/.env.example`

### 1. Script automatico

```bash
./luxury-database-maintenance.sh
# varianti: --fast · --smells · --backup · --docker-config · --sql · --help
```

### 1-bis. Correzioni automatiche obbligatorie

Quando l'utente invoca **manutenzione database**, non fermarti al report:

1. correggi automaticamente script, compose, documentazione, ignore list, cron helper e backup wiring che puoi sistemare in sicurezza;
2. rilancia i check dopo ogni fix sostanziale (`./luxury-database-maintenance.sh`, `docker compose ... config`, backup checks);
3. lascia nel report finale solo i problemi residui che richiedono host reale, credenziali, container live o decisioni operative.

### 2. Controlli trasversali (ogni virgola)

| Check | Criterio FAIL |
|-------|----------------|
| Surface | Porte 5432/6379/8080 esposte sull'host |
| Secrets | file reali `.env`, `key.properties`, cert o dump dentro git |
| Compose | healthcheck mancanti, volume DB assente, hardening mancante |
| Nginx | TLS/cert path rotti, CSP incoerente, nessun redirect HTTPS |
| DB | nessun piano di dump periodico / retention |
| Redis | nessuna persistenza AOF/RDB o restore path assente |
| SQL | patch manuali senza inventario / ordine di applicazione |
| Backups | nessun cron/systemd timer o script host per dump costanti |
| Restore | backup non comprimibili/non verificabili o restore non documentabile |

### 3. Report finale (template)

```markdown
# Manutenzione database — report

**Data:** YYYY-MM-DD
**Script:** PASS | FAIL (N fail, M warn)

## Executive summary
1-3 frasi.

## FAIL
- [area/file] — problema — evidenza

## WARN
- …

## PASS per area
| Area | Esito | Note |
|------|-------|------|
| compose | … | … |
| nginx | … | … |
| postgres | … | … |
| redis | … | … |
| backup | … | … |

## Azioni consigliate
1. …
```

## Cosa non fare

- Non committare dump, `.env` reali, cert o backup.
- Non aprire porte DB/Redis “solo per comodità”.
- Non affidarsi al solo volume Docker senza dump esportabili.
- Non dichiarare “backup attivi” senza schedulazione host verificabile.
- Non fare commit automatici, ma **sì** a fix automatici locali e sicuri durante la manutenzione.

## Risorse

- Checklist: [CHECKLIST.md](CHECKLIST.md)
- Script manutenzione: `./luxury-database-maintenance.sh`
- Backup Postgres: `scripts/backup-postgres.sh`
- Backup Redis: `scripts/backup-redis.sh`
- Backup stack: `scripts/backup-database-stack.sh`
- Cron example/install: `scripts/install-database-backup-cron.sh`
