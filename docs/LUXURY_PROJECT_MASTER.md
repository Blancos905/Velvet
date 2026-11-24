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
- **Piano salone:** unico piano commerciale `PREMIUM`. `plan_tier=BASE` è lo stato tecnico «non entitled» (downgrade Stripe e righe già in DB), non un piano vendibile. Legacy `STANDARD`/`FULL` → PREMIUM.

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

### Email transazionali SMTP (`noreply@`)

Guscio unico `LuxuryEmailHtml` (logo inline). Catalogo completo in `LocalDevEmailPreviewService` (~26 anteprime uniche). Tipi principali:

| Famiglia | Esempi | Trigger |
|----------|--------|---------|
| Auth | verifica email, reset password, benvenuto, password cambiata, account eliminato, **nuovo dispositivo** | registrazione / profilo / login password / `DELETE /me/account` |
| Staff | invito accesso (senza password in chiaro) | creazione membro da titolare |
| Booking | conferma, update, cancel, reject, promemoria 24h/2h, invito recensione | `AppointmentNotificationService` + coda |
| Billing | thank-you (trial da checkout €0; pagamento solo da `invoice.paid`), **ricevuta PDF titolare**, payment failed, rinnovo, disdetta, avviso cancellazione | Stripe webhook + job `SalonBillingLifecycleEmailJob` |
| Chat | nuovo messaggio | `SalonLuxuryChatEmailDispatchService` |
| Assistenza | richiesta form area account → `assistenza@` (Reply-To = utente) | `MeSupportService` / `SupportRequestEmailDispatchService` |
| Fiscale | FatturaPA XML → **solo admin** (non al titolare) | `FatturaPaAdminNotificationService` |

Sicurezza login: fingerprint User-Agent in `login_device_fingerprints`; al primo dispositivo noto non si invia email; ai successivi sconosciuti sì (`LoginDeviceAlertService`). Ricevuta PDF = quietanza commerciale Premium al titolare; FatturaPA resta canale admin/SDI.

Anteprima locale: `POST /api/v1/dev/email/send-all-samples?to=…` (profilo `local`) o `SendAllLuxuryEmailsManualTest`.

| `billing/` | Stripe, `SalonPremiumEntitlementService`, FatturaPA, lifecycle disdetta |
| `publicapi/` | Ricerca geo, vetrina `/api/v1/public/organizations/{slug}/*`, SEO |
| `review/` | Recensioni salone/operatore/piattaforma — cancellazione: `DELETE /api/v1/me/reviews/{id}` (cliente) e `DELETE /api/v1/me/salon/reviews/{id}` (titolare studio / staff solo proprie), UI in `/account/feedback-luxury` con conferma; notifica `REVIEW_INVITE` → CTA «Vai a recensioni» (`/account/feedback-luxury?invite=`) |
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
- **Scadenza sessione:** logout automatico **24 ore dal login** (`luxury.security.session-max-hours=24`, marker frontend `luxury_session_started_at`); nessun messaggio di sistema dedicato
- Refresh rotation su Redis; cookie httpOnly per refresh. Sul web il rinnovo usa solo quel cookie: il refresh non viene scritto in `sessionStorage`.
- Il poll di conferma email (`POST /api/v1/auth/email-verification/poll`) emette una sessione solo con il segreto creato alla registrazione e tenuto dal client. Email e timestamp non bastano.
- Cambio email: password attuale obbligatoria; la nuova email resta non verificata finché il link non è confermato; la vecchia riceve un avviso.
- Cambio password, reset password e cancellazione account revocano i refresh del profilo. La cancellazione chiede la password attuale.
- `bootstrapSuperAdmin` su un'email normale non assegna `ADMIN` se un super admin esiste già. Nessuna email è esentata.
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
| Titolare | `/salone` (hub, solo le due card). I tasti, Panoramica compresa, aprono l’overlay centrato; checkout e successo Stripe restano pagina intera | — |
| Cliente | hub `/account`. Prenotazioni, chat, notifiche, profilo, saloni di fiducia, recensioni e le altre voci aprono l’overlay centrato come il menu salone; in app il foglio resta dal basso | — |

Cliente e ricerca: `/`, `/search`, `/account`. Admin salone: `/salone`. `/account/salone` e `/account/salone/*` reindirizzano a `/salone`. `/admin` è solo il super admin Luxury.

Tre origini, una app. Locale: clienti `http://127.0.0.1:8080`, pannello titolare e dipendente `http://127.0.0.1:8083`, super admin `http://127.0.0.1:8084`. Produzione: `https://www.saloniluxury.it`, `https://salone.saloniluxury.it`, `https://admin.saloniluxury.it`. Sulla home di ricerca l’accesso è solo del cliente. Il salone si registra da lì; a registrazione finita vede l’avviso. Salone, dipendente e super admin che entrano dalla home vedono lo stesso avviso, senza la home e senza il suono delle notifiche. «Vai al tuo profilo» apre il pannello in una finestra nuova, chiude l’avviso e lascia la home di ricerca. «Esci» su quell’avviso chiude la sessione e resta sulla home di ricerca. Dal pannello, «Esci» torna al login di quel pannello e non alla home di ricerca. Il cliente, o un ospite, che apre un indirizzo del salone, del dipendente o del super admin dalla home di ricerca torna alla home. Su `8083` e `8084` non c’è la home di ricerca: niente header del sito clienti, si vede solo il login e, dopo l’accesso, l’area. L’app nativa resta una sola WebView e non cambia origine.

Hub masthead «Ciao [nome]»: da `displayName` di `GET /api/v1/me/profile` (prefetch al login). Il nome commerciale del salone è sotto «Il tuo salone» da `GET /me/salon`. Un titolare il cui studio è ancora `plan_tier=BASE` vede su `/salone` il percorso per attivare Premium. Il cliente imposta l’immagine profilo da `/account/profilo` (`PATCH /api/v1/me/profile/photo`), nel pannello web e nell’app: zoom e posizione prima del salvataggio. Sul hub l’immagine sta a destra del nome.

**Header sponsor (web):** carousel nell’area centrale di `AppHeader` (`HeaderSponsorRotator`): label «In collaborazione», un marchio alla volta destra→sinistra, click → sito sponsor. **Punto di inserimento marchi reali:** `luxury-frontend/src/data/headerSponsors.ts` (`HEADER_SPONSORS_LIVE` + flag `HEADER_SPONSOR_DEMO_PLACEHOLDERS`) e asset in `luxury-frontend/public/sponsors/` (vedi README lì). Oggi demo placeholders; quando arrivano i reali si sostituisce l’elenco e si spegne il flag. Visibile da ≥900px; nascosto su mobile e app nativa.

**Popup / ads cliente:** modal post-login (solo dopo login, non a ogni refresh). **Inserzioni soft** (card/strip chiudibili, max 1×/giorno): `client_profile` in `ProfilePage` (`/account/profilo`, variante grande), `client_bookings` in fondo `AppointmentsPage`, `client_home` in fondo hub consumer. Componente `AdSoftPlacement`; campagne in `data/adPopups.ts`.

### Route pubbliche chiave

`/`, `/search`, `/s/:slug`, `/s/:slug/esplora`, `/saloni/sponsorizzati`, `/piani`, `/partner`, `/registrati`, `/licenza`

**Salone multisede:** `GET /api/v1/public/organizations/{slug}` include `siblingLocations`, le altre sedi Premium dello stesso studio (esclusa quella aperta). Vale per ogni salone con 2 o più sedi. Sulla vetrina `/s/:slug`, se l’elenco non è vuoto, il tasto «Cambia sede» sta in alto a sinistra e apre una card per ogni altra sede; il tap va al profilo `/s/{slug}` scelto. Una sede sola non mostra il tasto.

**Pubblicazione vetrina:** le sedi nuove hanno `visible_to_clients = false`. Il titolare guarda l’anteprima in `/salone/anteprima` (scheda intera: vetrina, servizi, esplora, recensioni, mappa e contatti) e, dal profilo o da quella pagina, accende «Abilita visualizzazione agli utenti». Fino a quel momento ricerca, sitemap, SEO e il link pubblico non mostrano il salone. I saloni già pubblicati restano visibili. Lo switch vale per tutte le sedi dello studio.

**Home (`/`):** geolocalizzazione (pulsante CAP) e «Oppure un tocco» sono usabili **senza login** (ospite) e con qualsiasi account loggato (cliente, titolare, staff). In **app nativa** su HTTP LAN (`http://192.168.x.x:5173`) la geo non passa da `isSecureContext` del browser: il bridge Flutter (`LuxuryGeolocationWebBridge`) espone la posizione dispositivo; il gate in `geolocationRequest.ts` salta il blocco HTTPS se `SaloniLuxuryApp` / bridge installato. Da **PC** (browser desktop) la stessa azione non chiede il GPS, che il computer non ha: usa la posizione di rete del sistema (`enableHighAccuracy: false`). Se la pagina è aperta in HTTP da un altro computer (`http://192.168.x.x`), il browser blocca l’API di geolocalizzazione: il click chiama `GET /api/v1/public/locate-by-network` (posizione approssimata dell’IP pubblico della connessione, servizio ipwho.is), solo dopo il tocco esplicito. Il permesso negato non attiva questo ripiego. Il filtro «Affina la zona → Nazioni» elenca un **set essenziale** (~15 paesi: Italia/area immediata, Europa occidentale, US/CA/BR/AU/AE) — vedi `searchCountryCodes.ts`; non l’intero ISO. Mostra la bandiera del paese; selezionare una nazione imposta anche la **lingua UI** (`LuxuryLocaleProvider`: IT/EN/FR/DE/ES/PT via `localeFromCountryCode`, persistita in `localStorage`). Tradotti con la lingua: form ricerca, **carousel hero** (overlay + alt immagini), card **trending** (titolo/alt), pannello **Oppure un tocco**, Nations Cup, top operatori, saloni sponsorizzati, strip partner (`i18n/messages/homeExtended/*`, `homeTrendTranslations`, `homeQuickTranslations`). **Area account** (hub, nav, home cliente/staff, elenco prenotazioni): catalogo `i18n/messages/account/*`. Con login la lingua è **bloccata** su `consumer_profiles.preferred_locale` (impostato in registrazione da paese scelto su `/registrati` o `/piani`; sync via `ProfileLocaleSync` + `GET/PATCH /me/profile`). CAP/postcode e suggerimenti città via Nominatim per qualsiasi paese ISO lato backend; catalogo locale completo solo per l’Italia. Fuori dall’Italia la risoluzione CAP richiede consenso mappe/geocodifica (oppure si digita il comune). Nomi paese nel menu: `Intl.DisplayNames` nella lingua attiva.

**Idee per la tua prossima visita:** le card di parrucchieri, estetisti e massaggi aprono `/idee/:gruppo/:idea`. In evidenza ci sono migliori operatori e saloni sponsorizzati. Finché le schede non arrivano si vede il pannello di attesa, non i riquadri vuoti. Indietro torna alla home nel punto lasciato, senza risalire in cima.

**Saloni sponsorizzati:** in home, nella fascia «In evidenza», la card accanto a «Migliori operatori» si chiama «Saloni sponsorizzati» e apre `/saloni/sponsorizzati`. Non è una classifica: la sede compare perché ha `locations.sponsored_placement = true`, è visibile ai clienti e ha il Premium attivo. Il super admin accende o spegne il flag su tutte le sedi dello studio dal pannello (`PATCH /api/v1/admin/overview/salons/{id}/sponsored-placement`). Elenco pubblico: `GET /api/v1/public/organizations/sponsored`. Su ogni scheda c’è l’etichetta «Sponsorizzato».

**«Oppure un tocco»:** all’apertura richiede la posizione (in app: bridge nativo + attesa `__luxuryNativeGeolocationInstalled`); `GET /api/v1/public/organizations/quick-suggest-availability` restituisce i tasti curati con match nel raggio e **tag dinamici** dai nomi servizi in listino di saloni Premium vicini non già coperti dai tasti curati (`SalonQuickSearchCatalogHints.isCoveredByCuratedQuickSuggest`). Max 30 extra; gruppo UI da tipologia sede (`parrucchieri` / `estetisti` / `massaggi-fisio` / `altri`). Senza geo riuscita non si mostrano i tag statici «finti»: solo messaggio + ripeti (stesso comportamento funzionale del web).

**Piano Plus (`/piani`):** card accanto a Premium. Stessi passi di registrazione (form, sedi, conferma email, prova 30 giorni, Stripe a fine prova). Prezzo fisso **60 € al mese**. Le sedi nascono con `sponsored_placement`: compaiono nei Saloni sponsorizzati quando sono visibili e l’abbonamento è attivo. Il listino per sede del Premium non cambia.

**Registrazione titolare (`/piani`):** un solo piano Premium nel ramo già esistente. Sotto il telefono il form chiede il **numero di sedi**. Il tasto «Conferma sedi per calcolare lo sconto» applica il numero, mostra il costo dopo la prova e i campi Sede 2, Sede 3, … (massimo 20). Dopo la conferma ogni sede (anche la Sede 1) ha il proprio nome, «Di che salone si tratta?» e «Per chi è il salone?». Il nome non viene copiato sulle altre sedi. Dopo i 30 giorni di prova il canone è **per sede**: 1 sede **40 €**, 2 sedi **35 €** a sede, da 3 sedi **30 €** a sede (totale = unitario × sedi). Con 1 sede l’addebito Stripe usa `STRIPE_PREMIUM_PRICE_ID` (40 €); da 2 sedi la Checkout usa lo stesso prodotto con importo unitario di fascia e quantity = sedi. Su `/partner` il tasto di avanzamento è «Procedi» verso `/piani`. Dopo submit → «Controlla email» → box «Email confermata» → `/salone` con i 30 giorni di prova già attivi. In header, in alto a destra, il cerchio dei giorni rimasti apre `/account/billing/checkout` con il modulo di fatturazione sullo sfondo e un popup con il logo Saloni Luxury; Prosegui chiude il popup e lascia compilare il form (poi Stripe). Se restano almeno 49 ore l’addebito parte a fine prova. Da 48 ore un popup chiede il rinnovo e nelle ultime 24 ore torna ogni 4 ore. Flag sessione `luxury_salon_reg_post_signup_active` evita redirect hub a metà flow. Un titolare già in DB con `plan_tier=BASE` usa lo stesso form `/piani?plan=PREMIUM`, precompilato da `GET /me/salon` (indirizzo, **provincia** `locations.province` / `primaryLocationProvince`, tipologie `HAIR`/`BEAUTY`/`MASSAGE`, pubblico) + profilo.

### Route account

`/account/chat`, `/account/profilo`, `/account/prenotazioni`, `/salone/*`, `/account/billing/*`, `/account/info-privacy`

**Info e privacy (`/account/info-privacy`):** contenuto per ruolo — cliente B2C, titolare (informativa Premium, anche prima dell’attivazione), operatore staff. Testo legalmente vincolante resta su `/privacy*` e `/termini`. **Licenza gratuita (`/licenza`):** uso senza canone di sito e app per i clienti. Non è il piano Premium dei titolari e non cede il codice sorgente.

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
| `lib/main.dart` | Entry → `FreeAccountWrapper` (shell di tutta l’app, tema Premium; non è un piano) |
| `lib/shell/luxury_web_shell.dart` | WebView, domain guard, tema Premium della shell |
| `lib/shell/luxury_shell_loading_overlay.dart` | Overlay caricamento: sfondo brand `#1C0A06` + logo grande (niente bianco) |
| Splash nativo Android/iOS | Sfondo `#1C0A06`; Android 12+ `Theme.SplashScreen` con `windowSplashScreenIconBackgroundColor` uguale allo sfondo (niente riquadro bianco) + logo circolare grande |
| `lib/security/luxury_domain_guard.dart` | Domini navigazione consentiti |
| `lib/push/luxury_fcm_service.dart` | Push FCM (token → bridge JS → `POST /api/v1/me/devices`) |
| Canale Android `luxury_alerts` | Creato in `MainActivity`; backend invia push con `AndroidConfig` su quel canale |
| `lib/*_web_bridge.dart` | Bridge JS ↔ Dart |

**Regola:** non duplicare logica UI — tutto passa dal frontend web.

---

## Piani e billing

- DB: `plan_tier` = `PREMIUM` (piano; dopo la prova 40 / 35 / 30 € a sede in base al numero di sedi) oppure `BASE` (non entitled, non vendibile)
- Entitlement: `SalonPremiumEntitlementService.hasActivePremium` — prova 30 giorni anche con Stripe acceso; dopo, abbonamento Stripe se configurato
- Premium abilita: SEO pubblico, statistiche PIN, chat B2C, ricerca geo avanzata, vetrina pubblica. La pubblicazione ai clienti richiede anche `visible_to_clients`, acceso dal titolare dopo l’anteprima.
- Le funzioni Premium si verificano con `hasActivePremium` sul backend
- Webhook Stripe → `StripeWebhookProcessor` → `SalonSubscriptionLifecycleService` (blast radius alto)
- Disdetta: job `CancelledSalonSubscriptionExpiryJob` (default 30 giorni post-scadenza)

---

## Prenotazioni — regole prodotto essenziali

Dopo una prenotazione (vetrina pubblica, resume post-login, o walk-in agenda titolare) gli slot pubblici (`queryKey ["org","availability", slug]`) vengono aggiornati subito in cache e invalidati: l’orario impegnato sparisce senza attendere un reload manuale. Il backend già esclude `BOOKED`/`CONFIRMED` da `AvailabilityService`.

| Stato | Significato |
|-------|-------------|
| `BOOKED` | Richiesta cliente — **in attesa conferma** operatore/salone |
| `CONFIRMED` | Accettata, auto-conferma (`require_booking_confirmation=false`) o walk-in titolare |
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
| Popup in-app urgente | **Mai** auto-aperto | Sì — Accetta/Rifiuta o urgente informativo (disattivabile da profilo Premium: conferma automatica + sola notifica) |
| Suono insistente | **Mai** | Solo se `canRespond` o `urgent` |

Preferenza operatore Premium: `staff_operators.require_booking_confirmation` (`GET/PATCH /me/staff/operator-profile`). Default `true` = comportamento attuale; `false` = auto-conferma (`CONFIRMED`) + notifica «ha prenotato» allo staff (niente Accetta/Rifiuta) e al cliente solo il modale «Appuntamento confermato» / «La prenotazione è confermata. La trovi nell'elenco…» (**senza** secondo popup/push `BOOKING_CONFIRMATION` «Il salone ha confermato»). Accettazione manuale: popup conferma cliente via `ConsumerNotificationAlertPoller` (attivo anche su home/ricerca, non solo `/account`). Il profilo operatore espone anche `averageStaffRating` / `staffReviewCount` dalle recensioni con voto staff e le elenca in `/account/profilo`.

Dettaglio completo: `.cursor/rules/luxury-booking-appointments.mdc`

---

## Chat luxury (Premium)

- Feature Premium (`SalonPremiumEntitlementService.hasActivePremium`)
- Thread separati: salone generale (`staffOperatorId=null`) vs operatore (`staffOperatorId=UUID`)
- Titolare: sempre thread salone, mai `staffOperatorId` in API
- Staff: sempre il proprio operatore
- API base: `/api/v1/me/salon-clients/chat/*` — usa `salonClientId`, **non** `locationId`/`organizationId`
- DB: `salon_luxury_chat_read_state` — unicità per thread, non per solo `salon_client_id`
- App nativa: lista conversazioni **oppure** thread a schermo intero (tipo WhatsApp). Aperto un thread: niente lista contatti sopra — solo Indietro + header della chat.

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

Si avvia **solo** lo stack Docker di sviluppo. Non avviare `./scripts/dev-backend.sh` (Spring su `127.0.0.1:8081`) né `./scripts/dev-frontend.sh` (Vite su `127.0.0.1:5173`): condividono il database `c1luxury` con l’API nel container e `localhost:5173` è occupata da un altro progetto.

```bash
./scripts/dev-docker.sh -d
# clienti http://127.0.0.1:8080
# pannello salone http://127.0.0.1:8083
# super admin http://127.0.0.1:8084
# API  http://127.0.0.1:8082/api/v1/public/health
# DB   PostgreSQL del Mac su localhost:5432, database e schema c1luxury
# SMTP Aruba parte con lo stesso avvio (luxury/spring-dev.local.env sull'API)
```

Verifica rapida:

```bash
curl -sf http://127.0.0.1:8082/api/v1/public/health
curl -sf -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/
```

File: `infrastructure/docker-compose.dev.yml`. Produzione resta `infrastructure/docker-compose.prod.yml` e non va avviata per il lavoro quotidiano (`http://localhost` senza porta è quel nginx, porta 80). L’API di sviluppo non forza più `LUXURY_MAIL_ENABLED=false`: a ogni avvio legge la posta da `luxury/spring-dev.local.env`.

App mobile (WebView sul sito Docker, non su Vite):

```bash
./scripts/dev-app-ios.sh      # oppure ./scripts/dev-app-android.sh
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
- La shell Flutter non applica vincoli di piano: i permessi Premium restano sul backend (`hasActivePremium`)

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
| `.cursor/rules/luxury-i18n.mdc` | Testi UI frontend: niente IT hardcoded; chiavi + traduzioni IT/EN/FR/DE/ES/PT |
| `.cursor/rules/luxury-app-maintenance.mdc` | Manutenzione app Flutter (frase: «manutenzione app») |
| `.cursor/rules/luxury-database-maintenance.mdc` | Manutenzione database/infrastruttura (frase: «manutenzione database») |
| `.cursor/rules/codegraph.mdc` | Uso CodeGraph MCP/CLI |
| `.cursor/rules/luxury-dev-docker-only.mdc` | Avvio locale: solo Docker di sviluppo (8080/8082) |
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
