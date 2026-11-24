---
name: manutenzione-frontend
description: >-
  Esegue la manutenzione completa del frontend Luxury (React/TS in
  luxury-frontend/): inventario CodeGraph, routing, auth/ruoli, API client,
  account (cliente/titolare/staff), chat, booking popup, billing Premium, admin,
  smell e gap di test. Usa quando l'utente dice «manutenzione frontend»,
  «manutenzione FE», «frontend maintenance», «controllo frontend»,
  «revisione frontend» o «scan frontend».
---

# Manutenzione frontend Luxury

## Trigger (verbatim)

Attiva questo workflow quando l'utente dice: **manutenzione frontend**

Sinonimi ammessi: manutenzione FE, frontend maintenance, controllo frontend, revisione frontend, scan frontend.

## Obiettivo

Controllare il frontend **in profondità** (ogni area di `luxury-frontend/src`, ogni route account/pubblica critica) usando CodeGraph + script automatico + checklist, e **correggere automaticamente** tutto ciò che è sicuro, locale e non distruttivo. Non limitarsi a `tsc` / vitest.

## Inventario di riferimento (baseline)

| Stereotipo | ~Count | Path tipico |
|------------|--------|-------------|
| File TS/TSX | 346 | `luxury-frontend/src/**` |
| TSX | 177 | pages/components |
| TS | 169 | api/lib/hooks |
| Test Vitest | 12 | `*.test.ts(x)` |
| Moduli API | ~17 | `src/api/` |
| Hook | ~30 | `src/hooks/` + auth hooks |
| CSS luxury | 100+ | `src/styles/` |

Aree top-level: `api`, `auth`, `components`, `config`, `content`, `context`, `data`, `hooks`, `layout`, `lib`, `pages` (account/admin/legal/dev), `providers`, `routes`, `styles`, `utils`.

## Workflow obbligatorio

```
Manutenzione frontend — progress:
- [ ] 0. Sync CodeGraph
- [ ] 1. Script ./luxury-frontend-maintenance.sh
- [ ] 2. CodeGraph blast radius (simboli critici)
- [ ] 3. Checklist area-by-area (CHECKLIST.md)
- [ ] 4. Gap test / smell / ruoli / Premium UX
- [ ] 5. Report finale
```

### 0. Sync CodeGraph

```bash
devtools/codegraph/node_modules/.bin/codegraph sync
devtools/codegraph/node_modules/.bin/codegraph status
```

Preferisci MCP `codegraph_explore`; altrimenti CLI `codegraph explore "NomeSimbolo"`.

### 1. Script automatico

```bash
./luxury-frontend-maintenance.sh
# varianti: --fast (no vitest/tsc) · --smells · --codegraph · --test · --help
```

### 1-bis. Correzioni automatiche obbligatorie

Quando l'utente invoca **manutenzione frontend**, non fermarti al report:

1. correggi automaticamente smell, route wiring, helper, piccoli bug UX, test e documentazione locale che puoi sistemare in sicurezza;
2. dopo ogni fix sostanziale rilancia i check pertinenti (`./luxury-frontend-maintenance.sh --smells`, vitest, `tsc -b`);
3. lascia nel report finale solo i problemi residui che richiedono ambiente esterno, decisioni prodotto o hanno blast radius troppo alto per un fix automatico prudente.

### 2. Blast radius obbligatorio (CodeGraph)

Esplora **ciascuno** e annota callers + test:

| Simbolo | Perché |
|---------|--------|
| `LuxuryAuthProvider` | sessione JWT, ruoli, token `sessionStorage` |
| `useLuxuryAuth` | fonte unica ruoli FE (~73 file) |
| `parseLuxurySecurityRoles` | normalizzazione ruoli |
| `apiJson` / `apiFetch` | **129+ callers** — client HTTP |
| `ProtectedRoute` / `AdminProtectedRoute` | gate account / admin |
| `App` / `lazyPages` | routing completo |
| `BookingActionConfirmModal` | modali branded (no `window.confirm`) |
| `useSalonBookingRequestAlerts` | popup Accetta/Rifiuta **solo staff** |
| `luxuryNotificationPopup` | canali OWNER vs STAFF |
| `SalonLuxuryChatPage` / `salonLuxuryChatThreads` | chat Premium |
| `useEffectiveSalonPlanTier` | piano salone UX (~25 callers) |
| `subscription-guards` | allineamento Free/Premium (anche app) |
| `luxuryConsumerBooking` | gate B2C (no book titolare/staff) |
| `nativeAccountHubPaths` | hub app WebView |

### 3. Area-by-area

Segui **tutta** [CHECKLIST.md](CHECKLIST.md). Per ogni area:

1. Inventario file chiave
2. `codegraph explore` sul simbolo centrale
3. Verifica: ruoli via `useLuxuryAuth` (non JWT sparso), `apiJson` + React Query `["me", ...]`, modali branded, Premium solo UX (backend = truth), routing home per ruolo, chat `salonClientId`, popup solo staff
4. Segna PASS / WARN / FAIL

### 4. Controlli trasversali (ogni virgola)

| Check | Criterio FAIL |
|-------|----------------|
| Ruoli | Parsing JWT fuori da `LuxuryAuthProvider` / helper `lib/*` documentati |
| Staff vs Owner | Popup Accetta/Rifiuta o suono operatore al titolare |
| B2C | Prenotazione online consentita a titolare/staff in UI |
| Premium | Feature gated **solo** FE senza chiamata/entitlement backend |
| Confirm | Nuovo `window.confirm` in area account (usa `BookingActionConfirmModal` o modale branded) |
| Chat | Confusione `salonClientId` ↔ `locationId` / `organizationId` |
| API | Fetch raw `fetch()` verso `/api` bypassando `apiJson`/`apiFetch` senza motivo |
| Admin | Super admin su `/account` non redirect/logout |
| Native | Path hub/overlay non allineati a `nativeAccountHubPaths` |
| Lazy | Nuova page account non in `lazyPages.ts` / `App.tsx` |

### 5. Report finale (template)

```markdown
# Manutenzione frontend — report

**Data:** YYYY-MM-DD
**CodeGraph:** files / nodes (da status)
**Script:** PASS | FAIL (N fail, M warn)

## Executive summary
1–3 frasi.

## FAIL
- [area/file] — problema — evidence

## WARN
- …

## PASS per area
| Area | Esito | Note |
|------|-------|------|
| auth | … | … |

## Blast radius revisito
| Simbolo | Callers | Test | Note |

## Azioni consigliate
1. …
```

## Cosa non fare

- Non fermarti allo script senza checklist CodeGraph
- Non espandere a backend Java salvo contratto API del finding
- Non duplicare logica in Flutter — il FE è fonte UI
- Non fare commit automatici, ma **sì** a fix automatici locali e sicuri durante la manutenzione

## Risorse

- Checklist: [CHECKLIST.md](CHECKLIST.md)
- Script: `./luxury-frontend-maintenance.sh`
- Routing/ruoli: `.cursor/rules/luxury-roles-routing.mdc`
- Booking/popup: `.cursor/rules/luxury-booking-appointments.mdc`
- Chat: `.cursor/rules/luxury-luxury-chat.mdc` (o `luxury-chat`)
- Billing/piani: `.cursor/rules/luxury-salon-plans-billing.mdc`
