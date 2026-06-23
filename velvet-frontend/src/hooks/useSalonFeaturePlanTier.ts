import { useQuery } from "@tanstack/react-query";
import { fetchBillingStatus } from "../api/billing";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import type { SalonPlanTier } from "../data/salonPlans";
import { useEffectiveSalonPlanTier } from "./useEffectiveSalonPlanTier";

export function useBillingStatusQuery() {
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  return useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
  });
}

/** Piano usato per sbloccare funzionalità: Premium registrato ma non pagato resta BASE finché Stripe non conferma. */
export function useSalonFeaturePlanTier(): SalonPlanTier {
  const registeredPlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  if (
    registeredPlan === "PREMIUM" &&
    billingStatus.data?.configured === true &&
    billingStatus.data.premiumAccess !== true
  ) {
    return "BASE";
  }
  return registeredPlan;
}

export function useSalonPremiumActive(): boolean {
  const registeredPlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  if (registeredPlan !== "PREMIUM") return false;
  if (billingStatus.data?.configured !== true) return true;
  return billingStatus.data.premiumAccess === true;
}
