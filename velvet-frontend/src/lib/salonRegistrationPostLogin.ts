import { parseSalonPlanTier, SALON_PLAN_STORAGE_KEY, type SalonPlanTier } from "../data/salonPlans";
import { postLoginPathForSalonPlan } from "./salonPremiumCheckoutPolicy";
import { setPostLoginReturnPath } from "./postLoginReturnPath";

export const PREMIUM_SALON_POST_LOGIN_PATH = "/account/billing/checkout";

const SALON_PLAN_LOCAL_KEY = "velvet_intended_salon_plan";

export function persistIntendedSalonPlan(plan: SalonPlanTier): void {
  try {
    sessionStorage.setItem(SALON_PLAN_STORAGE_KEY, plan);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(SALON_PLAN_LOCAL_KEY, plan);
  } catch {
    /* ignore */
  }
}

export function readIntendedSalonPlanFromSession(): SalonPlanTier | undefined {
  if (typeof sessionStorage !== "undefined") {
    const fromSession = parseSalonPlanTier(sessionStorage.getItem(SALON_PLAN_STORAGE_KEY));
    if (fromSession) return fromSession;
  }
  if (typeof localStorage !== "undefined") {
    return parseSalonPlanTier(localStorage.getItem(SALON_PLAN_LOCAL_KEY));
  }
  return undefined;
}

export function clearIntendedSalonPlan(): void {
  try {
    sessionStorage.removeItem(SALON_PLAN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SALON_PLAN_LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

export function setPostLoginPathForSalonRegistration(
  plan: SalonPlanTier,
  premiumCheckoutRequired = false,
): void {
  persistIntendedSalonPlan(plan);
  setPostLoginReturnPath(postLoginPathForSalonPlan(plan, premiumCheckoutRequired));
}

export function loginReturnPathForSalonRegistration(
  plan: SalonPlanTier | undefined,
  premiumCheckoutRequired = false,
): string {
  return postLoginPathForSalonPlan(plan, premiumCheckoutRequired);
}

export function isPremiumSalonRegistrationPending(): boolean {
  return readIntendedSalonPlanFromSession() === "PREMIUM";
}
