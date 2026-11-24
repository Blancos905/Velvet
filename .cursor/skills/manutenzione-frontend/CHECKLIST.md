# Checklist manutenzione frontend — area by area

Usare insieme a `SKILL.md` e `./luxury-frontend-maintenance.sh`.
Per ogni riga: `codegraph explore "<Simbolo>"`, poi spunta.

---

## auth / providers / session

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryAuthProvider` | token in `sessionStorage`; refresh; ruoli esposti via context | □ |
| `useLuxuryAuth` | unica API per `isSalonTitolare` / `isSalonStaff` / token | □ |
| `luxuryRefreshSession` | refresh token storage; revoke logout | □ |
| `useLuxurySessionExpiryWatchdog` | expiry → logout / re-login pulito | □ |
| `AdminAuthProvider` / `adminSession` | token admin in `localStorage` (`luxury_super_admin_access_token`) | □ |
| `useAdminAccessTokenRefresh` | refresh admin separato | □ |
| `AppProviders` | QueryClient + auth providers ordine corretto | □ |
| `parseLuxurySecurityRoles` | normalizza CLIENT/OWNER/STAFF/ADMIN | □ |
| `realmRolesFromAccessToken` / `luxuryJwtHintsFromAccessToken` | solo hint; non bypassare provider | □ |
| `luxuryAccessTokenExpiry` | expiry claim | □ |

**Smell:** JWT `atob` fuori da `auth/` + `lib/*` documentati → WARN se nuovo uso ad hoc in pages.

---

## api client

| Simbolo | Verifica | □ |
|---------|----------|---|
| `apiJson` / `apiFetch` | **129+ callers** — base URL, Bearer, errori | □ |
| `fetchWithTimeout` | timeout coerente | □ |
| `httpApiErrorMessage` | messaggi utente da errori API | □ |
| `luxurySessionExpired` | 401 → sessione scaduta | □ |
| `luxuryBackendBasePaths` | path `/api/v1/...` centralizzati | □ |
| `billing.ts` | checkout/portal OWNER | □ |
| `registerConsumer` / `registerClient` | registrazione pubblica | □ |
| `premiumRegistrationCheckout` | flusso premium signup | □ |
| `meDataExport` | GDPR export | □ |
| `fcmDevice` | registrazione device push | □ |
| `adminFiscalInvoices` | admin fatture | □ |
| `locate` / `cookieConsentRegistry` | pubblici | □ |
| `types.ts` | DTO allineati alle API backend | □ |

---

## routing (`App.tsx` + `lazyPages.ts`)

| Path / simbolo | Verifica | □ |
|----------------|----------|---|
| `App` routes pubbliche | `/`, `/search`, `/s/:slug`, `/piani`, `/partner`, `/registrati` | □ |
| Account shell | `/account/*` sotto `ProtectedRoute` | □ |
| Home per ruolo | admin→`/admin`; staff→`/account/staff`; owner→`/salone`; client→prenotazioni | □ |
| `AccountIndexRedirect` | redirect corretto post-login | □ |
| Staff agenda | `/account/staff/agenda` (overlay nativo) | □ |
| Salon tools | servizi/staff/clienti/brand/statistiche/posizione | □ |
| Billing | `/account/billing/checkout|success` | □ |
| Chat | `/account/chat` | □ |
| Admin | `/admin/*` + `AdminProtectedRoute` | □ |
| Legal | privacy/termini/DPA/cookie | □ |
| Dev-only | `/dev/*` solo `import.meta.env.DEV` | □ |
| `lazyPages` | ogni page account/admin/lazy pubblica dichiarata | □ |
| Catch-all | `*` → `/` | □ |

---

## ruoli UX (cliente / titolare / staff)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `ProtectedRoute` | super admin fuori da `/account`; gate Free owner web | □ |
| `isSalonStaff = STAFF && !OWNER` | coerente in header, hub, notifiche | □ |
| `nativeAccountHubPaths` | hub Profilo app: path per ruolo | □ |
| `appHeaderProfileMenuItems` | menu profilo web vs native | □ |
| `AccountLayout` / hub CSS | shell distinta client/salon/staff | □ |
| `luxuryConsumerBooking` | `canBookOnlineAsConsumer` false per owner/staff | □ |
| `SalonFreeWebPanelGate` | vincoli Free sul pannello web | □ |
| `subscription-guards` | snapshot allineato a Flutter JSON | □ |

---

## booking / agenda / notifiche popup

| Simbolo | Verifica | □ |
|---------|----------|---|
| `AppointmentsPage` / `AppointmentDetailPage` | stati BOOKED/CONFIRMED/CANCELLED in UI | □ |
| `SalonStudioAgendaPage` / `SalonStaffAgendaPage` | agenda titolare vs staff | □ |
| `StaffMemberAgendaPage` | agenda operatore | □ |
| `BookingActionConfirmModal` | conferma azioni branded | □ |
| `useSalonBookingRequestAlerts` | popup urgente **solo** staff | □ |
| `luxuryNotificationPopup` | `isSalonStaffPopupType`; owner = informativo | □ |
| `luxuryBookingAlertSound` / in-app sound bus | suono operatore non al titolare | □ |
| `SalonBookingAlertPoller` | poller montato solo dove serve | □ |
| `PendingBookingResume` | resume prenotazione; evitare `window.alert` dove possibile | □ |

**FAIL prodotto:** popup Accetta/Rifiuta o suono operatore sul titolare.

---

## chat Premium

| Simbolo | Verifica | □ |
|---------|----------|---|
| `SalonLuxuryChatPage` | deep link `?salonClientId=` | □ |
| `salonLuxuryChatThreads` | thread salone vs operatore | □ |
| `useMeSalonChatUnread` | badge unread | □ |
| CSS chat | `luxury-chat-{client,salon,staff}.css` | □ |
| Titolare | mai forzare `staffOperatorId` in API FE | □ |
| Staff | thread operatore proprio | □ |
| Gate | Premium: UI + errore API se non entitlement | □ |

---

## piani / billing / Premium UX

| Simbolo | Verifica | □ |
|---------|----------|---|
| `useEffectiveSalonPlanTier` | piano effettivo (~25 callers) | □ |
| `useSalonFeaturePlanTier` / `useSalonPremiumCheckoutPolicy` | feature flags UX | □ |
| `SalonPlansPage` / upgrade Free→Premium | CTA checkout | □ |
| `AccountBillingCheckoutPage` / Success | post-Stripe | □ |
| `salonPremiumCheckoutPolicy` | policy checkout | □ |
| Statistiche / SEO / chat gate FE | sempre accompagnati da check backend | □ |
| `salonFreeOwnerWebAccess` | limiti Free web | □ |

---

## account pages (inventario)

Spunta gruppi (ogni page: lazy + API + ruolo):

| Gruppo | Pages | □ |
|--------|-------|---|
| Hub | `AccountHomePage`, `AccountSalonHomePage`, `StaffMemberHomePage`, `AccountConsumerHomePage` | □ |
| Catalogo titolare | `SalonServicesPage`, `SalonStaffPage`, `SalonClientsPage` | □ |
| Brand/vetrina | `SalonBrandPage`, preview layout, `SalonPersonalPageBuilder`, `SalonLayoutCatalogPage` | □ |
| Ops | `SalonStatisticsPage`, `SalonLocationPage`, `SalonStandardToolsPage` | □ |
| Prenotazioni | `AppointmentsPage`, detail, studio/staff agenda, staff pick | □ |
| Profilo/support | `ProfilePage`, `SupportPage`, `AccountInfoPrivacyPage`, feedback | □ |
| Extra | favorites, trusted salons, notifications, billing | □ |

---

## pubblico / SEO / legale

| Simbolo | Verifica | □ |
|---------|----------|---|
| `HomePage` / `SearchPage` | ricerca + Premium in evidenza (dati da API) | □ |
| `SalonPage` / `SalonExplorePage` / `SalonPersonalPage` | vetrina `/s/:slug` | □ |
| `publicOrganizationDetail` | mapping payload pubblico | □ |
| `TopOperatorsPage` / `MonthlyIdeaPage` / `NationsCupPage` | sezioni editoriali | □ |
| `PartnerPage` / `ClientSignupPage` | acquisizione | □ |
| `ReviewPage` | flusso recensione | □ |
| Legal pages | privacy (client/staff/cookie), termini, DPA, delete account | □ |
| `useCookieConsent` / cookie lib | banner/consensi | □ |

---

## admin

| Simbolo | Verifica | □ |
|---------|----------|---|
| `AdminProtectedRoute` | solo `ROLE_ADMIN` / token admin | □ |
| `AdminDashboardPage` | overview | □ |
| `AdminAssistenzaPage` | supporto (alert clipboard ok; evitare confirm dove branded) | □ |
| `AdminFiscalInvoicesPage` | fatture | □ |
| `AdminSuperAdminProfilePage` | profilo | □ |
| `AdminRegisterSuperAdminPage` | registrazione | □ |
| Sezioni consumers / plan | no leak token consumer | □ |

---

## hooks / components / lib / styles

| Area | Verifica | □ |
|------|----------|---|
| Hooks me/* | React Query keys `["me", ...]`; enabled se token | □ |
| `useMeProfile` | displayName hub «Ciao» | □ |
| `useFcmToken` | push + pending open | □ |
| `useLuxuryNativeAppShell` | detection WebView | □ |
| Components `account/` `salon/` `admin/` | riuso, no duplicare role checks | □ |
| `AppHeader` / profile menu | Profilo → hub in app nativa | □ |
| Styles | class naming `luxury-*`; no regressione shell account | □ |
| `prefetchAccountRoutes` | prefetch post-login | □ |

---

## Smell noti da monitorare

| Finding | Severità | Note |
|---------|----------|------|
| `window.confirm` in `TrustedSalonsPage` | WARN | migrare a modale branded |
| `window.alert` in `PendingBookingResume`, `AdminAssistenzaPage` | WARN | preferire toast/modale |
| JWT `atob` in `trustedSalonsNavBadge`, `superAdminOverviewProfile` | WARN | tenere isolati / riusare helper |
| Pochi test Vitest (~12) vs 346 file | WARN | priorità: auth roles, popup staff, chat threads, subscription-guards |
| `BookingActionConfirmModal` coverage bassa | WARN | usato in pochi call site — verificare altri confirm nativi |

---

## Allineamento native app (solo se finding FE)

| Check | □ |
|-------|---|
| Path hub = `nativeAccountHubPaths` / `nativeAccountOverlayTitle` | □ |
| `subscription-guards.ts` ↔ `luxury_subscription_guards.json` Flutter | □ |
| Bridge non duplica UI logica | □ |

---

## Radar route account (home)

| Ruolo | Home attesa |
|-------|-------------|
| Super admin | `/admin/dashboard` (non restare su `/account`) |
| Staff (`STAFF && !OWNER`) | `/account/staff` |
| Titolare | `/salone` |
| Cliente | hub `/account`; prenotazioni, chat e le altre voci in overlay come il menu salone |

Se una route nuova non è in `App.tsx` + `lazyPages.ts` → **FAIL**.
