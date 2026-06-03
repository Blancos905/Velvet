import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useVelvetAuth } from "../../../auth/VelvetAuthProvider";
import { useEffectiveSalonPlanTier } from "../../../hooks/useEffectiveSalonPlanTier";

/** Solo titolare con piano Premium (menu layout catalogo + brand self-service). */
export function SalonStandardSectionGuard({ children }: { children: ReactNode }) {
  const { isSalonTitolare } = useVelvetAuth();
  const tier = useEffectiveSalonPlanTier();
  if (!isSalonTitolare) {
    return <Navigate to="/account/home" replace />;
  }
  if (tier !== "PREMIUM") {
    return <Navigate to="/account/salone" replace />;
  }
  return <>{children}</>;
}
