# Checklist manutenzione backend — package by package

Usare insieme a `SKILL.md` e `./luxury-backend-maintenance.sh`.
Per ogni riga: `codegraph explore "<Simbolo>"`, poi spunta.

---

## security / auth

| Simbolo | Verifica | □ |
|---------|----------|---|
| `SecurityConfiguration` | `permitAll` solo su auth/public/webhook/health/swagger/admin-auth; `/api/v1/me/**` authenticated; admin `ROLE_ADMIN` | □ |
| `LuxuryUserPrincipal` | claim `sub`/`uid`/ruoli; `ensureKnownAppRoles` | □ |
| `LuxuryAuthLoginService` | login/register/refresh; niente leak password | □ |
| `LuxuryRefreshTokenService` | rotation Redis; invalidazione | □ |
| `RedisRefreshTokenStore` | TTL e revoke | □ |
| `LuxuryTokenService` | HS256 secret da config; no secret produzione hardcoded | □ |
| `SecurityAuditService` | eventi sensibili (login fail, webhook, admin) | □ |
| `SecurityAuditRetentionJob` | cron + retention giorni | □ |
| `AppointmentTokenService` | purpose token limitati | □ |

**Smell noti da monitorare:** `LuxurySecurityProperties` default `luxury-dev-token-secret-change-in-production` — OK solo se non usato in prod.

---

## studio (tenant core)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `StudioGroup` / `Location` | relazioni, slug pubblico, `plan_tier` | □ |
| `StudioGroupOwnerResolver` | **36+ callers** — ogni accesso titolare passa da qui | □ |
| `MeSalonAppointmentsService` | confirm/cancel OWNER vs stati BOOKED/CONFIRMED | □ |
| `MeSalonCatalogService` | servizi/operatori scoped a studio | □ |
| `MeSalonStaffService` | link staff ↔ profilo | □ |
| `MeSalonNotificationInboxService` | inbox **informativa** titolare (mai popup Accetta/Rifiuta) | □ |
| `MeSalonStatisticsPinService` | gate Premium | □ |
| `PublicOrganizationService` | vetrina + geo; Premium in evidenza | □ |
| `SalonDirectoryProvisioningService` | slugify, provisioning registrazione | □ |
| `SalonLocationGeocodingService` | PostGIS / coordinate | □ |

---

## appointment / catalog

| Simbolo | Verifica | □ |
|---------|----------|---|
| `Appointment` / `AppointmentRepository` | stati BOOKED/CONFIRMED/CANCELLED | □ |
| `AppointmentBookingService` | create/reschedule; **no covering test diretto** → verificare test controller | □ |
| `AvailabilityService` | `WorkSchedule`, `assertNoOverlap`, open days mask | □ |
| `OperatorTimeBlockService` | blocchi operatore | □ |
| `DaySummaryService` | aggregati giorno | □ |
| `SalonService` / `StaffOperator` / `SalonClient` | catalogo; operatori↔servizi | □ |
| `WorkSchedule` (test) | regressione orari | □ |

---

## consumer (B2C + me/*)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `ConsumerB2CEligibility` | titolare/staff **non** prenotano online | □ |
| `MeAppointmentsController` | `ROLE_CLIENT`; stati coerenti | □ |
| `MeSalonController` | `ROLE_OWNER`; namespace `/me/salon` | □ |
| `MeStaffController` | `ROLE_STAFF`; confirm staff path | □ |
| `MeSalonClientsController` | anagrafica + chat entry | □ |
| `SalonLuxuryChatService` | thread salone vs operatore; Premium; read state unicità | □ |
| `SalonClientMembershipService` | membership cliente↔sede | □ |
| `LuxuryAccountRegistrationService` | registrazione free/premium | □ |
| `LuxuryPendingRegistrationService` | pending + email verify | □ |
| `PendingSalonRegistrationMaterializationService` | materialize post-Stripe | □ |
| `MePersonalDataExportService` | GDPR export | □ |
| `ConsumerAccountService` | DELETE account | □ |
| `SalonClientInactivityExpiryJob` | guard giorni > 0 | □ |
| `SalonOwnerRoleAlignmentService` | allineamento ruoli OWNER | □ |

---

## staff (sede header)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `SalonLocationAccessService` | **test assenti** — priorità WARN; resolve via header | □ |
| `SalonCatalogStaffController` | `X-Location-Id`; `@Transactional` in controller = smell da valutare | □ |
| `SalonClientStaffController` | stessi vincoli | □ |
| `MeStaffAgendaService` | agenda operatore | □ |
| `MeStaffContextService` | context staff | □ |

---

## billing

| Simbolo | Verifica | □ |
|---------|----------|---|
| `SalonPremiumEntitlementService` | **31+ callers** — unica fonte verità Premium | □ |
| `StripeWebhookProcessor` | idempotenza event id; tipi handled; signature | □ |
| `SalonSubscriptionLifecycleService` | cancel / expiry / plan_tier | □ |
| `StripeCheckoutService` / `StripeBillingPortalService` | OWNER only | □ |
| `StripeSubscriptionSyncService` | sync subscription ↔ DB | □ |
| `FatturaPaInvoiceService` | generazione fattura | □ |
| `SalonBillingProfileService` | profilo fiscale titolare | □ |
| `BillingStatusService` | status API | □ |
| `CancelledSalonSubscriptionExpiryJob` | grace days guard | □ |
| `MeBillingStatusController` / `MeStripeBillingController` | `ROLE_OWNER` | □ |
| `StripeWebhookController` | pubblico ma firmato Stripe | □ |

**Regola:** qualsiasi change qui → CodeGraph blast radius obbligatorio prima del edit.

---

## notification

| Simbolo | Verifica | □ |
|---------|----------|---|
| `AppointmentNotificationService` | canali distinti OWNER vs STAFF | □ |
| `NotificationService` / `FcmPushDispatchService` | FCM devices | □ |
| `ScheduledNotificationProcessor` | due processing | □ |
| `NotificationPollJob` | poll interval config | □ |
| `MeDevicesController` | registrazione device | □ |
| `MeNotificationInboxService` | inbox consumer | □ |
| `TransactionalEmailDispatchService` | email HTML luxury | □ |

---

## publicapi / SEO

| Simbolo | Verifica | □ |
|---------|----------|---|
| `PublicOrganizationController` | ricerca geo; **legacy** `ResponseStatusException` → migrare a `BusinessException` | □ |
| `PublicOperatorController` | stesso smell ResponseStatusException | □ |
| `PublicHealthController` | liveness | □ |
| `PublicConsumerRegistrationController` | registrazione pubblica | □ |
| `PublicPremiumRegistrationCheckoutController` | checkout premium | □ |
| `SalonSeoPageController` / `SalonSeoDiscoveryController` | SSR head / sitemap / robots | □ |
| `SalonSeoMetadataService` | JSON-LD; gate Premium | □ |
| `PostalLocateService` | locate CAP | □ |
| `CookieConsentRegistryService` | GDPR cookie | □ |

---

## review

| Simbolo | Verifica | □ |
|---------|----------|---|
| `ReviewCommandService` / `ReviewReadService` | eleggibilità post-appuntamento | □ |
| `ReviewModerationService` | moderazione | □ |
| `ReviewShowcaseService` | vetrina | □ |
| `PlatformReviewCommandService` | review piattaforma | □ |
| `ReviewEligibility` / `ReviewPrivacySupport` | GDPR colonne | □ |

---

## admin (super admin)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxurySuperAdminAuthService` | auth separata; status pubblico ok | □ |
| `SuperAdminOverviewService` / `SuperAdminOverviewActionsService` | impersonazione / azioni; JdbcTemplate SQL safe | □ |
| `SuperAdminConsumerManagementService` | gestione consumer | □ |
| `SuperAdminFiscalInvoiceService` | fatture fiscali | □ |
| `SuperAdminSupportInboxService` | supporto | □ |
| `SuperAdminPlatformInsightsService` | insights JDBC | □ |
| Controllers admin | sicurezza via `SecurityConfiguration` `ROLE_ADMIN` (PreAuthorize opzionale) | □ |

---

## common / config / bootstrap / legal / integrations / dev

| Simbolo | Verifica | □ |
|---------|----------|---|
| `GlobalExceptionHandler` | mappa `BusinessException` → JSON stabile | □ |
| `BusinessException` | usato ovunque (non ResponseStatus sparsa) | □ |
| `SecurityConfiguration` + CORS + headers | no CSRF disable senza mitigazioni note | □ |
| Schema alignment runners (`bootstrap/*`) | idempotenti; no data wipe | □ |
| `LuxuryDemoDataLoader` | solo profile demo/local | □ |
| `LocalDevEmailController` | **solo** profile dev | □ |
| `CookieConsentEvent` | persistenza consensi | □ |
| `integrations/base44` | se presente, non esporre in prod senza gate | □ |

---

## Job schedulati (tutti)

| Job | Guard | □ |
|-----|-------|---|
| `CancelledSalonSubscriptionExpiryJob` | `deletionGraceDays <= 0` → no-op | □ |
| `SalonClientInactivityExpiryJob` | `inactivityExpiryDays <= 0` → no-op | □ |
| `SecurityAuditRetentionJob` | retention configurabile | □ |
| `NotificationPollJob` | fixedDelay da properties | □ |

---

## Gap test noti (da CodeGraph / inventari)

Trattare come WARN finché non coperto:

- `SalonLocationAccessService` — no covering tests
- `MeSalonNotificationInboxService` — no covering tests diretti
- `StudioGroupOwnerResolver` — no covering tests diretti (alta criticità)
- `AppointmentBookingService` — no covering tests diretti (coverage via controller?)

Verificare indirezione: `MeSalonControllerTest`, `MeAppointments*`, `SalonCatalogStaffControllerSecurityTest`, ecc.

---

## Namespace API — radar rapido

| Base path | Ruolo atteso |
|-----------|--------------|
| `/api/v1/public/**` | pubblico |
| `/api/v1/auth/**` | pubblico |
| `/api/v1/webhooks/stripe` | pubblico + firma |
| `/api/v1/me/appointments` … | `ROLE_CLIENT` |
| `/api/v1/me/salon/**` | `ROLE_OWNER` |
| `/api/v1/me/staff/**` | `ROLE_STAFF` |
| `/api/v1/me/billing/**` | `ROLE_OWNER` |
| `/api/v1/me/salon-clients/chat/**` | authenticated + Premium server-side |
| `/api/v1/clients|services|operators` | authenticated + `X-Location-Id` |
| `/api/v1/admin/**` | `ROLE_ADMIN` (auth admin pubblica su `/admin/auth`) |
| `/api/v1/dev/**` | solo profile locale |

Se trovi un `@RequestMapping` fuori da questa tabella → **FAIL** finché non documentato.
