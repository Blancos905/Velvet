# Luxury (Saloni Luxury) — contesto progetto

> Documento di riferimento per sviluppatori e assistenti AI (Cursor, Gemini, ecc.).
> Derivato dall'analisi CodeGraph del monorepo `my-salon-platform/`.
> Regola Cursor equivalente: `.cursor/rules/luxury-project-master.mdc`

---

## In una frase

**Luxury** è un gestionale SaaS **B2B2C** per saloni di bellezza: i titolari gestiscono sede, staff, clienti e appuntamenti; i consumatori cercano saloni, prenotano online e lasciano recensioni; l'area pubblica è ottimizzata per la **Local SEO**.

**Brand produzione:** Saloni Luxury — `saloniluxury.it`

---

## Documentazione — regola obbligatoria

### Prima di ogni modifica

1. **Consulta la documentazione** pertinente all'area che stai toccando:
   - questo file (`docs/LUXURY_PROJECT_MASTER.md`)
   - `.cursor/rules/*.mdc` — regole specializzate per area (booking, chat, billing, ruoli, staff, admin, audit)
   - `docs/GO_LIVE.md` e correlati — se impatti deploy, legali o store
   - CodeGraph (`codegraph_explore`) — per refactor o blast radius non ovvio
2. Non implementare su supposizioni se esiste già una regola o un flusso documentato che copre il caso.

### Dopo ogni modifica

**Aggiorna la documentazione** nello stesso task, non in un secondo momento:

| Cosa hai cambiato | Dove aggiornare |
|-------------------|-----------------|
| Flusso prodotto, API, ruoli, routing | `.cursor/rules/luxury-*.mdc` pertinente + questo file |
| Architettura o convenzioni trasversali | questo file + `.cursor/rules/luxury-project-master.mdc` |
| Go-live, legali, store | `docs/GO_LIVE*.md`, `docs/APP_STORE_REVIEW_NOTES.md` |
| Prodotto / feature in definizione (es. Nations Cup) | `docs/NATIONS_CUP.md` |
| Solo dettaglio implementativo minore | almeno un commento in codice se la logica non è autoesplicativa |

La documentazione deve restare **allineata al codice**: se il comportamento cambia, la doc cambia nello stesso commit/PR.

---

## Monorepo — cartelle reali

| Cartella | Ruolo | Stack |
|----------|-------|-------|
| `luxury/` | Backend API + SSR SEO | Java 21, Spring Boot 3, Spring Security 6, JPA, PostgreSQL/PostGIS, Redis |
| `luxury-frontend/` | UI web unica (pubblica + account + admin) | React 18, TypeScript, Vite, Tailwind, React Query, React Router 6 |
| `luxury-app/` | App iOS/Android | Flutter — WebView che carica `luxury-frontend` (zero logica duplicata) |
| `infrastructure/` | Produzione | Docker Compose, Nginx, PostGIS, Redis |
| `scripts/` · `docs/` | Dev, seed, go-live | Bash, Python |
| `devtools/codegraph/` | Indice strutturale | CodeGraph (704+ file Java/TS/Dart) |

> I nomi storici `backend/`, `frontend-web/`, `frontend-mobile/` nel README non sono più validi.

---

## Gerarchia dominio (backend)

```
StudioGroup (salone / titolare)
  └── Location (sede, slug pubblico /s/:slug)
        ├── SalonService (listino)
        ├── StaffOperator (operatore, collegato a ConsumerProfile opzionale)
        └── SalonClient (anagrafica cliente del salone)
              └── Appointment (location + service + operator + salonClient)
ConsumerProfile (utente JWT: auth_sub, security_roles, email)
```

### Correlazioni critiche

- **Titolare:** `studio_groups.owner_auth_sub` ↔ `consumer_profiles.auth_sub` via `StudioGroupOwnerResolver`
- **Staff:** `StaffOperatorRepository.resolveLinkedOperatorId(profileId, subject)`
- **Piano salone:** `studio_groups.plan_tier` → `BASE` (Free) | `PREMIUM` (legacy `STANDARD`/`FULL` → PREMIUM)

---

## Package backend (`it.luxury.*`)

| Package | Responsabilità |
|---------|----------------|
| `security/` | JWT HS256, login/register/refresh, `LuxuryUserPrincipal` |
| `consumer/` | Area `/api/v1/me/*` cliente, profilo, appuntamenti B2C, chat, export GDPR |
| `studio/` | `StudioGroup`, `Location`, agenda titolare, vetrina, `StudioGroupOwnerResolver` |
| `staff/` | API staff-sede (`X-Location-Id`), `SalonLocationAccessService`, `/me/staff/*` |
| `catalog/` | `SalonService`, `StaffOperator`, `SalonClient` |
| `appointment/` | Prenotazioni, `AvailabilityService`, `WorkSchedule`, stati `BOOKED`/`CONFIRMED`/`CANCELLED` |
| `notification/` | Inbox salone, FCM push, email HTML luxury, job schedulati |
| `billing/` | Stripe, `SalonPremiumEntitlementService`, FatturaPA, lifecycle disdetta |
| `publicapi/` | Ricerca geo, vetrina `/api/v1/public/organizations/{slug}/*`, SEO |
| `review/` | Recensioni salone/operatore/piattaforma |
| `admin/` | Super admin: overview, impersonazione, fatture fiscali |
| `legal/` | GDPR, export, eliminazione account |
| `integrations/` | Servizi esterni (Stripe webhook, ecc.) |
| `bootstrap/` | Demo data, super-admin setup |
| `common/` | `BusinessException`, utility condivise |

**Main class:** `it.luxury.LuxuryApplication` — `@EnableScheduling`, `@EnableAsync`.

---

## Autenticazione e ruoli JWT

Claim JWT: `sub` = `consumer_profiles.auth_sub`, `uid` = profile id, ruoli in claim custom.

| Ruolo JWT | Authority Spring | Chi è |
|-----------|------------------|-------|
| `CLIENT` | `ROLE_CLIENT` | Consumatore B2C (default se assente) |
| `OWNER` | `ROLE_OWNER` | Titolare salone |
| `STAFF` | `ROLE_STAFF` | Operatore collegato a `StaffOperator` |
| `ADMIN` | `ROLE_ADMIN` | Super admin Luxury |

- Un utente può avere **più ruoli**; frontend: `isSalonStaff = STAFF && !OWNER`
- Token in `sessionStorage` (`LuxuryAuthProvider`); admin separato in `luxury_super_admin_access_token`
- Login web: opzione «Ricorda email» (`luxury.savedLoginEmail.v1` in `localStorage`) — **mai password**
- Login app nativa: opzione «Salva credenziali» (`luxury.nativeSavedLogin.v1` in `localStorage` WebView) — email + password sul dispositivo
- Refresh rotation su Redis; cookie httpOnly per refresh
- Gate B2C: `ConsumerB2CEligibility.assertMayActAsConsumer` — titolare/staff **non** prenotano online

---

## Namespace API backend

| Area | Base path | `@PreAuthorize` tipico |
|------|-----------|------------------------|
| Pubblico | `/api/v1/public/**` | nessuna |
| Auth | `/api/v1/auth/**` | pubblico |
| Cliente B2C | `/api/v1/me/appointments`, `/me/salon-clients`, `/me/profile` | `ROLE_CLIENT` |
| Chat B2C Premium | `/api/v1/me/salon-clients/chat/**` | `isAuthenticated()` |
| Titolare | `/api/v1/me/salon/**` | `ROLE_OWNER` |
| Staff app | `/api/v1/me/staff/**` | `ROLE_STAFF` |
| Staff sede (header) | `/api/v1/clients`, `/services`, `/operators` | autenticato + **`X-Location-Id`** |
| Billing titolare | `/api/v1/me/billing/**` | `ROLE_OWNER` |
| Super admin | `/api/v1/admin/**` | `ROLE_ADMIN` |

Prima di aggiungere endpoint: verifica ruolo minimo, se serve `X-Location-Id`, e se il titolare si risolve via `StudioGroupOwnerResolver`.

---

## Routing frontend

File: `luxury-frontend/src/App.tsx`

| Ruolo | Home account | Pannello admin |
|-------|--------------|----------------|
| Super admin | redirect → `/admin/dashboard` | `/admin/*` |
| Staff | `/account/staff` | — |
| Titolare | `/account/salone` | — |
| Cliente | `/account/prenotazioni` | — |

Hub masthead «Ciao [nome]»: da `displayName` di `GET /api/v1/me/profile` (prefetch al login). Il nome commerciale del salone è sotto «Il tuo salone» da `GET /me/salon`. In **app** titolare Free su `/account/salone`: solo hub (Ciao + bottoni), senza box panoramica/upgrade (visibili sul web).

### Route pubbliche chiave

`/`, `/search`, `/s/:slug`, `/s/:slug/esplora`, `/piani`, `/partner`, `/registrati`

**Registrazione Free (`/piani`):** dopo submit → «Controlla email» → box «Email confermata» (celebration obbligatorio) → box ringraziamento → Continua → `/account/salone`. Con Stripe abilitato in piattaforma non trattare la conferma Free come «Premium pagato» (`premiumCheckoutRequired` non implica piano Premium). Flag sessione `luxury_salon_reg_post_signup_active` evita redirect hub a metà flow.

**Upgrade Free → Premium:** form `/piani?plan=PREMIUM` precompilato da `GET /me/salon` (indirizzo, **provincia** `locations.province` / `primaryLocationProvince`, tipologie `HAIR`/`BEAUTY`/`MASSAGE`, pubblico) + profilo.

### Route account

`/account/chat`, `/account/profilo`, `/account/prenotazioni`, `/account/salone/*`, `/account/billing/*`, `/account/info-privacy`

**Info e privacy (`/account/info-privacy`):** contenuto per ruolo — cliente B2C; titolare **Free** (`SalonFreeOwnerInfoPrivacyContent`, perimetro BASE senza Stripe); titolare **Premium**; operatore staff. Testo legalmente vincolante resta su `/privacy*` e `/termini`.

### Struttura `luxury-frontend/src/`

| Cartella | Contenuto |
|----------|-----------|
| `api/` | Client HTTP, tipi, sessione |
| `auth/` | `LuxuryAuthProvider` |
| `components/` | UI condivisa, modali, popup notifiche |
| `hooks/` | React hooks (booking alerts, piano, FCM, ecc.) |
| `lib/` | Helper condivisi (ruoli, notifiche, booking B2C) |
| `pages/` | Pagine route (account, admin, legal, dev) |
| `routes/` | Lazy loading (`lazyPages.ts`) |
| `styles/` | CSS luxury (`luxury-*.css`) |

---

## App Flutter (`luxury-app/`)

| File / area | Ruolo |
|-------------|-------|
| `lib/main.dart` | Entry → `FreeAccountWrapper` |
| `lib/shell/luxury_web_shell.dart` | Shell WebView |
| `lib/security/luxury_domain_guard.dart` | Domini navigazione consentiti |
| `lib/shell/luxury_paywall_overlay.dart` | Overlay informativo piano Free (senza prezzi/CTA acquisto — Apple 3.1.1) |
| `assets/luxury_subscription_guards.json` | Vincoli piano Free |
| `lib/push/luxury_fcm_service.dart` | Push FCM |
| `lib/*_web_bridge.dart` | Bridge JS ↔ Dart |

**Regola:** non duplicare logica UI — tutto passa dal frontend web.

---

## Piani e billing

- DB: `plan_tier` = `BASE` | `PREMIUM`
- Entitlement: `SalonPremiumEntitlementService.hasActivePremium` (DB + Stripe se configurato)
- Premium abilita: SEO pubblico, statistiche PIN, chat B2C, ricerca geo avanzata
- Non gateare Premium solo frontend — sempre verifica backend
- Webhook Stripe → `StripeWebhookProcessor` → `SalonSubscriptionLifecycleService` (blast radius alto)
- Disdetta: job `CancelledSalonSubscriptionExpiryJob` (default 30 giorni post-scadenza)

---

## Prenotazioni — regole prodotto essenziali

| Stato | Significato |
|-------|-------------|
| `BOOKED` | Richiesta cliente — **in attesa conferma** operatore/salone |
| `CONFIRMED` | Accettata o walk-in titolare |
| `CANCELLED` | Annullata/rifiutata |

### Chi può confermare

| Attore | API |
|--------|-----|
| Titolare | `POST /api/v1/me/salon/appointments/{id}/confirm\|reject` |
| Operatore | `POST /api/v1/me/staff/appointments/{id}/confirm\|reject` |

### Canali notifica (regola prodotto — non invertire)

| Canale | Titolare (`OWNER`) | Operatore (`STAFF && !OWNER`) |
|--------|--------------------|-------------------------------|
| Inbox API | Tutto lo studio, copy informativa | Solo propri appuntamenti ancora in attesa; dopo Accetta/Rifiuta la richiesta sparisce dall'inbox operatore |
| Popup in-app urgente | **Mai** auto-aperto | Sì — Accetta/Rifiuta o urgente informativo |
| Suono insistente | **Mai** | Solo se `canRespond` o `urgent` |

Dettaglio completo: `.cursor/rules/luxury-booking-appointments.mdc`

---

## Chat luxury (Premium)

- Feature Premium (`SalonPremiumEntitlementService.hasActivePremium`)
- Thread separati: salone generale (`staffOperatorId=null`) vs operatore (`staffOperatorId=UUID`)
- Titolare: sempre thread salone, mai `staffOperatorId` in API
- Staff: sempre il proprio operatore
- API base: `/api/v1/me/salon-clients/chat/*` — usa `salonClientId`, **non** `locationId`/`organizationId`
- DB: `salon_luxury_chat_read_state` — unicità per thread, non per solo `salon_client_id`

Dettaglio: `.cursor/rules/luxury-chat.mdc`

---

## SEO

- `/s/:slug` (SPA React) + backend SSR head per crawler (`/saloni/{slug}`)
- JSON-LD `HairSalon`/`BeautySalon` iniettato server-side (Google legge senza JS)
- `/sitemap.xml` dinamica (un'entry per salone attivo)
- `/robots.txt` punta alla sitemap, blocca `/api/`
- Saloni Premium in evidenza ricerca (`topRated`, geo PostGIS)

---

## Sviluppo locale

Tre terminali (ordine consigliato):

```bash
./scripts/dev-backend.sh      # Spring Boot → http://127.0.0.1:8080
./scripts/dev-frontend.sh     # Vite → http://127.0.0.1:5173 (proxy /api → 8080)
./scripts/dev-app-ios.sh      # oppure ./scripts/dev-app-android.sh
```

Verifica rapida:

```bash
curl -sf http://127.0.0.1:8080/api/v1/public/health
curl -sf http://127.0.0.1:5173/
```

Test completi:

```bash
cd luxury && ./mvnw test
./check-all.sh
./luxury-audit.sh
```

---

## Convenzioni codice

### Backend (Java)

- Eccezioni business: `BusinessException(HttpStatus, code, message)`
- Servizi cross-tenant: `StudioGroupOwnerResolver` / `SalonLocationAccessService`
- Transazioni: `@Transactional` su service, non controller
- Test: `luxury/src/test/java/it/luxury/**` — preferire test controller per nuove API
- SQL migration: `luxury/deploy/sql/` + runner allineamento schema

### Frontend (React/TS)

- Ruoli: `useLuxuryAuth()` — non parsare JWT fuori da `LuxuryAuthProvider`
- Fetch: `apiJson()` con `accessToken`; React Query key `["me", ...]`
- Modali conferma: `BookingActionConfirmModal` — **mai `window.confirm`** in area account/WebView
- Helper condivisi in `src/lib/`
- Stili: `src/styles/luxury-*.css`

### Flutter

- Bridge JS: `*_web_bridge.dart`
- Piano Free: `luxury_free_plan_policy.dart` + `luxury_subscription_guards.json`

### Generale

- **Consulta la doc prima** — vedi sezione «Documentazione — regola obbligatoria»
- **Aggiorna la doc dopo** — ogni modifica che cambia comportamento, API o flussi
- Minimizza scope — diff focalizzato
- Riusa convenzioni esistenti
- Backend = fonte di verità per permessi, piani, stati business
- Non committare segreti (`.env`, credenziali, `key.properties`)

---

## CodeGraph

Indice in `.codegraph/` (Java, TS/TSX, Dart). Usare **prima** di refactor trasversali.

```bash
# CLI dalla root del repo
devtools/codegraph/node_modules/.bin/codegraph explore "NomeClasse"
devtools/codegraph/node_modules/.bin/codegraph sync
devtools/codegraph/node_modules/.bin/codegraph status
```

In Cursor: MCP `codegraph_explore` con query mirata → verificare callers, blast radius, test.

### Simboli ad alto blast radius

`Appointment`, `StaffOperator`, `SalonService`, `StudioGroupOwnerResolver`, `StripeWebhookProcessor`, `SalonLuxuryChatService`, `MeSalonNotificationInboxService`

---

## Regole Cursor specializzate

| File | Quando consultare |
|------|-------------------|
| `.cursor/rules/luxury-project-master.mdc` | Contesto totale (always apply) |
| `.cursor/rules/luxury-roles-routing.mdc` | Ruoli JWT, routing account, namespace API |
| `.cursor/rules/luxury-booking-appointments.mdc` | Stati appuntamento, notifiche, popup operatore |
| `.cursor/rules/luxury-consumer-booking.mdc` | Prenotazione B2C vs agenda salone |
| `.cursor/rules/luxury-salon-plans-billing.mdc` | BASE/PREMIUM, Stripe, FatturaPA |
| `.cursor/rules/luxury-chat.mdc` | Thread chat, read state DB |
| `.cursor/rules/luxury-staff-location-access.mdc` | `X-Location-Id`, catalogo filtrato |
| `.cursor/rules/luxury-super-admin.mdc` | Pannello admin, impersonazione |
| `.cursor/rules/luxury-audit.mdc` | Audit pre-release, go-live, store |
| `.cursor/rules/luxury-backend-maintenance.mdc` | Manutenzione backend (frase: «manutenzione backend») |
| `.cursor/rules/luxury-frontend-maintenance.mdc` | Manutenzione frontend (frase: «manutenzione frontend») |
| `.cursor/rules/luxury-app-maintenance.mdc` | Manutenzione app Flutter (frase: «manutenzione app») |
| `.cursor/rules/luxury-database-maintenance.mdc` | Manutenzione database/infrastruttura (frase: «manutenzione database») |
| `.cursor/rules/codegraph.mdc` | Uso CodeGraph MCP/CLI |
| `.cursor/skills/manutenzione-backend/` | Skill + checklist CodeGraph package-by-package |
| `.cursor/skills/manutenzione-frontend/` | Skill + checklist CodeGraph area-by-area |
| `.cursor/skills/manutenzione-app/` | Skill + checklist CodeGraph modulo-by-modulo (Flutter shell) |
| `.cursor/skills/manutenzione-database/` | Skill + checklist Compose/Nginx/Postgres/Redis/backup |

---

## Audit e go-live

```bash
./luxury-audit.sh                    # statici + test + flussi + store compliance
./luxury-backend-maintenance.sh      # manutenzione backend Java (inventario, smell, CodeGraph, mvn test)
./luxury-frontend-maintenance.sh     # manutenzione frontend React/TS (inventario, smell, CodeGraph, vitest/tsc)
./luxury-app-maintenance.sh          # manutenzione app Flutter (inventario, smell, CodeGraph, analyze/test)
./luxury-database-maintenance.sh     # manutenzione infra/Docker/Postgres/Redis (hardening, backup, restore)
./go-live-check.sh                   # placeholder legali, segreti, checklist
./go-live-status.sh                  # stato avanzamento
```

In Cursor:
- **manutenzione backend** → script + checklist CodeGraph su ogni package `it.luxury.*` + correzioni automatiche compatibili + rilancio check
- **manutenzione frontend** → script + checklist CodeGraph su ogni area di `luxury-frontend/src` + correzioni automatiche compatibili + rilancio check
- **manutenzione app** → script + checklist CodeGraph su ogni modulo di `luxury-app/lib` (shell WebView, zero UI duplicata) + correzioni automatiche compatibili + rilancio check
- **manutenzione database** → script + checklist su `infrastructure/`, Docker, SQL manuali e backup ricorrenti + correzioni automatiche compatibili + rilancio check

Documentazione correlata:

- `docs/NATIONS_CUP.md` — Coppa nazionale saloni (bozza prodotto, home `/nations-cup`)
- `docs/GO_LIVE.md`
- `docs/GO_LIVE_LEGALE_SENZA_STRIPE.md`
- `docs/INFRSTRUTTURA_PRODUZIONE_CHECKLIST_GO_LIVE.md`
- `docs/APP_STORE_REVIEW_NOTES.md`

---

## Errori frequenti da evitare

1. Dare al titolare popup Accetta/Rifiuta o suono operatore
2. Permettere prenotazione online B2C a titolare/staff
3. Gate Premium solo frontend senza `hasActivePremium` backend
4. Confondere `salonClientId` con `locationId` in chat/anagrafica
5. Reintrodurre unicità `salon_client_id` su read state chat
6. Usare solo `ROLE_STAFF` senza verificare sede (`X-Location-Id`)
7. Duplicare logica ruolo nel frontend invece di estendere helper/servizi esistenti
8. Bypassare `assertNoOverlap` / `WorkSchedule` in availability
9. Duplicare UI/logica nell'app Flutter invece del frontend web
10. Modificare `StripeWebhookProcessor` senza verificare blast radius con CodeGraph

---

*Ultimo aggiornamento: analisi CodeGraph monorepo Luxury — luglio 2026*
