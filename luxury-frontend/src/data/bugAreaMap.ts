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
      "luxury-frontend/src/pages/SalonPlansPage.tsx",
      "luxury-frontend/src/pages/ClientSignupPage.tsx",
      "luxury-frontend/src/api/registerConsumer.ts",
      "luxury-frontend/src/api/registerClient.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/publicapi/api/PublicConsumerRegistrationController.java",
      "luxury/src/main/java/it/luxury/publicapi/api/PublicClientRegistrationController.java",
      "luxury/src/main/java/it/luxury/publicapi/validation/ConsumerRegistrationValidator.java",
    ],
    tests: [
      "cd luxury && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest,ClientRegistrationIntegrationTest",
    ],
  },
  {
    tag: "piani",
    label: "Registrazione titolare / piani salone",
    surfaces: ["/piani"],
    aliases: ["piani", "piano salone", "abbonamento", "premium signup", "base signup"],
    example: "@piani c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/SalonPlansPage.tsx",
      "luxury-frontend/src/data/salonPlans.ts",
      "luxury-frontend/src/api/registerConsumer.ts",
      "luxury-frontend/src/components/salon/SalonPremiumPlanCardPreview.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/publicapi/api/PublicConsumerRegistrationController.java",
      "luxury/src/main/java/it/luxury/publicapi/validation/ConsumerRegistrationValidator.java",
      "luxury/src/main/java/it/luxury/studio/service/SalonDirectoryProvisioningService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest"],
  },
  {
    tag: "registrati",
    label: "Registrazione cliente finale",
    surfaces: ["/registrati"],
    aliases: ["registrati", "cliente finale", "signup cliente"],
    example: "@registrati c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/ClientSignupPage.tsx", "luxury-frontend/src/api/registerClient.ts"],
    backend: ["luxury/src/main/java/it/luxury/publicapi/api/PublicClientRegistrationController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=ClientRegistrationIntegrationTest,PublicClientRegistrationControllerTest"],
  },
  {
    tag: "auth",
    label: "Login, callback auth, sessione",
    surfaces: ["/auth/callback", "/account"],
    aliases: ["auth", "login", "logout", "sessione", "token", "jwt"],
    example: "@auth c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/auth/LuxuryAuthProvider.tsx",
      "luxury-frontend/src/components/ProtectedRoute.tsx",
      "luxury-frontend/src/pages/AuthCallbackRedirectPage.tsx",
      "luxury-frontend/src/api/accountClosedSession.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/security/api/LuxuryAuthController.java",
      "luxury/src/main/java/it/luxury/consumer/api/MeAccountController.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeAccountControllerTest"],
  },
  {
    tag: "password",
    label: "Reimposta password",
    surfaces: ["/reimposta-password"],
    aliases: ["password", "reimposta password", "reset password"],
    example: "@password c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/PasswordResetPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/security/api/LuxuryAuthController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=LuxuryPasswordResetIntegrationTest"],
  },
  {
    tag: "home",
    label: "Home pubblica",
    surfaces: ["/"],
    aliases: ["home", "landing", "homepage"],
    example: "@home c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/HomePage.tsx", "luxury-frontend/src/styles/luxury-home.css"],
    backend: [],
    tests: ["cd luxury-frontend && npm run build"],
  },
  {
    tag: "partner",
    label: "Pagina partner",
    surfaces: ["/partner"],
    aliases: ["partner"],
    example: "@partner c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/PartnerPage.tsx"],
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
      "luxury-frontend/src/layout/RootLayout.tsx",
      "luxury-frontend/src/components/AppHeader.tsx",
      "luxury-frontend/src/components/AppFooter.tsx",
      "luxury-frontend/src/components/CookieConsentBanner.tsx",
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
      "luxury-frontend/src/pages/SearchPage.tsx",
      "luxury-frontend/src/styles/luxury-search-page.css",
      "luxury-frontend/src/components/SearchHitLogoAvatar.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/publicapi/api/PublicOrganizationController.java",
      "luxury/src/main/java/it/luxury/studio/service/PublicOrganizationService.java",
    ],
    tests: [
      "cd luxury && ./mvnw -q test -Dtest=PublicOrganizationServiceGeoSearchTest,SalonQuickSearchCatalogHintsTest",
    ],
  },
  {
    tag: "geocoding",
    label: "CAP, indirizzo, coordinate sede",
    surfaces: ["/search", "/account/salone/posizione", "/account/profilo"],
    aliases: ["geocoding", "cap", "indirizzo", "coordinate", "localizza", "locate"],
    example: "@geocoding c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/api/locate.ts",
      "luxury-frontend/src/pages/account/salon/SalonLocationPage.tsx",
      "luxury-frontend/src/components/salon/SalonLocationMapCard.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/publicapi/api/PublicLocateController.java",
      "luxury/src/main/java/it/luxury/studio/service/SalonLocationGeocodingService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=SalonLocationGeocodingServiceTest"],
  },
  {
    tag: "vetrina",
    label: "Scheda pubblica salone",
    surfaces: ["/s/:slug"],
    aliases: ["vetrina", "scheda salone", "mini sito", "slug"],
    example: "@vetrina c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/SalonPage.tsx",
      "luxury-frontend/src/components/salon/SalonPublicShowcase.tsx",
      "luxury-frontend/src/lib/salonShowcaseStorage.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "esplora",
    label: "Pagina Esplora il salone",
    surfaces: ["/s/:slug/esplora"],
    aliases: ["esplora", "esplora salone"],
    example: "@esplora c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/SalonExplorePage.tsx", "luxury-frontend/src/lib/salonPersonalPageStorage.ts"],
    backend: ["luxury/src/main/java/it/luxury/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "sito-salone",
    label: "Pagina Il tuo salone (pubblica)",
    surfaces: ["/s/:slug/il-tuo-salone"],
    aliases: ["il tuo salone", "sito salone", "pagina personale"],
    example: "@sito-salone c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/SalonPersonalPage.tsx", "luxury-frontend/src/lib/salonPersonalPageStorage.ts"],
    backend: ["luxury/src/main/java/it/luxury/publicapi/api/PublicOrganizationController.java"],
    tests: [],
  },
  {
    tag: "disponibilita",
    label: "Slot e disponibilità prenotazione pubblica",
    surfaces: ["/s/:slug"],
    aliases: ["disponibilità", "slot", "agenda pubblica", "availability"],
    example: "@disponibilita c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/SalonPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/publicapi/api/PublicOrganizationController.java",
      "luxury/src/main/java/it/luxury/appointment/service/AvailabilityService.java",
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
      "luxury-frontend/src/hooks/useEffectiveSalonPlanTier.ts",
      "luxury-frontend/src/pages/account/salon/SalonStandardSectionGuard.tsx",
      "luxury-frontend/src/data/salonPlans.ts",
      "luxury-frontend/src/pages/account/AccountHubNavPremiumSalonLinks.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/studio/domain/StudioGroup.java",
      "luxury/src/main/java/it/luxury/studio/service/MeSalonSummaryService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonControllerTest"],
  },
  {
    tag: "panorama",
    label: "Hub / checklist Premium",
    surfaces: ["/account/salone"],
    aliases: ["panorama", "checklist", "hub premium"],
    example: "@panorama c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/components/salon/SalonPremiumPanorama.tsx",
      "luxury-frontend/src/data/salonPremiumPanoramaContent.ts",
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
    frontend: ["luxury-frontend/src/pages/account/salon/SalonBrandPage.tsx", "luxury-frontend/src/lib/salonShowcaseStorage.ts"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeSalonController.java"],
    tests: [],
  },
  {
    tag: "layout",
    label: "Anteprima layout vetrina",
    surfaces: ["/account/salone/brand/anteprima-layout", "/account/salone/layout"],
    aliases: ["layout", "anteprima layout", "catalogo layout"],
    example: "@layout c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/salon/SalonBrandLayoutPreviewPage.tsx",
      "luxury-frontend/src/components/salon/SalonCustomLayoutShowcase.tsx",
      "luxury-frontend/src/pages/account/salon/SalonLayoutCatalogPage.tsx",
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
      "luxury-frontend/src/pages/account/salon/SalonPersonalPageBuilder.tsx",
      "luxury-frontend/src/lib/salonPersonalPageStorage.ts",
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
      "luxury-frontend/src/pages/account/salon/SalonStatisticsPage.tsx",
      "luxury-frontend/src/lib/salonStatisticsMetrics.ts",
      "luxury-frontend/src/lib/salonStatsDerived.ts",
      "luxury-frontend/src/lib/salonSemesterAccountantPdf.ts",
    ],
    backend: [],
    tests: ["cd luxury-frontend && npm test -- salonStatsDerived salonStatisticsMetrics"],
  },
  {
    tag: "posizione",
    label: "Posizione sede salone",
    surfaces: ["/account/salone/posizione"],
    aliases: ["posizione", "sede", "mappa salone"],
    example: "@posizione c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonLocationPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/studio/service/SalonLocationGeocodingService.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=SalonLocationGeocodingServiceTest"],
  },
  {
    tag: "strumenti",
    label: "Strumenti standard salone",
    surfaces: ["/account/salone/strumenti"],
    aliases: ["strumenti", "tools salone"],
    example: "@strumenti c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonStandardToolsPage.tsx"],
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
      "luxury-frontend/src/pages/account/AccountSalonHomePage.tsx",
      "luxury-frontend/src/hooks/useMeSalonSummary.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeSalonController.java",
      "luxury/src/main/java/it/luxury/studio/service/MeSalonSummaryService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonControllerTest"],
  },
  {
    tag: "home-titolare",
    label: "Redirect legacy /account/home → salone",
    surfaces: ["/account/home"],
    aliases: ["home titolare", "dashboard titolare"],
    example: "@home-titolare c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/AccountHomePage.tsx"],
    backend: [],
    tests: [],
  },
  {
    tag: "servizi",
    label: "Catalogo servizi salone",
    surfaces: ["/account/salone/servizi"],
    aliases: ["servizi", "catalogo servizi", "listino"],
    example: "@servizi c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonServicesPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeSalonServicesController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonServicesControllerTest"],
  },
  {
    tag: "staff",
    label: "Operatori salone",
    surfaces: ["/account/salone/staff", "/account/staff"],
    aliases: ["staff", "operatori", "team"],
    example: "@staff c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/salon/SalonStaffPage.tsx",
      "luxury-frontend/src/pages/account/StaffMemberHomePage.tsx",
      "luxury-frontend/src/hooks/useSalonStaffList.ts",
      "luxury-frontend/src/hooks/useMeStaffSalon.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeSalonController.java",
      "luxury/src/main/java/it/luxury/consumer/api/MeStaffController.java",
      "luxury/src/main/java/it/luxury/studio/service/MeStaffContextService.java",
    ],
    tests: [],
  },
  {
    tag: "staff-api",
    label: "API operative staff (agenda, catalogo, clienti)",
    surfaces: ["/account/staff", "/account/prenotazioni/staff/:staffId/agenda"],
    aliases: ["api staff", "agenda staff api", "catalogo staff"],
    example: "@staff-api c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/staff/api/AppointmentStaffController.java",
      "luxury/src/main/java/it/luxury/staff/api/DaySummaryStaffController.java",
      "luxury/src/main/java/it/luxury/staff/api/SalonCatalogStaffController.java",
      "luxury/src/main/java/it/luxury/staff/api/SalonClientStaffController.java",
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
      "luxury-frontend/src/pages/account/salon/SalonClientsPage.tsx",
      "luxury-frontend/src/lib/salonCatalogClientsSync.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeSalonClientsController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonClientsControllerTest"],
  },
  {
    tag: "chat",
    label: "Chat Saloni Luxury",
    surfaces: ["/account/chat"],
    aliases: ["chat", "messaggi salone", "inbox chat"],
    example: "@chat c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/SalonLuxuryChatPage.tsx",
      "luxury-frontend/src/hooks/useMeSalonChatUnread.ts",
      "luxury-frontend/src/lib/salonChatInbox404.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/consumer/service/SalonLuxuryChatService.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonClientsControllerTest"],
  },
  {
    tag: "notifiche",
    label: "Notifiche account / salone",
    surfaces: ["/account/notifiche"],
    aliases: ["notifiche", "inbox", "avvisi"],
    example: "@notifiche c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/NotificationsPage.tsx",
      "luxury-frontend/src/hooks/useMeNotificationInbox.ts",
      "luxury-frontend/src/hooks/useMeSalonNotificationInbox.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeNotificationsController.java",
      "luxury/src/main/java/it/luxury/studio/service/MeSalonNotificationInboxService.java",
      "luxury/src/main/java/it/luxury/notification/service/AppointmentNotificationService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=AppointmentNotificationServiceTest,ScheduledNotificationProcessorTest"],
  },
  {
    tag: "prenotazioni",
    label: "Prenotazioni account",
    surfaces: ["/account/prenotazioni"],
    aliases: ["prenotazioni", "appuntamenti", "booking"],
    example: "@prenotazioni c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/AppointmentsPage.tsx",
      "luxury-frontend/src/components/PendingBookingResume.tsx",
      "luxury-frontend/src/pages/account/PrenotazioniStaffPickPage.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeAppointmentsController.java",
      "luxury/src/main/java/it/luxury/studio/service/MeSalonAppointmentsService.java",
      "luxury/src/main/java/it/luxury/appointment/service/AppointmentBookingService.java",
    ],
    tests: [],
  },
  {
    tag: "prenotazione-dettaglio",
    label: "Dettaglio singola prenotazione",
    surfaces: ["/account/prenotazioni/:id"],
    aliases: ["dettaglio prenotazione", "appuntamento dettaglio"],
    example: "@prenotazione-dettaglio c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/AppointmentDetailPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeAppointmentsController.java"],
    tests: [],
  },
  {
    tag: "agenda",
    label: "Agenda operatore / board",
    surfaces: ["/account/prenotazioni/staff/:staffId/agenda"],
    aliases: ["agenda", "calendario", "board agenda"],
    example: "@agenda c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx",
      "luxury-frontend/src/pages/account/SalonAgendaBoard.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/studio/service/MeStaffAgendaService.java",
      "luxury/src/main/java/it/luxury/staff/api/AppointmentStaffController.java",
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
      "luxury-frontend/src/pages/ReviewPage.tsx",
      "luxury-frontend/src/components/salon/SalonPublicReviewsBlock.tsx",
      "luxury-frontend/src/hooks/useMeSalonReviews.ts",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeReviewsController.java",
      "luxury/src/main/java/it/luxury/publicapi/api/PublicReviewController.java",
      "luxury/src/main/java/it/luxury/review/service/ReviewCommandService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeReviewsIntegrationTest,MeReviewsEndpointsSecurityTest"],
  },
  {
    tag: "preferiti",
    label: "Preferiti cliente",
    surfaces: ["/account/preferiti"],
    aliases: ["preferiti", "favorites"],
    example: "@preferiti c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/FavoritesPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeFavoritesController.java",
      "luxury/src/main/java/it/luxury/consumer/service/FavoriteLocationService.java",
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
      "luxury-frontend/src/pages/account/TrustedSalonsPage.tsx",
      "luxury-frontend/src/lib/trustedSalonsNavBadge.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/consumer/service/SalonClientMembershipService.java"],
    tests: [],
  },
  {
    tag: "profilo",
    label: "Profilo account",
    surfaces: ["/account/profilo"],
    aliases: ["profilo", "anagrafica account", "dati personali"],
    example: "@profilo c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/ProfilePage.tsx", "luxury-frontend/src/hooks/useMeProfile.ts"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeProfileController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeProfileControllerTest"],
  },
  {
    tag: "account",
    label: "Layout e navigazione account",
    surfaces: ["/account"],
    aliases: ["account", "menu account", "hub account"],
    example: "@account c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/AccountLayout.tsx",
      "luxury-frontend/src/pages/account/AccountHubNavOwnerConsumerLinks.tsx",
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
      "luxury-frontend/src/pages/account/AccountInfoPrivacyPage.tsx",
      "luxury-frontend/src/pages/account/SalonPremiumOwnerInfoPrivacyContent.tsx",
      "luxury-frontend/src/components/salon/SalonPremiumOwnerInfoPrivacyModal.tsx",
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
      "luxury-frontend/src/pages/legal/",
      "luxury-frontend/src/content/legalSharedCopy.ts",
      "luxury-frontend/src/content/legalEntity.ts",
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
      "luxury-frontend/src/components/CookieConsentBanner.tsx",
      "luxury-frontend/src/pages/legal/CookiePolicyPage.tsx",
      "luxury-frontend/src/pages/legal/PrivacyChoicesPage.tsx",
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
    frontend: ["luxury-frontend/src/pages/legal/AccountDeletionPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeAccountController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeAccountControllerTest"],
  },
  {
    tag: "assistenza",
    label: "Assistenza account",
    surfaces: ["/account/assistenza"],
    aliases: ["assistenza", "supporto", "ticket"],
    example: "@assistenza c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/SupportPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeSupportController.java"],
    tests: [],
  },
  {
    tag: "feedback",
    label: "Feedback piattaforma",
    surfaces: ["/account/feedback-luxury"],
    aliases: ["feedback", "suggerimenti"],
    example: "@feedback c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/LuxuryFeedbackPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/review/service/PlatformReviewCommandService.java"],
    tests: [],
  },
  {
    tag: "export",
    label: "Export dati personali",
    surfaces: ["/account/info-privacy", "/account/profilo"],
    aliases: ["export", "portabilità", "download dati"],
    example: "@export c'è un bug, controlla",
    frontend: ["luxury-frontend/src/api/meDataExport.ts"],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/api/MeDataExportController.java",
      "luxury/src/main/java/it/luxury/consumer/service/MePersonalDataExportService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeDataExportControllerTest"],
  },
  {
    tag: "admin",
    label: "Dashboard super-admin",
    surfaces: ["/admin", "/admin/dashboard"],
    aliases: ["admin", "super admin", "dashboard admin"],
    example: "@admin c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/admin/AdminDashboardPage.tsx",
      "luxury-frontend/src/pages/admin/AdminSalonPlanSection.tsx",
      "luxury-frontend/src/pages/admin/SuperAdminStatisticsSection.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/admin/api/SuperAdminOverviewController.java",
      "luxury/src/main/java/it/luxury/admin/service/SuperAdminOverviewService.java",
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
      "luxury-frontend/src/pages/admin/AdminConsumersPage.tsx",
      "luxury-frontend/src/pages/admin/AdminConsumerClientsSection.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/admin/api/SuperAdminConsumerController.java",
      "luxury/src/main/java/it/luxury/admin/service/SuperAdminConsumerManagementService.java",
      "luxury/src/main/java/it/luxury/admin/service/SuperAdminOverviewActionsService.java",
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
      "luxury-frontend/src/pages/admin/AdminAssistenzaPage.tsx",
      "luxury-frontend/src/pages/admin/adminSupportInboxApi.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/admin/api/SuperAdminOverviewController.java"],
    tests: [],
  },
  {
    tag: "admin-profilo",
    label: "Profilo super-admin",
    surfaces: ["/admin/profilo"],
    aliases: ["admin profilo"],
    example: "@admin-profilo c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/admin/AdminSuperAdminProfilePage.tsx",
      "luxury-frontend/src/pages/admin/AdminSuperAdminProfileSection.tsx",
    ],
    backend: ["luxury/src/main/java/it/luxury/admin/api/SuperAdminStatusController.java"],
    tests: [],
  },
  {
    tag: "admin-auth",
    label: "Login super-admin",
    surfaces: ["/account", "/admin"],
    aliases: ["admin login", "accesso admin"],
    example: "@admin-auth c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/auth/AdminAuthProvider.tsx",
      "luxury-frontend/src/auth/LuxuryAuthProvider.tsx",
      "luxury-frontend/src/components/AdminProtectedRoute.tsx",
      "luxury-frontend/src/components/ProtectedRoute.tsx",
    ],
    backend: ["luxury/src/main/java/it/luxury/admin/api/LuxurySuperAdminAuthController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=LuxurySuperAdminAuthServiceTest"],
  },
  {
    tag: "admin-register",
    label: "Registrazione super-admin",
    surfaces: ["/admin/register"],
    aliases: ["registrazione admin"],
    example: "@admin-register c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/admin/AdminRegisterSuperAdminPage.tsx"],
    backend: ["luxury/src/main/java/it/luxury/admin/api/LuxurySuperAdminAuthController.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=LuxurySuperAdminAuthServiceTest"],
  },
  {
    tag: "idee",
    label: "Idee mensili / verticali",
    surfaces: ["/idee/:groupId/:itemId"],
    aliases: ["idee", "trend", "verticali", "ispirazioni"],
    example: "@idee c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/MonthlyIdeaPage.tsx", "luxury-frontend/src/data/trendingIdeas.ts"],
    backend: [],
    tests: ["cd luxury && ./mvnw -q test -Dtest=SalonIdeaVerticalTest"],
  },
  {
    tag: "api",
    label: "Errori HTTP / client API",
    surfaces: ["tutta l'app"],
    aliases: ["api", "fetch", "401", "403", "500", "errore http"],
    example: "@api c'è un bug, controlla",
    frontend: ["luxury-frontend/src/api/client.ts", "luxury-frontend/src/api/httpApiErrorMessage.ts"],
    backend: ["luxury/src/main/java/it/luxury/common/api/GlobalExceptionHandler.java"],
    tests: [],
  },
  {
    tag: "dev",
    label: "Utility sviluppo (seed, mappa bug)",
    surfaces: ["/dev/seed-salone-showcase", "/dev/bug-map"],
    aliases: ["dev", "seed salone", "bug map", "showcase dev"],
    example: "@dev c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/dev/DevSeedSalonShowcasePage.tsx",
      "luxury-frontend/src/pages/dev/BugMapPage.tsx",
      "luxury-frontend/src/lib/devSeedRandomSalonImages.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/bootstrap/LuxuryDemoDataLoader.java"],
    tests: [],
  },
  {
    tag: "storage-vetrina",
    label: "Persistenza vetrina / pagina personale",
    surfaces: ["/s/:slug", "/account/salone/brand", "/account/salone/tuo-salone"],
    aliases: ["storage", "idb", "localstorage vetrina", "showcase storage"],
    example: "@storage-vetrina c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/lib/salonShowcaseStorage.ts",
      "luxury-frontend/src/lib/salonShowcaseIdb.ts",
      "luxury-frontend/src/lib/salonPersonalPageStorage.ts",
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
      "luxury-frontend/src/data/salonBusinessTypes.ts",
      "luxury-frontend/src/data/salonClientGenders.ts",
      "luxury-frontend/src/lib/formatSalonClientAudience.ts",
      "luxury-frontend/src/data/quickSuggestGroups.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/publicapi/validation/ConsumerRegistrationValidator.java"],
    tests: [],
  },
  {
    tag: "ruoli",
    label: "Ruoli JWT, allineamento titolare/staff",
    surfaces: ["/account", "/auth/callback"],
    aliases: ["ruoli", "realm roles", "owner staff", "permessi ruolo"],
    example: "@ruoli c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/lib/realmRolesFromAccessToken.ts",
      "luxury-frontend/src/lib/luxuryJwtHintsFromAccessToken.ts",
      "luxury-frontend/src/auth/LuxuryAuthProvider.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/service/SalonOwnerRoleAlignmentService.java",
      "luxury/src/main/java/it/luxury/security/auth/LuxuryTokenService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=SalonOwnerRoleAlignmentServiceTest,SalonOwnerProfileRolesTest"],
  },
  {
    tag: "config",
    label: "Configurazione app e URL API",
    surfaces: ["bootstrap frontend"],
    aliases: ["config", "env", "vite env", "api base url"],
    example: "@config c'è un bug, controlla",
    frontend: ["luxury-frontend/src/config/env.ts", "luxury-frontend/src/providers/AppProviders.tsx", "luxury-frontend/src/main.tsx"],
    backend: [],
    tests: ["cd luxury-frontend && npm run build"],
  },
  {
    tag: "redirect",
    label: "Redirect post-login e indice account",
    surfaces: ["/account", "/account/salone/layout"],
    aliases: ["redirect", "navigate", "post login", "indice account"],
    example: "@redirect c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/App.tsx",
      "luxury-frontend/src/lib/postLoginReturnPath.ts",
      "luxury-frontend/src/lib/luxuryPostConsumerSessionPath.ts",
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
      "luxury-frontend/src/hooks/useLuxuryEmbeddedPanel.ts",
      "luxury-frontend/src/content/luxuryLegalPanelPaths.ts",
      "luxury-frontend/src/pages/legal/LegalDocumentLayout.tsx",
      "luxury-frontend/src/components/LegalSiteFootnote.tsx",
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
      "luxury-frontend/src/pages/admin/AdminLayout.tsx",
      "luxury-frontend/src/pages/admin/AdminHScroll.tsx",
      "luxury-frontend/src/components/AdminProtectedRoute.tsx",
    ],
    backend: ["luxury/src/main/java/it/luxury/admin/api/SuperAdminStatusController.java"],
    tests: [],
  },
  {
    tag: "catalogo-backend",
    label: "Catalogo servizi lato server",
    surfaces: ["/account/salone/servizi"],
    aliases: ["catalogo backend", "me salon catalog", "salon service entity"],
    example: "@catalogo-backend c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonServicesPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/studio/service/MeSalonCatalogService.java",
      "luxury/src/main/java/it/luxury/catalog/domain/SalonService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeSalonServicesControllerTest"],
  },
  {
    tag: "token-prenotazione",
    label: "Link email prenotazione (area account)",
    surfaces: ["/account/prenotazioni/:id", "/s/:slug"],
    aliases: ["link prenotazione", "email prenotazione", "cta email booking"],
    example: "@token-prenotazione c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/AppointmentDetailPage.tsx",
      "luxury-frontend/src/pages/account/AppointmentsPage.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/notification/service/ScheduledNotificationProcessor.java",
      "luxury/src/main/java/it/luxury/notification/service/TransactionalBookingEmailHtml.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=TransactionalBookingEmailHtmlTest,ScheduledNotificationProcessorTest"],
  },
  {
    tag: "riepilogo-giorno",
    label: "Riepilogo giornata staff",
    surfaces: ["/account/prenotazioni/staff/:staffId/agenda", "/account/staff"],
    aliases: ["riepilogo giorno", "day summary", "sintesi giornaliera"],
    example: "@riepilogo-giorno c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/salon/SalonStaffAgendaPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/staff/api/DaySummaryStaffController.java",
      "luxury/src/main/java/it/luxury/appointment/service/DaySummaryService.java",
    ],
    tests: [],
  },
  {
    tag: "provisioning",
    label: "Provisioning salone, slug, repair",
    surfaces: ["/piani", "/account/salone"],
    aliases: ["provisioning", "slug salone", "orphan repair", "directory salone"],
    example: "@provisioning c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/SalonPlansPage.tsx"],
    backend: [
      "luxury/src/main/java/it/luxury/studio/service/SalonDirectoryProvisioningService.java",
      "luxury/src/main/java/it/luxury/studio/service/MeSalonOwnerOrphanRepairService.java",
      "luxury/src/main/java/it/luxury/consumer/service/LuxuryAccountRegistrationService.java",
    ],
    tests: [
      "cd luxury && ./mvnw -q test -Dtest=ConsumerRegistrationProvisioningIntegrationTest,ConsumerRegistrationConflictRepairIntegrationTest,SalonDirectoryProvisioningServiceSlugifyTest",
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
      "luxury/src/main/java/it/luxury/bootstrap/LuxuryDemoDataLoader.java",
      "luxury/src/main/java/it/luxury/bootstrap/SalonLocationCoordinatesBackfillRunner.java",
      "luxury/src/main/java/it/luxury/bootstrap/StudioGroupSchemaAlignmentRunner.java",
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
      "luxury-frontend/src/hooks/useMePendingReviewInvites.ts",
      "luxury-frontend/src/hooks/useMeReviewHistory.ts",
      "luxury-frontend/src/lib/salonReviewNotifications.ts",
      "luxury-frontend/src/components/StarRatingInput.tsx",
      "luxury-frontend/src/components/StarRatingDisplay.tsx",
    ],
    backend: [
      "luxury/src/main/java/it/luxury/consumer/service/MeReviewHistoryService.java",
      "luxury/src/main/java/it/luxury/review/service/ReviewShowcaseService.java",
    ],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeReviewsIntegrationTest,MeReviewsEndpointsSecurityTest"],
  },
  {
    tag: "layout-catalogo",
    label: "Catalogo layout e wireframe",
    surfaces: ["/account/salone/brand", "/account/salone/brand/anteprima-layout"],
    aliases: ["catalogo layout", "wireframe", "standard layout", "stili testo"],
    example: "@layout-catalogo c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/salon/SalonLayoutCatalogPage.tsx",
      "luxury-frontend/src/data/standardLayoutCatalog.ts",
      "luxury-frontend/src/data/writingStyleCatalog.ts",
      "luxury-frontend/src/data/previewAnimatedBackgrounds.ts",
      "luxury-frontend/src/components/salon/StandardLayoutWireframe.tsx",
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
      "luxury-frontend/src/components/salon/SalonBrandAmbientSidebar.tsx",
      "luxury-frontend/src/components/salon/SalonBrandLayoutSidebar.tsx",
      "luxury-frontend/src/lib/showcaseLayoutThemeClass.ts",
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
      "luxury-frontend/src/pages/admin/supportInboxParse.ts",
      "luxury-frontend/src/pages/admin/adminSupportInboxApi.ts",
    ],
    backend: ["luxury/src/main/java/it/luxury/admin/service/SuperAdminSupportInboxService.java"],
    tests: [],
  },
  {
    tag: "scelta-staff-prenotazioni",
    label: "Scelta operatore prima dell'agenda",
    surfaces: ["/account/prenotazioni"],
    aliases: ["scelta staff", "pick staff", "staff pick prenotazioni"],
    example: "@scelta-staff-prenotazioni c'è un bug, controlla",
    frontend: [
      "luxury-frontend/src/pages/account/PrenotazioniStaffPickPage.tsx",
      "luxury-frontend/src/pages/account/AppointmentsPage.tsx",
    ],
    backend: ["luxury/src/main/java/it/luxury/consumer/api/MeAppointmentsController.java"],
    tests: [],
  },
  {
    tag: "profilo-consumer",
    label: "Profilo consumer e account chiuso",
    surfaces: ["/account/profilo"],
    aliases: ["profilo consumer", "consumer profile", "account chiuso"],
    example: "@profilo-consumer c'è un bug, controlla",
    frontend: ["luxury-frontend/src/pages/account/AccountConsumerHomePage.tsx", "luxury-frontend/src/hooks/useMeProfile.ts"],
    backend: ["luxury/src/main/java/it/luxury/consumer/service/ConsumerProfileService.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=MeProfileControllerTest,MeAccountControllerTest"],
  },
  {
    tag: "smoke",
    label: "Smoke test endpoint pubblici",
    surfaces: ["API pubbliche"],
    aliases: ["smoke", "endpoint pubblici", "regressione api"],
    example: "@smoke c'è un bug, controlla",
    frontend: [],
    backend: ["luxury/src/test/java/it/luxury/publicapi/api/LuxuryPublicEndpointsSmokeTest.java"],
    tests: ["cd luxury && ./mvnw -q test -Dtest=LuxuryPublicEndpointsSmokeTest"],
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
  "/account/feedback-luxury",
] as const;

export function listUnmappedAppRoutes(): string[] {
  return CANONICAL_APP_ROUTE_SAMPLES.filter((route) => findBugAreasBySurface(route).length === 0);
}
