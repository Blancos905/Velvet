import { useQuery } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import type { MeStaffSalon } from "../api/types";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";

function normalizeMeStaffSalon(raw: MeStaffSalon): MeStaffSalon {
  const locRaw = raw.primaryLocationId;
  const loc =
    locRaw == null || (typeof locRaw === "string" && locRaw.trim() === "")
      ? null
      : String(locRaw).trim() || null;
  const opRaw = raw.staffOperatorId;
  const staffOperatorId =
    opRaw == null || (typeof opRaw === "string" && opRaw.trim() === "")
      ? null
      : String(opRaw).trim() || null;
  return {
    salonDisplayName: raw.salonDisplayName?.trim() || null,
    staffOperatorId,
    primaryLocationId: loc,
    planTier: raw.planTier?.trim() || null,
  };
}

/** Nome commerciale dello studio per cui lavora l’operatore (`GET /api/v1/me/staff/salon`). */
export function useMeStaffSalonQuery() {
  const { accessToken, isSalonStaff } = useLuxuryAuth();
  return useQuery({
    queryKey: ["me", "staff", "salon", accessToken],
    queryFn: async () => {
      const raw = await apiJson<MeStaffSalon>("/api/v1/me/staff/salon", { accessToken });
      return normalizeMeStaffSalon(raw);
    },
    enabled: Boolean(isSalonStaff && accessToken),
    retry: 1,
    staleTime: 120_000,
    refetchOnMount: "always",
  });
}
