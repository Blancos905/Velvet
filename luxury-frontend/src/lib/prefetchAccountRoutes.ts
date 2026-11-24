import { normalizeAccountPath } from "./nativeAccountHubPaths";

type RouteLoader = () => Promise<unknown>;

/** Chunk lazy delle pagine account — precaricati per evitare flash al cambio sezione. */
const ACCOUNT_ROUTE_LOADERS: Record<string, RouteLoader> = {
  "/account/home": () => import("../pages/account/AccountHomePage"),
  "/account/staff": () => import("../pages/account/StaffMemberHomePage"),
  "/account/staff/agenda": () => import("../pages/account/StaffMemberAgendaPage"),
  "/salone": () => import("../pages/account/AccountSalonHomePage"),
  "/salone/servizi": () => import("../pages/account/salon/SalonServicesPage"),
  "/salone/staff": () => import("../pages/account/salon/SalonStaffPage"),
  "/salone/clienti": () => import("../pages/account/salon/SalonClientsPage"),
  "/salone/brand": () => import("../pages/account/salon/SalonBrandPage"),
  "/salone/anteprima": () => import("../pages/account/salon/SalonVetrinaPreviewPage"),
  "/salone/brand/anteprima-layout": () => import("../pages/account/salon/SalonBrandLayoutPreviewPage"),
  "/salone/tuo-salone": () => import("../pages/account/salon/SalonPersonalPageBuilder"),
  "/salone/strumenti": () => import("../pages/account/salon/SalonStandardToolsPage"),
  "/salone/statistiche": () => import("../pages/account/salon/SalonStatisticsPage"),
  "/salone/posizione": () => import("../pages/account/salon/SalonLocationPage"),
  "/account/prenotazioni": () => import("../pages/account/AppointmentsPage"),
  "/account/profilo": () => import("../pages/account/ProfilePage"),
  "/account/notifiche": () => import("../pages/account/NotificationsPage"),
  "/account/preferiti": () => import("../pages/account/FavoritesPage"),
  "/account/saloni-di-fiducia": () => import("../pages/account/TrustedSalonsPage"),
  "/account/assistenza": () => import("../pages/account/SupportPage"),
  "/account/info-privacy": () => import("../pages/account/AccountInfoPrivacyPage"),
  "/account/chat": () => import("../pages/account/SalonLuxuryChatPage"),
  "/account/feedback-luxury": () => import("../pages/account/LuxuryFeedbackPage"),
  "/account/billing/checkout": () => import("../pages/account/AccountBillingCheckoutPage"),
  "/account/billing/success": () => import("../pages/account/AccountBillingSuccessPage"),
};

const prefetched = new Set<string>();

function normalizePrefetchPath(path: string): string {
  const normalized = normalizeAccountPath(path);
  if (normalized.startsWith("/account/prenotazioni/")) {
    if (normalized.includes("/agenda")) {
      return "/account/prenotazioni";
    }
    return "/account/prenotazioni";
  }
  return normalized;
}

/** Precarica il chunk di una singola route account (idempotente). */
export function prefetchAccountRoute(path: string): void {
  const normalized = normalizePrefetchPath(path);
  const loader = ACCOUNT_ROUTE_LOADERS[normalized];
  if (!loader || prefetched.has(normalized)) return;
  prefetched.add(normalized);
  void loader();
}

/** Precarica tutte le pagine account più visitate. */
export function prefetchCommonAccountRoutes(): void {
  for (const path of Object.keys(ACCOUNT_ROUTE_LOADERS)) {
    prefetchAccountRoute(path);
  }
}
