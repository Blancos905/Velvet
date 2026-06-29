import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { readLocalStaff, type LocalStaffItem } from "../lib/salonStaffLocal";
import { useMeSalonSummaryQuery } from "./useMeSalonSummary";

export type SalonStaffApiItem = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  role?: string | null;
  photoDataUrl?: string | null;
  loginEnabled?: boolean | null;
  workMorningStartMinuteOfDay?: number | null;
  workMorningEndMinuteOfDay?: number | null;
  workAfternoonStartMinuteOfDay?: number | null;
  workAfternoonEndMinuteOfDay?: number | null;
  /** Presenti solo se elenco da endpoint pubblico operatori. */
  averageStaffRating?: number | null;
  staffReviewCount?: number | null;
};

export type StaffViewItem = {
  id: string;
  source: "local" | "api";
  rawId: string;
  firstName: string;
  lastName: string;
  role: string;
  photoDataUrl: string | null;
  loginEnabled?: boolean;
  workMorningStartMinuteOfDay?: number | null;
  workMorningEndMinuteOfDay?: number | null;
  workAfternoonStartMinuteOfDay?: number | null;
  workAfternoonEndMinuteOfDay?: number | null;
};

export function useSalonStaffList() {
  const { isSalonTitolare, accessToken } = useVelvetAuth();
  const meSalon = useMeSalonSummaryQuery();
  const salonSlug = meSalon.data?.primaryLocationSlug?.trim() ?? "";
  const [backendStaffAvailable, setBackendStaffAvailable] = useState(true);
  const [localMembers, setLocalMembers] = useState<LocalStaffItem[]>(() => readLocalStaff(salonSlug));

  useEffect(() => {
    setLocalMembers(readLocalStaff(salonSlug));
  }, [salonSlug]);

  const staffQuery = useQuery({
    queryKey: ["me", "salon", "staff"],
    queryFn: async () => {
      try {
        const rows = await apiJson<SalonStaffApiItem[]>("/api/v1/me/salon/staff", { accessToken });
        setBackendStaffAvailable(true);
        return rows;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("404")) {
          setBackendStaffAvailable(false);
          if (salonSlug) {
            const publicRows = await apiJson<SalonStaffApiItem[]>(
              `/api/v1/public/organizations/${encodeURIComponent(salonSlug)}/operators`,
            );
            return publicRows;
          }
          return [];
        }
        throw e;
      }
    },
    enabled: isSalonTitolare,
    staleTime: 60_000,
  });

  const mergedStaffMembers: StaffViewItem[] = useMemo(() => {
    const staffMembers: StaffViewItem[] = (staffQuery.data ?? []).map((member) => {
      const first = member.firstName?.trim() ?? "";
      const last = member.lastName?.trim() ?? "";
      const display = member.displayName?.trim() ?? "";
      if (first || last) {
        return {
          id: `api-${member.id}`,
          source: "api",
          rawId: member.id,
          firstName: first || "—",
          lastName: last || "—",
          role: member.role?.trim() || "Staff",
          photoDataUrl: member.photoDataUrl ?? null,
          loginEnabled: Boolean(member.loginEnabled),
          workMorningStartMinuteOfDay: member.workMorningStartMinuteOfDay ?? null,
          workMorningEndMinuteOfDay: member.workMorningEndMinuteOfDay ?? null,
          workAfternoonStartMinuteOfDay: member.workAfternoonStartMinuteOfDay ?? null,
          workAfternoonEndMinuteOfDay: member.workAfternoonEndMinuteOfDay ?? null,
        };
      }
      const parts = display.split(/\s+/).filter(Boolean);
      return {
        id: `api-${member.id}`,
        source: "api",
        rawId: member.id,
        firstName: parts[0] ?? "—",
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : "—",
        role: member.role?.trim() || "Staff",
        photoDataUrl: member.photoDataUrl ?? null,
        loginEnabled: Boolean(member.loginEnabled),
        workMorningStartMinuteOfDay: member.workMorningStartMinuteOfDay ?? null,
        workMorningEndMinuteOfDay: member.workMorningEndMinuteOfDay ?? null,
        workAfternoonStartMinuteOfDay: member.workAfternoonStartMinuteOfDay ?? null,
        workAfternoonEndMinuteOfDay: member.workAfternoonEndMinuteOfDay ?? null,
      };
    });
    return [
      ...localMembers.map((m) => ({
        id: `local-${m.id}`,
        source: "local" as const,
        rawId: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
        photoDataUrl: m.photoDataUrl,
        loginEnabled: false,
      })),
      ...staffMembers,
    ];
  }, [staffQuery.data, localMembers]);

  return {
    mergedStaffMembers,
    staffQuery,
    backendStaffAvailable,
    localMembers,
    setLocalMembers,
    salonSlug,
  };
}
