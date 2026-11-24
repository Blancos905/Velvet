import { useQuery } from "@tanstack/react-query";
import { fetchBillingStatus } from "../api/billing";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import type { SalonPlanTier } from "../data/salonPlans";
import { useEffectiveSalonPlanTier } from "./useEffectiveSalonPlanTier";

export function useBillingStatusQuery() {
  const { isSalonTitolare, accessToken } = useLuxuryAuth();
  return useQuery({
    queryKey: ["me", "billing", "status", accessToken],
    queryFn: () => fetchBillingStatus(accessToken),
    enabled: Boolean(isSalonTitolare && accessToken),
  });
}

/** Piano usato per sbloccare funzionalità: Premium senza accesso attivo resta BASE. */
export function useSalonFeaturePlanTier(): SalonPlanTier {
  const registeredPlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  if ((registeredPlan === "PREMIUM" || registeredPlan === "PLUS") && billingStatus.data?.premiumAccess !== true) {
    return "BASE";
  }
  return registeredPlan;
}

export function useSalonPremiumActive(): boolean {
  const registeredPlan = useEffectiveSalonPlanTier();
  const billingStatus = useBillingStatusQuery();
  if (registeredPlan !== "PREMIUM" && registeredPlan !== "PLUS") return false;
  if (billingStatus.isPending || !billingStatus.data) return true;
  return billingStatus.data.premiumAccess === true;
}
