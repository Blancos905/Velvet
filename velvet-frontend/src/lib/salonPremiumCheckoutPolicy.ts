import type { BillingStatus } from "../api/billing";
import type { SalonPlanTier } from "../data/salonPlans";
import { isVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import { PREMIUM_SALON_POST_LOGIN_PATH } from "./salonRegistrationPostLogin";

export const SALON_OWNER_HOME_PATH = "/account/salone";

export type SalonPremiumCheckoutPolicy = {
  premiumCheckoutRequired: boolean;
};

export function isSalonPremiumCheckoutConfigured(
  status: Pick<BillingStatus, "configured"> | null | undefined,
): boolean {
  return status?.configured === true;
}

export function isSalonPremiumCheckoutRequired(
  policy: SalonPremiumCheckoutPolicy | null | undefined,
): boolean {
  return policy?.premiumCheckoutRequired === true;
}

/** Destinazione post-login / post-verifica email per titolare salone. */
export function postLoginPathForSalonPlan(
  plan: SalonPlanTier | undefined,
  premiumCheckoutRequired: boolean,
): string {
  if (plan === "PREMIUM" && premiumCheckoutRequired) {
    if (isVelvetNativeAppShell()) {
      return SALON_OWNER_HOME_PATH;
    }
    return PREMIUM_SALON_POST_LOGIN_PATH;
  }
  if (plan === "PREMIUM" || plan === "BASE") {
    return SALON_OWNER_HOME_PATH;
  }
  return "/account";
}

export function shouldOfferSalonPremiumCheckout(
  premiumCheckoutRequired: boolean,
  billingStatus: Pick<BillingStatus, "configured"> | null | undefined,
): boolean {
  return premiumCheckoutRequired && isSalonPremiumCheckoutConfigured(billingStatus);
}
