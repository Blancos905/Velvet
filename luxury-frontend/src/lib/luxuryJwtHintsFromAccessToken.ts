import { parseSalonPlanTier, type SalonPlanTier } from "../data/salonPlans";
import { normalizeLuxuryAppRoleName } from "./parseLuxurySecurityRoles";

export type LuxuryJwtHints = {
  realmRoles: readonly string[];
  /** Hint da claim `plan` nel JWT Luxury; la verità resta lato API. */
  salonPlanHint: SalonPlanTier | undefined;
};

function decodeJwtPayload(accessToken: string | undefined): Record<string, unknown> | null {
  if (accessToken == null || accessToken.length === 0) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return null;
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Decodifica solo payload JWT (nessuna verifica firma) per ruoli e hint piano — uso UX. */
export function luxuryJwtHintsFromAccessToken(accessToken: string | undefined): LuxuryJwtHints {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return { realmRoles: [], salonPlanHint: undefined };
  }
  let roles: string[] = [];
  const rolesClaim = payload.roles;
  if (Array.isArray(rolesClaim)) {
    roles = rolesClaim
      .filter((r): r is string => typeof r === "string")
      .map((r) => normalizeLuxuryAppRoleName(r))
      .filter(Boolean);
  }
  if (roles.length === 0) {
    const rolesRaw = payload.realm_access;
    if (
      rolesRaw &&
      typeof rolesRaw === "object" &&
      "roles" in rolesRaw &&
      Array.isArray((rolesRaw as { roles?: unknown }).roles)
    ) {
      roles = (rolesRaw as { roles: unknown[] }).roles
        .filter((r): r is string => typeof r === "string")
        .map((r) => normalizeLuxuryAppRoleName(r))
        .filter(Boolean);
    }
  }

  const planRaw = payload.plan ?? payload.organization_plan;
  const salonPlanHint = typeof planRaw === "string" ? parseSalonPlanTier(planRaw) : undefined;

  return { realmRoles: roles, salonPlanHint };
}

/** Chiave stabile per sessionStorage (uid JWT, fallback subject). */
export function readLuxuryAccountStorageKey(accessToken: string | undefined): string | undefined {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return undefined;
  const uid = payload.uid;
  if (typeof uid === "string" && uid.trim()) return uid.trim();
  const sub = payload.sub;
  if (typeof sub === "string" && sub.trim()) return sub.trim();
  return undefined;
}

/** Solo claim espliciti «salone»; evitare `organization_name` ecc. */
const SALON_NAME_CLAIM_KEYS = ["salon_public_name", "studio_name", "salon_name"] as const;

/** Nome vetrina / salone da claim JWT; nessuna verifica firma — solo UX. */
export function readSalonBrandingNameFromAccessToken(accessToken: string | undefined): string | undefined {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return undefined;
  for (const k of SALON_NAME_CLAIM_KEYS) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
