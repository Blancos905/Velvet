/** Decodifica ruoli da JWT Luxury (`roles`) o formato legacy con `realm_access.roles` nel payload — solo client-side, per UX. */
export function realmRolesFromAccessToken(accessToken: string | undefined): readonly string[] {
  if (accessToken == null || accessToken.length === 0) return [];
  const parts = accessToken.split(".");
  if (parts.length < 2) return [];
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return [];
    const json = atob(b64);
    const payload = JSON.parse(json) as { roles?: unknown; realm_access?: { roles?: unknown } };
    if (Array.isArray(payload.roles)) {
      return payload.roles.filter((r): r is string => typeof r === "string");
    }
    const roles = payload.realm_access?.roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}
