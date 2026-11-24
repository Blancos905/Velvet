---
name: manutenzione-backend
description: >-
  Esegue la manutenzione completa del backend Luxury (Java/Spring in luxury/):
  inventario CodeGraph di tutte le classi, smell statici, sicurezza, tenant
  isolation, billing, booking, chat, job schedulati e gap di test. Usa quando
  l'utente dice «manutenzione backend», «manutenzione BE», «backend maintenance»,
  «controllo backend», «revisione backend» o «scan backend».
---

# Manutenzione backend Luxury

## Trigger (verbatim)

Attiva questo workflow quando l'utente dice: **manutenzione backend**

Sinonimi ammessi: manutenzione BE, backend maintenance, controllo backend, revisione backend, scan backend.

## Obiettivo

Controllare il backend **in profondità** (ogni package `it.luxury.*`, ogni controller/service/entity critica) usando CodeGraph + script automatico + checklist, e **correggere automaticamente** tutto ciò che è sicuro, locale e non distruttivo. Non limitarsi a un smoke test.

## Inventario di riferimento (baseline CodeGraph)

Aggiornato all'indicizzazione del repo (~418 file Java, ~365 class nodes):

| Stereotipo | ~Count | Path tipico |
|------------|--------|-------------|
| Classi Java main | 341 | `luxury/src/main/java/it/luxury/**` |
| `@RestController` | 40 | `*/api/*Controller.java` |
| `@Service` | 93 | `*/service/*Service.java` |
| Repository | 27 | `*/domain/*Repository.java` |
| `@Entity` | ~29 | `*/domain/*.java` |
| Job `@Scheduled` | 4 | `*/job/*Job.java` |
| Test Java | ~72 | `luxury/src/test/java/it/luxury/**` |

Package top-level: `admin`, `appointment`, `billing`, `bootstrap`, `catalog`, `common`, `config`, `consumer`, `dev`, `integrations`, `legal`, `notification`, `publicapi`, `review`, `security`, `staff`, `studio`.

## Workflow obbligatorio

Copia e traccia:

```
Manutenzione backend — progress:
- [ ] 0. Sync CodeGraph
- [ ] 1. Script automatico ./luxury-backend-maintenance.sh
- [ ] 2. CodeGraph blast radius (simboli critici)
- [ ] 3. Checklist package-by-package (CHECKLIST.md)
- [ ] 4. Gap test / smell / security
- [ ] 5. Report finale
```

### 0. Sync CodeGraph

```bash
devtools/codegraph/node_modules/.bin/codegraph sync
devtools/codegraph/node_modules/.bin/codegraph status
```

Preferisci MCP `codegraph_explore` se disponibile; altrimenti CLI:

```bash
devtools/codegraph/node_modules/.bin/codegraph explore "NomeClasse"
```

### 1. Script automatico

```bash
./luxury-backend-maintenance.sh
# varianti: --fast (no Maven) · --codegraph · --smells · --help
```

Interpreta FAIL come bloccanti, WARN come debito da riportare.

### 1-bis. Correzioni automatiche obbligatorie

Quando l'utente invoca **manutenzione backend**, non fermarti al report:

1. correggi automaticamente smell, config, test, wiring, doc e incoerenze locali che puoi risolvere in sicurezza;
2. dopo ogni fix sostanziale rilancia i check pertinenti (`./luxury-backend-maintenance.sh --smells`, test mirati, `./mvnw test` se serve);
3. lascia nel report finale solo i problemi residui che sono:
   - distruttivi o rischiosi;
   - dipendenti da segreti/ambiente esterno;
   - bloccati da decisioni prodotto o dati reali.

### 2. Blast radius obbligatorio (CodeGraph)

Esplora **ciascuno** di questi simboli e annota callers + test correlati:

| Simbolo | Perché |
|---------|--------|
| `StudioGroupOwnerResolver` | tenant titolare |
| `SalonLocationAccessService` | staff + `X-Location-Id` |
| `AppointmentBookingService` | prenotazioni |
| `AvailabilityService` | slot / overlap |
| `SalonPremiumEntitlementService` | gate PREMIUM |
| `StripeWebhookProcessor` | billing lifecycle |
| `SalonSubscriptionLifecycleService` | disdetta / piano |
| `SalonLuxuryChatService` | chat + read state |
| `MeSalonNotificationInboxService` | inbox titolare |
| `AppointmentNotificationService` | canali notifica |
| `ConsumerB2CEligibility` | gate B2C |
| `SecurityConfiguration` | permitAll / ruoli |
| `GlobalExceptionHandler` | errori API |
| `LuxuryUserPrincipal` | claim JWT |

Per ciascuno: se CodeGraph segnala «no covering tests», marca **WARN** e verifica se esiste coverage indiretta via controller test.

### 3. Package-by-package

Segui **tutta** [CHECKLIST.md](CHECKLIST.md). Per ogni package:

1. Elenca controller/service/entity presenti
2. `codegraph explore` sul service più centrale
3. Verifica: `@PreAuthorize` / `SecurityConfiguration`, tenant isolation, `BusinessException` vs `ResponseStatusException`, `@Transactional` sul service (non sul controller), entitlement Premium dove serve
4. Segna PASS / WARN / FAIL

### 4. Controlli trasversali (ogni virgola)

| Check | Criterio FAIL |
|-------|----------------|
| Eccezioni | Nuovo `ResponseStatusException` fuori da legacy già noto |
| Tenant | Accesso cross-studio senza `StudioGroupOwnerResolver` / `SalonLocationAccessService` |
| Premium | Feature Premium senza `SalonPremiumEntitlementService.hasActivePremium` |
| Staff sede | Endpoint catalogo/clienti senza `X-Location-Id` |
| Chat | Confusione `salonClientId` ↔ `locationId`; unicità read state solo su `salon_client_id` |
| Booking | Bypass `assertNoOverlap` / `WorkSchedule` |
| Billing | Modifica webhook/lifecycle senza blast radius CodeGraph |
| Secrets | Secret hardcoded non-dev in `src/main` |
| Job | `@Scheduled` senza guard su config disabilitata / cron |
| Schema | Entity/campo senza SQL in `luxury/deploy/sql/` o runner bootstrap |

### 5. Report finale (template obbligatorio)

```markdown
# Manutenzione backend — report

**Data:** YYYY-MM-DD
**CodeGraph:** files / nodes / edges (da `codegraph status`)
**Script:** PASS | FAIL (N fail, M warn)

## Executive summary
1–3 frasi: stato complessivo + rischio principale.

## FAIL (da correggere)
- [package/class] — problema — evidence (file:line o CodeGraph)

## WARN (debito)
- …

## PASS per package
| Package | Esito | Note |
|---------|-------|------|
| security | PASS/WARN/FAIL | … |
| … | … | … |

## Blast radius revisito
| Simbolo | Callers | Test | Note |
|---------|---------|------|------|

## Azioni consigliate (ordinate)
1. …
```

## Cosa non fare

- Non fermarti allo script senza CodeGraph package-by-package
- Non espandere a frontend/Flutter salvo dipendenze API necessarie al finding
- Non fare commit automatici, ma **sì** a fix automatici locali e sicuri durante la manutenzione
- Non modificare `StripeWebhookProcessor` / lifecycle senza aver documentato blast radius

## Risorse

- Checklist dettagliata: [CHECKLIST.md](CHECKLIST.md)
- Script: `./luxury-backend-maintenance.sh`
- Convenzioni: `.cursor/rules/luxury-project-master.mdc`
- Area rules: booking, chat, billing, staff, roles, super-admin
