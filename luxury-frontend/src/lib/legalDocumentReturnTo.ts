/** Query param per tornare alla pagina di origine dopo un documento legale. */
export const LEGAL_RETURN_TO_QUERY = "returnTo";

const LEGAL_DOCUMENT_PREFIXES = ["/privacy", "/termini", "/legale"] as const;

function pathOnly(pathWithQuery: string): string {
  return pathWithQuery.split("#")[0]?.split("?")[0] ?? "";
}

function isLegalDocumentPath(path: string): boolean {
  return LEGAL_DOCUMENT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Evita open redirect: solo path interni, esclusi auth e documenti legali. */
function isAllowedLegalReturnTo(pathWithQuery: string): boolean {
  const trimmed = pathWithQuery.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  const path = pathOnly(trimmed);
  if (path.startsWith("/auth/")) return false;
  if (isLegalDocumentPath(path)) return false;
  return true;
}

export function readLegalReturnTo(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get(LEGAL_RETURN_TO_QUERY)?.trim();
  if (!raw || !isAllowedLegalReturnTo(raw)) return null;
  return raw;
}

/** Pagina corrente da propagare ai link legali (es. vetrina salone / recensione). */
export function legalReturnToFromPathname(pathname: string, search: string): string | null {
  const pathWithQuery = `${pathname}${search}`;
  if (!isAllowedLegalReturnTo(pathWithQuery)) return null;
  return pathWithQuery;
}

export function withLegalReturnTo(path: string, returnTo: string | null): string {
  if (!returnTo) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${LEGAL_RETURN_TO_QUERY}=${encodeURIComponent(returnTo)}`;
}
