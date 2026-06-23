import type { SalonPlanTier } from "../data/salonPlans";

/** Pagine hub account che in app mobile mostrano masthead + griglia bottoni (non overlay). */
const NATIVE_ACCOUNT_HUB_PATHS = new Set(["/account/staff", "/account/salone"]);

export function normalizeAccountPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export type NativeAccountHubRole = {
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
};

export function isNativeAccountHubPath(pathname: string, role?: NativeAccountHubRole): boolean {
  const path = normalizeAccountPath(pathname);
  if (NATIVE_ACCOUNT_HUB_PATHS.has(path)) return true;
  const isConsumer = role && !role.isSalonTitolare && !role.isSalonStaff;
  if (isConsumer && path === "/account/prenotazioni") return true;
  return false;
}

/** Dashboard titolare: sempre panoramica salone (il titolare non ha hub personale separato). */
export function nativeSalonOwnerHubPath(_planTier?: SalonPlanTier): string {
  return "/account/salone";
}

export function nativeAccountHubFallbackPath(role: {
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
  salonPlanTier?: SalonPlanTier;
}): string {
  if (role.isSalonStaff) return "/account/staff";
  if (role.isSalonTitolare) {
    return nativeSalonOwnerHubPath(role.salonPlanTier);
  }
  return "/account/prenotazioni";
}
