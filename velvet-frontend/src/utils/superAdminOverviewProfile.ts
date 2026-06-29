import type { SuperAdminMeProfileDto } from "../api/types";

/** Email claim dal JWT di sessione admin (Bearer). */
export function readVelvetAdminJwtEmail(accessToken: string | undefined): string | undefined {
  if (!accessToken) return undefined;
  const parts = accessToken.split(".");
  if (parts.length < 2) return undefined;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return undefined;
    const payload = JSON.parse(atob(b64)) as { email?: string };
    const em = payload.email;
    return typeof em === "string" && em.trim() ? em.trim() : undefined;
  } catch {
    return undefined;
  }
}

function fallbackProfile(accessToken: string | undefined): SuperAdminMeProfileDto {
  const email = readVelvetAdminJwtEmail(accessToken) ?? null;
  let displayName: string | null = null;
  if (email && !email.endsWith("@velvet.superadmin")) {
    const at = email.indexOf("@");
    displayName = at > 0 ? email.slice(0, at) : email;
  } else if (email?.endsWith("@velvet.superadmin")) {
    const local = email.slice(0, email.indexOf("@"));
    if (local) {
      displayName = local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return {
    profileId: null,
    email,
    displayName,
    phone: null,
    preferredLocale: null,
    securityRoles: "SUPER ADMIN",
    persistedProfile: false,
  };
}

/**
 * Legge `superAdminProfile` dalla risposta overview (camelCase o snake_case) o costruisce un fallback dal JWT.
 */
export function extractSuperAdminProfileFromOverview(
  overviewBody: unknown,
  accessToken: string | undefined,
): SuperAdminMeProfileDto {
  if (!overviewBody || typeof overviewBody !== "object") {
    return fallbackProfile(accessToken);
  }
  const o = overviewBody as Record<string, unknown>;
  const raw = o.superAdminProfile ?? o.super_admin_profile;
  if (!raw || typeof raw !== "object") {
    return fallbackProfile(accessToken);
  }
  const r = raw as Record<string, unknown>;
  const profileIdRaw = r.profileId ?? r.profile_id;
  const email = (typeof r.email === "string" ? r.email : null) ?? null;
  const displayName = (typeof r.displayName === "string" ? r.displayName : typeof r.display_name === "string" ? r.display_name : null) ?? null;
  const phone = (typeof r.phone === "string" ? r.phone : null) ?? null;
  const preferredLocale =
    (typeof r.preferredLocale === "string" ? r.preferredLocale : typeof r.preferred_locale === "string" ? r.preferred_locale : null) ?? null;
  const securityRoles =
    (typeof r.securityRoles === "string" ? r.securityRoles : typeof r.security_roles === "string" ? r.security_roles : null) ?? null;
  const persistedProfile = Boolean(r.persistedProfile ?? r.persisted_profile);
  return {
    profileId: profileIdRaw != null ? String(profileIdRaw) : null,
    email,
    displayName,
    phone,
    preferredLocale,
    securityRoles,
    persistedProfile,
  };
}

/** Suddivide `displayName` (es. "Michele Costantino") in nome + cognome per la UI. */
export function splitNomeCognomeFromDisplayName(displayName: string | null | undefined): { nome: string; cognome: string } {
  const t = displayName?.trim();
  if (!t) return { nome: "—", cognome: "—" };
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { nome: parts[0], cognome: "—" };
  return { nome: parts[0], cognome: parts.slice(1).join(" ") };
}
