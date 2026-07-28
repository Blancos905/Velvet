import { useMemo } from "react";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { SALON_PLAN_STORAGE_KEY, parseSalonPlanTier, type SalonPlanTier } from "../data/salonPlans";
import { useMeSalonSummaryQuery } from "./useMeSalonSummary";

/**
 * Piano titolare: **DB** (`GET /api/v1/me/salon` dopo registrazione `/piani`), poi claim JWT `plan`, poi sessione, poi BASE.
 * Per non-titolare restituisce sempre `BASE`.
 */
export function useEffectiveSalonPlanTier(): SalonPlanTier {
  const { salonPlanHint, isSalonTitolare } = useLuxuryAuth();
  const { data: meSalon } = useMeSalonSummaryQuery();
  const fromSession = useMemo(
    () =>
      typeof sessionStorage !== "undefined"
        ? parseSalonPlanTier(sessionStorage.getItem(SALON_PLAN_STORAGE_KEY))
        : undefined,
    [],
  );
  if (!isSalonTitolare) return "BASE";
  const fromApi =
    meSalon?.provisioned && meSalon.planTier ? parseSalonPlanTier(meSalon.planTier) : undefined;
  return fromApi ?? salonPlanHint ?? fromSession ?? "BASE";
}
