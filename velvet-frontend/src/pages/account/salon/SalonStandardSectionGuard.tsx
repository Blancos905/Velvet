import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useEffectiveSalonPlanTier } from "../../../hooks/useEffectiveSalonPlanTier";
import { useBillingStatusQuery, useSalonFeaturePlanTier, useSalonPremiumActive } from "../../../hooks/useSalonFeaturePlanTier";
import { isFeatureEnabled, resolveSubscriptionSurface } from "../../../lib/subscription-guards";
import { isVelvetNativeAppShell } from "../../../hooks/useVelvetNativeAppShell";

/** Solo titolare con piano Premium attivo (menu layout catalogo + brand self-service). */
export function SalonStandardSectionGuard({ children }: { children: ReactNode }) {
  const { isSalonTitolare } = useVelvetAuth();
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
      surface: resolveSubscriptionSurface(isVelvetNativeAppShell()),
    })
  ) {
    return <Navigate to="/account/salone" replace />;
  }

  return <>{children}</>;
}
