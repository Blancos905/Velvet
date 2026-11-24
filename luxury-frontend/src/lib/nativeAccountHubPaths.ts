import type { SalonPlanTier } from "../data/salonPlans";

/** Pagine hub account che in app mobile mostrano masthead + griglia bottoni (non overlay). */
const NATIVE_ACCOUNT_HUB_PATHS = new Set(["/account", "/account/staff", "/salone"]);

export function normalizeAccountPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export type NativeAccountHubRole = {
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
};

/**
 * Hub (griglia): titolare `/salone`, staff `/account/staff`, cliente `/account`.
 * Sotto-pagine (prenotazioni, chat, notifiche, profilo, …) si aprono in
 * `LuxuryNativeAccountOverlay`, non sotto la griglia.
 */
export function isNativeAccountHubPath(pathname: string, role?: NativeAccountHubRole): boolean {
  const path = normalizeAccountPath(pathname);
  if (NATIVE_ACCOUNT_HUB_PATHS.has(path)) {
    // `/account` è hub solo per il cliente (titolare/staff vengono reindirizzati altrove).
    if (path === "/account" && role && (role.isSalonTitolare || role.isSalonStaff)) {
      return false;
    }
    return true;
  }
  return false;
}

/** Dashboard titolare: sempre panoramica salone (il titolare non ha hub personale separato). */
export function nativeSalonOwnerHubPath(_planTier?: SalonPlanTier): string {
  return "/salone";
}

export function nativeAccountHubFallbackPath(role: {
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
  isLuxurySuperAdmin?: boolean;
  salonPlanTier?: SalonPlanTier;
}): string {
  if (role.isLuxurySuperAdmin) return "/admin/dashboard";
  if (role.isSalonStaff) return "/account/staff";
  if (role.isSalonTitolare) {
    return nativeSalonOwnerHubPath(role.salonPlanTier);
  }
  return "/account";
}

const BILLING_STANDALONE_PREFIXES = ["/account/billing/checkout", "/account/billing/success"] as const;

export type AccountOverlayRole = NativeAccountHubRole & {
  isLuxurySuperAdmin?: boolean;
  isNativeApp: boolean;
};

/** Checkout e ringraziamento Stripe: pagina intera, senza overlay. */
export function isBillingStandaloneAccountPath(pathname: string): boolean {
  const path = normalizeAccountPath(pathname);
  return BILLING_STANDALONE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Sotto-pagine account aperte in overlay.
 * In app: cliente, titolare e staff (foglio dal basso).
 * Sul sito: cliente e titolare, stessa finestra centrata del menu salone.
 * Lo staff sul sito resta nella pagina dell'hub. Il super admin non usa questo overlay.
 */
export function accountRouteOpensOverlay(pathname: string, role: AccountOverlayRole): boolean {
  const path = normalizeAccountPath(pathname);
  const isAccountSubRoute =
    (path !== "/account" && path.startsWith("/account/")) || path.startsWith("/salone/");
  if (!isAccountSubRoute || isBillingStandaloneAccountPath(path)) return false;
  if (isNativeAccountHubPath(path, role) || path === "/salone") return false;
  if (role.isNativeApp) return true;
  if (role.isLuxurySuperAdmin) return false;
  return (role.isSalonTitolare && !role.isSalonStaff) || (!role.isSalonTitolare && !role.isSalonStaff);
}

/** WebView: da pagine pubbliche (es. `/search`) «Profilo» apre l'hub account, non il dropdown. */
export function nativeAppProfileHubPath(role: {
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
  isLuxurySuperAdmin: boolean;
  salonPlanTier?: SalonPlanTier;
}): string {
  return nativeAccountHubFallbackPath(role);
}
