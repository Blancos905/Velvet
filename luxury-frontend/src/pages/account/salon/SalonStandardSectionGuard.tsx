import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useLuxuryAuth } from "../../../auth/LuxuryAuthProvider";
import { useEffectiveSalonPlanTier } from "../../../hooks/useEffectiveSalonPlanTier";
import { useBillingStatusQuery, useSalonFeaturePlanTier, useSalonPremiumActive } from "../../../hooks/useSalonFeaturePlanTier";
import { isFeatureEnabled, resolveSubscriptionSurface } from "../../../lib/subscription-guards";
import { isLuxuryNativeAppShell } from "../../../hooks/useLuxuryNativeAppShell";

/** Solo titolare con piano Premium attivo (menu layout catalogo + brand self-service). */
export function SalonStandardSectionGuard({ children }: { children: ReactNode }) {
  const { isSalonTitolare } = useLuxuryAuth();
  const registeredPlan = useEffectiveSalonPlanTier();
  const tier = useSalonFeaturePlanTier();
  const isPremiumActive = useSalonPremiumActive();
  const billingStatus = useBillingStatusQuery();

  if (!isSalonTitolare) {
    return <Navigate to="/account/prenotazioni" replace />;
  }

  if (
    registeredPlan === "PREMIUM" &&
    billingStatus.isSuccess &&
    !isPremiumActive
  ) {
    return <Navigate to="/account/salone" replace />;
  }

  if (
    !isFeatureEnabled("owner.premium.brand", tier, {
      surface: resolveSubscriptionSurface(isLuxuryNativeAppShell()),
    })
  ) {
    return <Navigate to="/account/salone" replace />;
  }

  return <>{children}</>;
}
