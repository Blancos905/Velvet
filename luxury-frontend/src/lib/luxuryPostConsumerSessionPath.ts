import { luxuryJwtHintsFromAccessToken } from "./luxuryJwtHintsFromAccessToken";

/** Destinazione area account dopo `POST /api/v1/admin/overview/consumers/{id}/session` (allineato a ruoli JWT). */
export function luxuryPostConsumerSessionPath(accessToken: string): string {
  const roles = luxuryJwtHintsFromAccessToken(accessToken).realmRoles;
  const hasOwner = roles.includes("OWNER");
  const hasStaff = roles.includes("STAFF");
  if (hasStaff && !hasOwner) return "/account/staff";
  if (hasOwner) return "/salone";
  return "/account";
}
