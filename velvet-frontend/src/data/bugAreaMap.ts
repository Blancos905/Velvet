export type BugAreaMapEntry = {
  tag: string;
  label: string;
  surfaces: string[];
  /** Parole chiave, route senza @, sinonimi italiani. */
  aliases: string[];
  example: string;
  frontend: string[];
  backend: string[];
  tests: string[];
};

/** Annotazioni @tag per segnalazioni rapide in Cursor. */
export const BUG_AREA_MAP: BugAreaMapEntry[] = [
  {
    tag: "registrazione",
    label: "Registrazione (titolare o cliente)",
    surfaces: ["/piani", "/registrati"],
    aliases: ["registrazione", "iscrizione", "signup", "onboarding"],
    example: "@registrazione c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/SalonPlansPage.tsx",
      "velvet-frontend/src/pages/ClientSignupPage.tsx",
      "velvet-frontend/src/api/registerConsumer.ts",
      "velvet-frontend/src/api/registerClient.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/publicapi/api/PublicConsumerRegistrationController.java",
      "velvet/src/main/java/it/velvet/publicapi/api/PublicClientRegistrationController.java",
      "velvet/src/main/java/it/velvet/publicapi/validation/ConsumerRegistrationValidator.java",
    ],
    tests: [
      "cd velvet && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest,ClientRegistrationIntegrationTest",
    ],
  },
  {
    tag: "piani",
    label: "Registrazione titolare / piani salone",
    surfaces: ["/piani"],
    aliases: ["piani", "piano salone", "abbonamento", "premium signup", "base signup"],
    example: "@piani c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/SalonPlansPage.tsx",
      "velvet-frontend/src/data/salonPlans.ts",
      "velvet-frontend/src/api/registerConsumer.ts",
      "velvet-frontend/src/components/salon/SalonPremiumPlanCardPreview.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/publicapi/api/PublicConsumerRegistrationController.java",
      "velvet/src/main/java/it/velvet/publicapi/validation/ConsumerRegistrationValidator.java",
      "velvet/src/main/java/it/velvet/studio/service/SalonDirectoryProvisioningService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest"],
  },
  {
    tag: "registrati",
    label: "Registrazione cliente finale",
    surfaces: ["/registrati"],
    aliases: ["registrati", "cliente finale", "signup cliente"],
    example: "@registrati c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/ClientSignupPage.tsx", "velvet-frontend/src/api/registerClient.ts"],
    backend: ["velvet/src/main/java/it/velvet/publicapi/api/PublicClientRegistrationController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=ClientRegistrationIntegrationTest,PublicClientRegistrationControllerTest"],
  },
  {
    tag: "auth",
    label: "Login, callback OIDC, sessione",
    surfaces: ["/auth/callback", "/account"],
    aliases: ["auth", "login", "logout", "oidc", "sessione", "token", "jwt"],
    example: "@auth c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/auth/VelvetAuthProvider.tsx",
      "velvet-frontend/src/components/ProtectedRoute.tsx",
      "velvet-frontend/src/pages/OidcCallbackPage.tsx",
      "velvet-frontend/src/api/accountClosedSession.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/security/api/VelvetAuthController.java",
      "velvet/src/main/java/it/velvet/consumer/api/MeAccountController.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeAccountControllerTest"],
  },
  {
    tag: "password",
    label: "Reimposta password",
    surfaces: ["/reimposta-password"],
    aliases: ["password", "reimposta password", "reset password"],
    example: "@password c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/PasswordResetPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/security/api/VelvetAuthController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=VelvetPasswordResetIntegrationTest"],
  },
  {
    tag: "home",
    label: "Home pubblica",
    surfaces: ["/"],
    aliases: ["home", "landing", "homepage"],
    example: "@home c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/HomePage.tsx", "velvet-frontend/src/styles/luxury-home.css"],
    backend: [],
    tests: ["cd velvet-frontend && npm run build"],
  },
  {
    tag: "partner",
    label: "Pagina partner",
    surfaces: ["/partner"],
    aliases: ["partner"],
    example: "@partner c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/PartnerPage.tsx"],
    backend: [],
    tests: [],
  },
  {
    tag: "shell",
    label: "Header, footer, layout globale",
    surfaces: ["layout globale"],
    aliases: ["header", "footer", "menu", "navigazione globale", "cookie banner"],
    example: "@shell c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/layout/RootLayout.tsx",
      "velvet-frontend/src/components/AppHeader.tsx",
      "velvet-frontend/src/components/AppFooter.tsx",
      "velvet-frontend/src/components/CookieConsentBanner.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "ricerca",
    label: "Ricerca saloni e filtri",
    surfaces: ["/search"],
    aliases: ["ricerca", "search", "mappa", "filtri", "geolocalizzata"],
    example: "@ricerca c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/SearchPage.tsx",
      "velvet-frontend/src/styles/luxury-search-page.css",
      "velvet-frontend/src/components/SearchHitLogoAvatar.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/publicapi/api/PublicOrganizationController.java",
      "velvet/src/main/java/it/velvet/studio/service/PublicOrganizationService.java",
    ],
    tests: [
      "cd velvet && ./mvnw -q test -Dtest=PublicOrganizationServiceGeoSearchTest,SalonQuickSearchCatalogHintsTest",
    ],
  },
  {
    tag: "geocoding",
    label: "CAP, indirizzo, coordinate sede",
    surfaces: ["/search", "/account/salone/posizione", "/account/profilo"],
    aliases: ["geocoding", "cap", "indirizzo", "coordinate", "localizza", "locate"],
    example: "@geocoding c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/api/locate.ts",
      "velvet-frontend/src/pages/account/salon/SalonLocationPage.tsx",
      "velvet-frontend/src/components/salon/SalonLocationMapCard.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/publicapi/api/PublicLocateController.java",
      "velvet/src/main/java/it/velvet/studio/service/SalonLocationGeocodingService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=SalonLocationGeocodingServiceTest"],
  },
  {
    tag: "vetrina",
    label: "Scheda pubblica salone",
    surfaces: ["/s/:slug"],
    aliases: ["vetrina", "scheda salone", "mini sito", "slug"],
    example: "@vetrina c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/SalonPage.tsx",
      "velvet-frontend/src/components/salon/SalonPublicShowcase.tsx",
      "velvet-frontend/src/lib/salonShowcaseStorage.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "esplora",
    label: "Pagina Esplora il salone",
    surfaces: ["/s/:slug/esplora"],
    aliases: ["esplora", "esplora salone"],
    example: "@esplora c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/SalonExplorePage.tsx", "velvet-frontend/src/lib/salonPersonalPageStorage.ts"],
    backend: ["velvet/src/main/java/it/velvet/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "sito-salone",
    label: "Pagina Il tuo salone (pubblica)",
    surfaces: ["/s/:slug/il-tuo-salone"],
    aliases: ["il tuo salone", "sito salone", "pagina personale"],
    example: "@sito-salone c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/SalonPersonalPage.tsx", "velvet-frontend/src/lib/salonPersonalPageStorage.ts"],
    backend: ["velvet/src/main/java/it/velvet/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "disponibilita",
    label: "Slot e disponibilità prenotazione pubblica",
    surfaces: ["/s/:slug"],
    aliases: ["disponibilità", "slot", "agenda pubblica", "availability"],
    example: "@disponibilita c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/SalonPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/publicapi/api/PublicOrganizationController.java",
      "velvet/src/main/java/it/velvet/appointment/service/AvailabilityService.java",
    ],
    tests: [],
  },
  {
    tag: "premium",
    label: "Piano Premium, tier, guard",
    surfaces: ["/account/salone", "/piani"],
    aliases: ["premium", "tier", "piano", "provisioned", "guard"],
    example: "@premium c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/hooks/useEffectiveSalonPlanTier.ts",
      "velvet-frontend/src/pages/account/salon/SalonStandardSectionGuard.tsx",
      "velvet-frontend/src/data/salonPlans.ts",
      "velvet-frontend/src/pages/account/AccountHubNavPremiumSalonLinks.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/studio/domain/StudioGroup.java",
      "velvet/src/main/java/it/velvet/studio/service/MeSalonSummaryService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonControllerTest"],
  },
  {
    tag: "panorama",
    label: "Hub / checklist Premium",
    surfaces: ["/account/salone"],
    aliases: ["panorama", "checklist", "hub premium"],
    example: "@panorama c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/components/salon/SalonPremiumPanorama.tsx",
      "velvet-frontend/src/data/salonPremiumPanoramaContent.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "brand",
    label: "Brand, logo, colori salone",
    surfaces: ["/account/salone/brand"],
    aliases: ["brand", "logo", "colori", "carousel"],
    example: "@brand c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonBrandPage.tsx", "velvet-frontend/src/lib/salonShowcaseStorage.ts"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeSalonController.java"],
    tests: [],
  },
  {
    tag: "layout",
    label: "Anteprima layout vetrina",
    surfaces: ["/account/salone/brand/anteprima-layout", "/account/salone/layout"],
    aliases: ["layout", "anteprima layout", "catalogo layout"],
    example: "@layout c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonBrandLayoutPreviewPage.tsx",
      "velvet-frontend/src/components/salon/SalonCustomLayoutShowcase.tsx",
      "velvet-frontend/src/pages/account/salon/SalonLayoutCatalogPage.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "editor-sito",
    label: "Crea il tuo sito (titolare)",
    surfaces: ["/account/salone/tuo-salone"],
    aliases: ["editor sito", "crea sito", "builder", "tuo salone"],
    example: "@editor-sito c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonPersonalPageBuilder.tsx",
      "velvet-frontend/src/lib/salonPersonalPageStorage.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "statistiche",
    label: "Statistiche salone / PDF",
    surfaces: ["/account/salone/statistiche"],
    aliases: ["statistiche", "stats", "pdf", "report", "semestrale"],
    example: "@statistiche c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonStatisticsPage.tsx",
      "velvet-frontend/src/lib/salonStatisticsMetrics.ts",
      "velvet-frontend/src/lib/salonStatsDerived.ts",
      "velvet-frontend/src/lib/salonSemesterAccountantPdf.ts",
    ],
    backend: [],
    tests: ["cd velvet-frontend && npm test -- salonStatsDerived salonStatisticsMetrics"],
  },
  {
    tag: "posizione",
    label: "Posizione sede salone",
    surfaces: ["/account/salone/posizione"],
    aliases: ["posizione", "sede", "mappa salone"],
    example: "@posizione c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonLocationPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/studio/service/SalonLocationGeocodingService.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=SalonLocationGeocodingServiceTest"],
  },
  {
    tag: "strumenti",
    label: "Strumenti standard salone",
    surfaces: ["/account/salone/strumenti"],
    aliases: ["strumenti", "tools salone"],
    example: "@strumenti c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonStandardToolsPage.tsx"],
    backend: [],
    tests: [],
  },
  {
    tag: "salone",
    label: "Home salone in account",
    surfaces: ["/account/salone"],
    aliases: ["salone", "hub salone"],
    example: "@salone c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/AccountSalonHomePage.tsx",
      "velvet-frontend/src/hooks/useMeSalonSummary.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeSalonController.java",
      "velvet/src/main/java/it/velvet/studio/service/MeSalonSummaryService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonControllerTest"],
  },
  {
    tag: "home-titolare",
    label: "Redirect legacy /account/home → salone",
    surfaces: ["/account/home"],
    aliases: ["home titolare", "dashboard titolare"],
    example: "@home-titolare c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/AccountHomePage.tsx"],
    backend: [],
    tests: [],
  },
  {
    tag: "servizi",
    label: "Catalogo servizi salone",
    surfaces: ["/account/salone/servizi"],
    aliases: ["servizi", "catalogo servizi", "listino"],
    example: "@servizi c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonServicesPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeSalonServicesController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonServicesControllerTest"],
  },
  {
    tag: "staff",
    label: "Operatori salone",
    surfaces: ["/account/salone/staff", "/account/staff"],
    aliases: ["staff", "operatori", "team"],
    example: "@staff c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonStaffPage.tsx",
      "velvet-frontend/src/pages/account/StaffMemberHomePage.tsx",
      "velvet-frontend/src/hooks/useSalonStaffList.ts",
      "velvet-frontend/src/hooks/useMeStaffSalon.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeSalonController.java",
      "velvet/src/main/java/it/velvet/consumer/api/MeStaffController.java",
      "velvet/src/main/java/it/velvet/studio/service/MeStaffContextService.java",
    ],
    tests: [],
  },
  {
    tag: "staff-api",
    label: "API operative staff (agenda, catalogo, clienti)",
    surfaces: ["/account/staff", "/account/prenotazioni/staff/:staffId/agenda"],
    aliases: ["api staff", "agenda staff api", "catalogo staff"],
    example: "@staff-api c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/staff/api/AppointmentStaffController.java",
      "velvet/src/main/java/it/velvet/staff/api/DaySummaryStaffController.java",
      "velvet/src/main/java/it/velvet/staff/api/SalonCatalogStaffController.java",
      "velvet/src/main/java/it/velvet/staff/api/SalonClientStaffController.java",
    ],
    tests: [],
  },
  {
    tag: "clienti",
    label: "Anagrafica clienti salone",
    surfaces: ["/account/salone/clienti"],
    aliases: ["clienti", "anagrafica", "rubrica clienti"],
    example: "@clienti c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonClientsPage.tsx",
      "velvet-frontend/src/lib/salonCatalogClientsSync.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeSalonClientsController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonClientsControllerTest"],
  },
  {
    tag: "chat",
    label: "Chat Saloni Luxury",
    surfaces: ["/account/chat"],
    aliases: ["chat", "messaggi salone", "inbox chat"],
    example: "@chat c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/SalonLuxuryChatPage.tsx",
      "velvet-frontend/src/hooks/useMeSalonChatUnread.ts",
      "velvet-frontend/src/lib/salonChatInbox404.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/consumer/service/SalonLuxuryChatService.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonClientsControllerTest"],
  },
  {
    tag: "notifiche",
    label: "Notifiche account / salone",
    surfaces: ["/account/notifiche"],
    aliases: ["notifiche", "inbox", "avvisi"],
    example: "@notifiche c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/NotificationsPage.tsx",
      "velvet-frontend/src/hooks/useMeNotificationInbox.ts",
      "velvet-frontend/src/hooks/useMeSalonNotificationInbox.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeNotificationsController.java",
      "velvet/src/main/java/it/velvet/studio/service/MeSalonNotificationInboxService.java",
      "velvet/src/main/java/it/velvet/notification/service/AppointmentNotificationService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=AppointmentNotificationServiceTest,ScheduledNotificationProcessorTest"],
  },
  {
    tag: "prenotazioni",
    label: "Prenotazioni account",
    surfaces: ["/account/prenotazioni"],
    aliases: ["prenotazioni", "appuntamenti", "booking"],
    example: "@prenotazioni c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/AppointmentsPage.tsx",
      "velvet-frontend/src/components/PendingBookingResume.tsx",
      "velvet-frontend/src/pages/account/PrenotazioniStaffPickPage.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeAppointmentsController.java",
      "velvet/src/main/java/it/velvet/studio/service/MeSalonAppointmentsService.java",
      "velvet/src/main/java/it/velvet/appointment/service/AppointmentBookingService.java",
    ],
    tests: [],
  },
  {
    tag: "prenotazione-dettaglio",
    label: "Dettaglio singola prenotazione",
    surfaces: ["/account/prenotazioni/:id"],
    aliases: ["dettaglio prenotazione", "appuntamento dettaglio"],
    example: "@prenotazione-dettaglio c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/AppointmentDetailPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeAppointmentsController.java"],
    tests: [],
  },
  {
    tag: "agenda",
    label: "Agenda operatore / board",
    surfaces: ["/account/prenotazioni/staff/:staffId/agenda"],
    aliases: ["agenda", "calendario", "board agenda"],
    example: "@agenda c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx",
      "velvet-frontend/src/pages/account/SalonAgendaBoard.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/studio/service/MeStaffAgendaService.java",
      "velvet/src/main/java/it/velvet/staff/api/AppointmentStaffController.java",
    ],
    tests: [],
  },
  {
    tag: "recensioni",
    label: "Recensioni e inviti",
    surfaces: ["/recensione", "/s/:slug"],
    aliases: ["recensioni", "review", "stelle", "voti"],
    example: "@recensioni c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/ReviewPage.tsx",
      "velvet-frontend/src/components/salon/SalonPublicReviewsBlock.tsx",
      "velvet-frontend/src/hooks/useMeSalonReviews.ts",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeReviewsController.java",
      "velvet/src/main/java/it/velvet/publicapi/api/PublicReviewController.java",
      "velvet/src/main/java/it/velvet/review/service/ReviewCommandService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeReviewsIntegrationTest,MeReviewsEndpointsSecurityTest"],
  },
  {
    tag: "preferiti",
    label: "Preferiti cliente",
    surfaces: ["/account/preferiti"],
    aliases: ["preferiti", "favorites"],
    example: "@preferiti c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/FavoritesPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeFavoritesController.java",
      "velvet/src/main/java/it/velvet/consumer/service/FavoriteLocationService.java",
    ],
    tests: [],
  },
  {
    tag: "fiducia",
    label: "Saloni di fiducia",
    surfaces: ["/account/saloni-di-fiducia"],
    aliases: ["fiducia", "saloni di fiducia", "trusted"],
    example: "@fiducia c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/TrustedSalonsPage.tsx",
      "velvet-frontend/src/lib/trustedSalonsNavBadge.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/consumer/service/SalonClientMembershipService.java"],
    tests: [],
  },
  {
    tag: "profilo",
    label: "Profilo account",
    surfaces: ["/account/profilo"],
    aliases: ["profilo", "anagrafica account", "dati personali"],
    example: "@profilo c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/ProfilePage.tsx", "velvet-frontend/src/hooks/useMeProfile.ts"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeProfileController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeProfileControllerTest"],
  },
  {
    tag: "account",
    label: "Layout e navigazione account",
    surfaces: ["/account"],
    aliases: ["account", "menu account", "hub account"],
    example: "@account c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/AccountLayout.tsx",
      "velvet-frontend/src/pages/account/AccountHubNavOwnerConsumerLinks.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "privacy",
    label: "Info privacy account / Premium",
    surfaces: ["/account/info-privacy"],
    aliases: ["privacy account", "info privacy", "informativa titolare"],
    example: "@privacy c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/AccountInfoPrivacyPage.tsx",
      "velvet-frontend/src/pages/account/SalonPremiumOwnerInfoPrivacyContent.tsx",
      "velvet-frontend/src/components/salon/SalonPremiumOwnerInfoPrivacyModal.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "legale",
    label: "Pagine legali pubbliche",
    surfaces: ["/privacy", "/privacy/clienti", "/privacy/staff", "/termini", "/legale"],
    aliases: ["legale", "termini", "privacy policy", "documenti legali"],
    example: "@legale c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/legal/",
      "velvet-frontend/src/content/legalSharedCopy.ts",
      "velvet-frontend/src/content/legalEntity.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "cookie",
    label: "Cookie e consenso",
    surfaces: ["/privacy/cookie", "/privacy/scelte"],
    aliases: ["cookie", "consenso", "gdpr banner"],
    example: "@cookie c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/components/CookieConsentBanner.tsx",
      "velvet-frontend/src/pages/legal/CookiePolicyPage.tsx",
      "velvet-frontend/src/pages/legal/PrivacyChoicesPage.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "elimina-account",
    label: "Eliminazione account",
    surfaces: ["/privacy/elimina-account"],
    aliases: ["elimina account", "cancellazione account", "delete account"],
    example: "@elimina-account c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/legal/AccountDeletionPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeAccountController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeAccountControllerTest"],
  },
  {
    tag: "assistenza",
    label: "Assistenza account",
    surfaces: ["/account/assistenza"],
    aliases: ["assistenza", "supporto", "ticket"],
    example: "@assistenza c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/SupportPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeSupportController.java"],
    tests: [],
  },
  {
    tag: "feedback",
    label: "Feedback piattaforma",
    surfaces: ["/account/feedback-velvet"],
    aliases: ["feedback", "suggerimenti"],
    example: "@feedback c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/VelvetFeedbackPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/review/service/PlatformReviewCommandService.java"],
    tests: [],
  },
  {
    tag: "export",
    label: "Export dati personali",
    surfaces: ["/account/info-privacy", "/account/profilo"],
    aliases: ["export", "portabilità", "download dati"],
    example: "@export c'è un bug, controlla",
    frontend: ["velvet-frontend/src/api/meDataExport.ts"],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/api/MeDataExportController.java",
      "velvet/src/main/java/it/velvet/consumer/service/MePersonalDataExportService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeDataExportControllerTest"],
  },
  {
    tag: "admin",
    label: "Dashboard super-admin",
    surfaces: ["/admin", "/admin/dashboard"],
    aliases: ["admin", "super admin", "dashboard admin"],
    example: "@admin c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/AdminDashboardPage.tsx",
      "velvet-frontend/src/pages/admin/AdminSalonPlanSection.tsx",
      "velvet-frontend/src/pages/admin/SuperAdminStatisticsSection.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/admin/api/SuperAdminOverviewController.java",
      "velvet/src/main/java/it/velvet/admin/service/SuperAdminOverviewService.java",
    ],
    tests: [],
  },
  {
    tag: "admin-consumer",
    label: "Gestione consumer da admin",
    surfaces: ["/admin", "/admin/dashboard"],
    aliases: ["admin consumer", "gestione saloni admin", "piano da admin"],
    example: "@admin-consumer c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/AdminConsumersPage.tsx",
      "velvet-frontend/src/pages/admin/AdminConsumerClientsSection.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/admin/api/SuperAdminConsumerController.java",
      "velvet/src/main/java/it/velvet/admin/service/SuperAdminConsumerManagementService.java",
      "velvet/src/main/java/it/velvet/admin/service/SuperAdminOverviewActionsService.java",
    ],
    tests: [],
  },
  {
    tag: "admin-assistenza",
    label: "Inbox assistenza admin",
    surfaces: ["/admin/assistenza", "/admin/messaggi"],
    aliases: ["admin assistenza", "messaggi admin"],
    example: "@admin-assistenza c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/AdminAssistenzaPage.tsx",
      "velvet-frontend/src/pages/admin/adminSupportInboxApi.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/admin/api/SuperAdminOverviewController.java"],
    tests: [],
  },
  {
    tag: "admin-profilo",
    label: "Profilo super-admin",
    surfaces: ["/admin/profilo"],
    aliases: ["admin profilo"],
    example: "@admin-profilo c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/AdminSuperAdminProfilePage.tsx",
      "velvet-frontend/src/pages/admin/AdminSuperAdminProfileSection.tsx",
    ],
    backend: ["velvet/src/main/java/it/velvet/admin/api/SuperAdminStatusController.java"],
    tests: [],
  },
  {
    tag: "admin-auth",
    label: "Login super-admin",
    surfaces: ["/account", "/admin"],
    aliases: ["admin login", "accesso admin"],
    example: "@admin-auth c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/auth/AdminAuthProvider.tsx",
      "velvet-frontend/src/auth/VelvetAuthProvider.tsx",
      "velvet-frontend/src/components/AdminProtectedRoute.tsx",
      "velvet-frontend/src/components/ProtectedRoute.tsx",
    ],
    backend: ["velvet/src/main/java/it/velvet/admin/api/VelvetSuperAdminAuthController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=VelvetSuperAdminAuthServiceTest"],
  },
  {
    tag: "admin-register",
    label: "Registrazione super-admin",
    surfaces: ["/admin/register"],
    aliases: ["registrazione admin"],
    example: "@admin-register c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/admin/AdminRegisterSuperAdminPage.tsx"],
    backend: ["velvet/src/main/java/it/velvet/admin/api/VelvetSuperAdminAuthController.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=VelvetSuperAdminAuthServiceTest"],
  },
  {
    tag: "idee",
    label: "Idee mensili / verticali",
    surfaces: ["/idee/:groupId/:itemId"],
    aliases: ["idee", "trend", "verticali", "ispirazioni"],
    example: "@idee c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/MonthlyIdeaPage.tsx", "velvet-frontend/src/data/trendingIdeas.ts"],
    backend: [],
    tests: ["cd velvet && ./mvnw -q test -Dtest=SalonIdeaVerticalTest"],
  },
  {
    tag: "api",
    label: "Errori HTTP / client API",
    surfaces: ["tutta l'app"],
    aliases: ["api", "fetch", "401", "403", "500", "errore http"],
    example: "@api c'è un bug, controlla",
    frontend: ["velvet-frontend/src/api/client.ts", "velvet-frontend/src/api/httpApiErrorMessage.ts"],
    backend: ["velvet/src/main/java/it/velvet/common/api/GlobalExceptionHandler.java"],
    tests: [],
  },
  {
    tag: "dev",
    label: "Utility sviluppo (seed, mappa bug)",
    surfaces: ["/dev/seed-salone-showcase", "/dev/bug-map"],
    aliases: ["dev", "seed salone", "bug map", "showcase dev"],
    example: "@dev c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/dev/DevSeedSalonShowcasePage.tsx",
      "velvet-frontend/src/pages/dev/BugMapPage.tsx",
      "velvet-frontend/src/lib/devSeedRandomSalonImages.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/bootstrap/VelvetDemoDataLoader.java"],
    tests: [],
  },
  {
    tag: "storage-vetrina",
    label: "Persistenza vetrina / pagina personale",
    surfaces: ["/s/:slug", "/account/salone/brand", "/account/salone/tuo-salone"],
    aliases: ["storage", "idb", "localstorage vetrina", "showcase storage"],
    example: "@storage-vetrina c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/lib/salonShowcaseStorage.ts",
      "velvet-frontend/src/lib/salonShowcaseIdb.ts",
      "velvet-frontend/src/lib/salonPersonalPageStorage.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "tipologie-salone",
    label: "Tipologie attività e pubblico clienti",
    surfaces: ["/piani", "/account/profilo", "/search"],
    aliases: ["tipologie", "business type", "pubblico clienti", "hair beauty", "sesso cliente"],
    example: "@tipologie-salone c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/data/salonBusinessTypes.ts",
      "velvet-frontend/src/data/salonClientGenders.ts",
      "velvet-frontend/src/lib/formatSalonClientAudience.ts",
      "velvet-frontend/src/data/quickSuggestGroups.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/publicapi/validation/ConsumerRegistrationValidator.java"],
    tests: [],
  },
  {
    tag: "ruoli",
    label: "Ruoli JWT, allineamento titolare/staff",
    surfaces: ["/account", "/auth/callback"],
    aliases: ["ruoli", "realm roles", "owner staff", "permessi ruolo"],
    example: "@ruoli c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/lib/realmRolesFromAccessToken.ts",
      "velvet-frontend/src/lib/velvetJwtHintsFromAccessToken.ts",
      "velvet-frontend/src/auth/VelvetAuthProvider.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/service/SalonOwnerRoleAlignmentService.java",
      "velvet/src/main/java/it/velvet/security/auth/VelvetTokenService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=SalonOwnerRoleAlignmentServiceTest,SalonOwnerProfileRolesTest"],
  },
  {
    tag: "config",
    label: "Configurazione app e URL API",
    surfaces: ["bootstrap frontend"],
    aliases: ["config", "env", "vite env", "api base url"],
    example: "@config c'è un bug, controlla",
    frontend: ["velvet-frontend/src/config/env.ts", "velvet-frontend/src/providers/AppProviders.tsx", "velvet-frontend/src/main.tsx"],
    backend: [],
    tests: ["cd velvet-frontend && npm run build"],
  },
  {
    tag: "redirect",
    label: "Redirect post-login e indice account",
    surfaces: ["/account", "/account/salone/layout"],
    aliases: ["redirect", "navigate", "post login", "indice account"],
    example: "@redirect c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/App.tsx",
      "velvet-frontend/src/lib/postLoginReturnPath.ts",
      "velvet-frontend/src/lib/velvetPostConsumerSessionPath.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "pannello-legale",
    label: "Pannelli legali embedded",
    surfaces: ["/legale", "/privacy", "/privacy/clienti", "/privacy/staff", "/termini"],
    aliases: ["pannello legale", "legal panel", "documento embedded"],
    example: "@pannello-legale c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/hooks/useVelvetEmbeddedPanel.ts",
      "velvet-frontend/src/content/velvetLegalPanelPaths.ts",
      "velvet-frontend/src/pages/legal/LegalDocumentLayout.tsx",
      "velvet-frontend/src/components/LegalSiteFootnote.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "admin-layout",
    label: "Layout e navigazione admin",
    surfaces: ["/admin", "/admin/dashboard"],
    aliases: ["admin layout", "menu admin"],
    example: "@admin-layout c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/AdminLayout.tsx",
      "velvet-frontend/src/pages/admin/AdminHScroll.tsx",
      "velvet-frontend/src/components/AdminProtectedRoute.tsx",
    ],
    backend: ["velvet/src/main/java/it/velvet/admin/api/SuperAdminStatusController.java"],
    tests: [],
  },
  {
    tag: "catalogo-backend",
    label: "Catalogo servizi lato server",
    surfaces: ["/account/salone/servizi"],
    aliases: ["catalogo backend", "me salon catalog", "salon service entity"],
    example: "@catalogo-backend c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonServicesPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/studio/service/MeSalonCatalogService.java",
      "velvet/src/main/java/it/velvet/catalog/domain/SalonService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeSalonServicesControllerTest"],
  },
  {
    tag: "token-prenotazione",
    label: "Link email prenotazione (area account)",
    surfaces: ["/account/prenotazioni/:id", "/s/:slug"],
    aliases: ["link prenotazione", "email prenotazione", "cta email booking"],
    example: "@token-prenotazione c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/AppointmentDetailPage.tsx",
      "velvet-frontend/src/pages/account/AppointmentsPage.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/notification/service/ScheduledNotificationProcessor.java",
      "velvet/src/main/java/it/velvet/notification/service/TransactionalBookingEmailHtml.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=TransactionalBookingEmailHtmlTest,ScheduledNotificationProcessorTest"],
  },
  {
    tag: "riepilogo-giorno",
    label: "Riepilogo giornata staff",
    surfaces: ["/account/prenotazioni/staff/:staffId/agenda", "/account/staff"],
    aliases: ["riepilogo giorno", "day summary", "sintesi giornaliera"],
    example: "@riepilogo-giorno c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/staff/api/DaySummaryStaffController.java",
      "velvet/src/main/java/it/velvet/appointment/service/DaySummaryService.java",
    ],
    tests: [],
  },
  {
    tag: "provisioning",
    label: "Provisioning salone, slug, repair",
    surfaces: ["/piani", "/account/salone"],
    aliases: ["provisioning", "slug salone", "orphan repair", "directory salone"],
    example: "@provisioning c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/SalonPlansPage.tsx"],
    backend: [
      "velvet/src/main/java/it/velvet/studio/service/SalonDirectoryProvisioningService.java",
      "velvet/src/main/java/it/velvet/studio/service/MeSalonOwnerOrphanRepairService.java",
      "velvet/src/main/java/it/velvet/consumer/service/VelvetAccountRegistrationService.java",
    ],
    tests: [
      "cd velvet && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest,ConsumerRegistrationConflictRepairIntegrationTest,SalonDirectoryProvisioningServiceSlugifyTest",
    ],
  },
  {
    tag: "bootstrap",
    label: "Bootstrap dati demo e allineamento schema",
    surfaces: ["avvio backend"],
    aliases: ["bootstrap", "demo data", "schema alignment", "backfill"],
    example: "@bootstrap c'è un bug, controlla",
    frontend: [],
    backend: [
      "velvet/src/main/java/it/velvet/bootstrap/VelvetDemoDataLoader.java",
      "velvet/src/main/java/it/velvet/bootstrap/SalonLocationCoordinatesBackfillRunner.java",
      "velvet/src/main/java/it/velvet/bootstrap/StudioGroupSchemaAlignmentRunner.java",
    ],
    tests: [],
  },
  {
    tag: "inviti-recensione",
    label: "Inviti e storico recensioni",
    surfaces: ["/recensione", "/account/notifiche"],
    aliases: ["invito recensione", "pending review", "storico recensioni"],
    example: "@inviti-recensione c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/hooks/useMePendingReviewInvites.ts",
      "velvet-frontend/src/hooks/useMeReviewHistory.ts",
      "velvet-frontend/src/lib/salonReviewNotifications.ts",
      "velvet-frontend/src/components/StarRatingInput.tsx",
      "velvet-frontend/src/components/StarRatingDisplay.tsx",
    ],
    backend: [
      "velvet/src/main/java/it/velvet/consumer/service/MeReviewHistoryService.java",
      "velvet/src/main/java/it/velvet/review/service/ReviewShowcaseService.java",
    ],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeReviewsIntegrationTest,MeReviewsEndpointsSecurityTest"],
  },
  {
    tag: "layout-catalogo",
    label: "Catalogo layout e wireframe",
    surfaces: ["/account/salone/brand", "/account/salone/brand/anteprima-layout"],
    aliases: ["catalogo layout", "wireframe", "standard layout", "stili testo"],
    example: "@layout-catalogo c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/salon/SalonLayoutCatalogPage.tsx",
      "velvet-frontend/src/data/standardLayoutCatalog.ts",
      "velvet-frontend/src/data/writingStyleCatalog.ts",
      "velvet-frontend/src/data/previewAnimatedBackgrounds.ts",
      "velvet-frontend/src/components/salon/StandardLayoutWireframe.tsx",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "brand-sidebar",
    label: "Sidebar brand e ambientazione layout",
    surfaces: ["/account/salone/brand"],
    aliases: ["sidebar brand", "ambient sidebar", "layout sidebar"],
    example: "@brand-sidebar c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/components/salon/SalonBrandAmbientSidebar.tsx",
      "velvet-frontend/src/components/salon/SalonBrandLayoutSidebar.tsx",
      "velvet-frontend/src/lib/showcaseLayoutThemeClass.ts",
    ],
    backend: [],
    tests: [],
  },
  {
    tag: "supporto-inbox",
    label: "Parsing inbox assistenza admin",
    surfaces: ["/admin/assistenza", "/admin/messaggi"],
    aliases: ["inbox admin", "parse supporto", "messaggi supporto"],
    example: "@supporto-inbox c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/admin/supportInboxParse.ts",
      "velvet-frontend/src/pages/admin/adminSupportInboxApi.ts",
    ],
    backend: ["velvet/src/main/java/it/velvet/admin/service/SuperAdminSupportInboxService.java"],
    tests: [],
  },
  {
    tag: "scelta-staff-prenotazioni",
    label: "Scelta operatore prima dell'agenda",
    surfaces: ["/account/prenotazioni"],
    aliases: ["scelta staff", "pick staff", "staff pick prenotazioni"],
    example: "@scelta-staff-prenotazioni c'è un bug, controlla",
    frontend: [
      "velvet-frontend/src/pages/account/PrenotazioniStaffPickPage.tsx",
      "velvet-frontend/src/pages/account/AppointmentsPage.tsx",
    ],
    backend: ["velvet/src/main/java/it/velvet/consumer/api/MeAppointmentsController.java"],
    tests: [],
  },
  {
    tag: "profilo-consumer",
    label: "Profilo consumer e account chiuso",
    surfaces: ["/account/profilo"],
    aliases: ["profilo consumer", "consumer profile", "account chiuso"],
    example: "@profilo-consumer c'è un bug, controlla",
    frontend: ["velvet-frontend/src/pages/account/AccountConsumerHomePage.tsx", "velvet-frontend/src/hooks/useMeProfile.ts"],
    backend: ["velvet/src/main/java/it/velvet/consumer/service/ConsumerProfileService.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=MeProfileControllerTest,MeAccountControllerTest"],
  },
  {
    tag: "smoke",
    label: "Smoke test endpoint pubblici",
    surfaces: ["API pubbliche"],
    aliases: ["smoke", "endpoint pubblici", "regressione api"],
    example: "@smoke c'è un bug, controlla",
    frontend: [],
    backend: ["velvet/src/test/java/it/velvet/publicapi/api/VelvetPublicEndpointsSmokeTest.java"],
    tests: ["cd velvet && ./mvnw -q test -Dtest=VelvetPublicEndpointsSmokeTest"],
  },
];

const BUG_AREA_BY_TAG = new Map(BUG_AREA_MAP.map((entry) => [entry.tag, entry]));

function normalizeRoute(route: string): string {
  const trimmed = route.trim().toLowerCase();
  if (!trimmed) return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "") || "/";
}

function surfaceMatchesPath(surface: string, path: string): boolean {
  const normalizedPath = normalizeRoute(path);
  const normalizedSurface = surface.trim().toLowerCase();
  if (!normalizedSurface.startsWith("/")) return false;
  if (normalizedSurface === normalizedPath) return true;
  if (normalizedSurface.endsWith("*")) {
    const prefix = normalizedSurface.slice(0, -1);
    return normalizedPath === prefix || normalizedPath.startsWith(prefix);
  }
  if (normalizedSurface.includes(":")) {
    const pattern = `^${normalizedSurface.replace(/:[^/]+/g, "[^/]+")}$`;
    return new RegExp(pattern).test(normalizedPath);
  }
  return normalizedPath.startsWith(`${normalizedSurface}/`);
}

function collectRouteSignals(text: string): string[] {
  const routes = new Set<string>();
  for (const match of text.matchAll(/(?:^|\s)(\/[a-z0-9/_:-]+)/gi)) {
    const route = match[1]?.split(/[?#]/, 1)[0];
    if (route) routes.add(normalizeRoute(route));
  }
  return [...routes];
}

function collectTagSignals(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/@([a-z0-9-]+)/gi)) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

function collectAliasSignals(text: string): string[] {
  const normalized = text.toLowerCase();
  const matches: Array<{ tag: string; score: number }> = [];
  for (const entry of BUG_AREA_MAP) {
    let score = 0;
    if (normalized.includes(entry.tag)) score += entry.tag.length + 4;
    for (const alias of entry.aliases) {
      const token = alias.toLowerCase();
      if (token.length < 3) continue;
      if (normalized.includes(token)) score += token.length;
    }
    if (score > 0) matches.push({ tag: entry.tag, score });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.map((match) => match.tag);
}

function appendUnique(out: BugAreaMapEntry[], seen: Set<string>, entry: BugAreaMapEntry | undefined) {
  if (!entry || seen.has(entry.tag)) return;
  seen.add(entry.tag);
  out.push(entry);
}

export function findBugAreaByTag(raw: string): BugAreaMapEntry | undefined {
  const tag = raw.trim().replace(/^@/, "").toLowerCase();
  return BUG_AREA_BY_TAG.get(tag);
}

export function findBugAreasBySurface(rawPath: string): BugAreaMapEntry[] {
  const path = normalizeRoute(rawPath);
  return BUG_AREA_MAP.filter((entry) => entry.surfaces.some((surface) => surfaceMatchesPath(surface, path)));
}

export function resolveBugAreasFromText(text: string): BugAreaMapEntry[] {
  const resolved: BugAreaMapEntry[] = [];
  const seen = new Set<string>();

  for (const tag of collectTagSignals(text)) {
    appendUnique(resolved, seen, findBugAreaByTag(tag));
  }

  for (const route of collectRouteSignals(text)) {
    for (const entry of findBugAreasBySurface(route)) {
      appendUnique(resolved, seen, entry);
    }
  }

  for (const tag of collectAliasSignals(text)) {
    appendUnique(resolved, seen, findBugAreaByTag(tag));
  }

  return resolved;
}

export function listBugAreaTags(): string[] {
  return BUG_AREA_MAP.map((entry) => entry.tag);
}

export function formatBugAreaSummary(entry: BugAreaMapEntry): string {
  return `@${entry.tag} · ${entry.label} · ${entry.surfaces.join(", ")}`;
}

/** Campioni route da App.tsx per controllo copertura mappa bug. */
export const CANONICAL_APP_ROUTE_SAMPLES = [
  "/",
  "/partner",
  "/registrati",
  "/piani",
  "/search",
  "/idee/hair/taglio",
  "/s/demo-salone",
  "/s/demo-salone/esplora",
  "/s/demo-salone/il-tuo-salone",
  "/dev/bug-map",
  "/dev/seed-salone-showcase",
  "/recensione",
  "/privacy",
  "/privacy/clienti",
  "/privacy/staff",
  "/privacy/cookie",
  "/privacy/scelte",
  "/privacy/elimina-account",
  "/termini",
  "/legale",
  "/auth/callback",
  "/reimposta-password",
  "/admin/register",
  "/admin",
  "/admin/dashboard",
  "/admin/assistenza",
  "/admin/messaggi",
  "/admin/profilo",
  "/account",
  "/account/home",
  "/account/staff",
  "/account/salone",
  "/account/salone/servizi",
  "/account/salone/staff",
  "/account/salone/clienti",
  "/account/salone/brand",
  "/account/salone/brand/anteprima-layout",
  "/account/salone/tuo-salone",
  "/account/salone/layout",
  "/account/salone/strumenti",
  "/account/salone/statistiche",
  "/account/salone/posizione",
  "/account/prenotazioni",
  "/account/prenotazioni/demo-id",
  "/account/prenotazioni/staff/demo-staff/agenda",
  "/account/profilo",
  "/account/notifiche",
  "/account/preferiti",
  "/account/saloni-di-fiducia",
  "/account/assistenza",
  "/account/info-privacy",
  "/account/chat",
  "/account/feedback-velvet",
] as const;

export function listUnmappedAppRoutes(): string[] {
  return CANONICAL_APP_ROUTE_SAMPLES.filter((route) => findBugAreasBySurface(route).length === 0);
}
