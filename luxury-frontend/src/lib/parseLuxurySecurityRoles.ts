/** Normalizza claim legacy (es. `ROLE_OWNER` → `OWNER`), allineato a `LuxuryUserPrincipal.normalizeAppRoleName`. */
export function normalizeLuxuryAppRoleName(role: string): string {
  const trimmed = role.trim().toUpperCase();
  if (!trimmed) return "";
  return trimmed.startsWith("ROLE_") ? trimmed.slice(5) : trimmed;
}

/** Parse `consumer_profiles.security_roles` o claim JWT `roles` (CSV / array già normalizzato). */
export function parseLuxurySecurityRoles(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((part) => normalizeLuxuryAppRoleName(part))
    .filter(Boolean);
}
