import type { SuperAdminRecentSalonRowDto } from "../../api/types";

export function adminSalonRowMatchesSearch(row: SuperAdminRecentSalonRowDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.name, row.ownerEmail, row.primaryLocationCity, row.primaryLocationName, row.primaryLocationSlug].some(
    (part) => (part ?? "").toLowerCase().includes(q),
  );
}
