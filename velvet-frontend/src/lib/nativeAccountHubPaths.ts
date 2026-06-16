import type { SalonPlanTier } from "../data/salonPlans";

/** Pagine hub account che in app mobile mostrano masthead + griglia bottoni (non overlay). */
const NATIVE_ACCOUNT_HUB_PATHS = new Set([
  "/account/home",
  "/account/staff",
  "/account/salone",
]);

export function normalizeAccountPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function isNativeAccountHubPath(pathname: string): boolean {
  return NATIVE_ACCOUNT_HUB_PATHS.has(normalizeAccountPath(pathname));
}

/** Home hub titolare in app: Premium → panoramica salone; Free → benvenuto + menu. */
export function nativeSalonOwnerHubPath(planTier: SalonPlanTier | undefined): string {
  return planTier === "PREMIUM" ? "/account/salone" : "/account/home";
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
  return "/account/home";
}
