import { velvetJwtHintsFromAccessToken } from "./velvetJwtHintsFromAccessToken";

/** Destinazione area account dopo `POST /api/v1/admin/overview/consumers/{id}/session` (allineato a ruoli JWT). */
export function velvetPostConsumerSessionPath(accessToken: string): string {
  const roles = velvetJwtHintsFromAccessToken(accessToken).realmRoles;
  const hasOwner = roles.includes("OWNER");
  const hasStaff = roles.includes("STAFF");
  if (hasStaff && !hasOwner) return "/account/staff";
  if (hasOwner) return "/account/salone";
  return "/account/prenotazioni";
}
