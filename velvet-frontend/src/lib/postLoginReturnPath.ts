/**
 * Persistenza sicura del path di ritorno dopo login (allowlist, no open redirect).
 */
export const VELVET_POST_LOGIN_RETURN_KEY = "velvet_post_login_return";

const ALLOWED_PREFIXES = [
  "/account",
  "/admin",
  "/search",
  "/s/",
  "/piani",
  "/partner",
  "/registrati",
  "/recensione",
] as const;

function isAllowedInternalReturn(pathWithQuery: string): boolean {
  const trimmed = pathWithQuery.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  const path = trimmed.split("#")[0]?.split("?")[0] ?? "";
  if (path.startsWith("/auth/")) return false;
  if (path === "/admin/login" || path === "/admin/register") return false;
  if (path === "/") return true;
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/** Salva il path (pathname + query) solo se interno e nella allowlist. */
export function setPostLoginReturnPath(pathWithQuery: string): void {
  if (!isAllowedInternalReturn(pathWithQuery)) return;
  try {
    sessionStorage.setItem(VELVET_POST_LOGIN_RETURN_KEY, pathWithQuery);
  } catch {
    /* ignore */
  }
}

/** Rimuove il path salvato senza leggerlo (es. quando un altro flusso ha priorità). */
export function clearPostLoginReturnPath(): void {
  try {
    sessionStorage.removeItem(VELVET_POST_LOGIN_RETURN_KEY);
  } catch {
    /* ignore */
  }
}

/** Legge e rimuove il path salvato; `null` se assente o non valido. */
export function consumePostLoginReturnPath(): string | null {
  try {
    const v = sessionStorage.getItem(VELVET_POST_LOGIN_RETURN_KEY);
    if (v == null) return null;
    sessionStorage.removeItem(VELVET_POST_LOGIN_RETURN_KEY);
    if (!isAllowedInternalReturn(v)) return null;
    return v;
  } catch {
    return null;
  }
}

/**
 * Dopo login da vetrina ricerca non si deve riatterrare sulla sola `/search` (UX: si va in area account).
 * Altri path (es. `/s/…`, `/piani`) restano invariati.
 */
export function normalizePostLoginReturnPath(path: string): string {
  const pathOnly = path.split("#")[0]?.split("?")[0] ?? "";
  if (pathOnly === "/search") return "/account";
  return path;
}
