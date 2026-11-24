/**
 * Tre superfici, una sola app.
 * Clienti e ricerca restano sull'origine pubblica. Il pannello titolare e il super admin
 * stanno su origini diverse: in locale sono porte dello stesso host, in produzione sottodomini.
 * I percorsi (`/`, `/salone`, `/admin`) non cambiano.
 */

export type LuxurySurface = "public" | "salon" | "admin";

export const LUXURY_PUBLIC_DEV_PORT = "8080";
export const LUXURY_SALON_DEV_PORT = "8083";
export const LUXURY_ADMIN_DEV_PORT = "8084";

export type SurfaceLocation = {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
};

export function readSurfaceLocation(loc: Location = window.location): SurfaceLocation {
  return {
    protocol: loc.protocol,
    hostname: loc.hostname,
    port: loc.port,
    pathname: loc.pathname,
    search: loc.search,
    hash: loc.hash,
  };
}

export function isLocalSurfaceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "10.0.2.2") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host);
}

/** Percorso → superficie. L'account cliente resta pubblico. Titolare e dipendente stanno sul pannello salone. */
export function surfaceForPath(pathname: string): LuxurySurface {
  const path = normalizeSurfacePath(pathname);
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/account/staff" || path.startsWith("/account/staff/")) return "salon";
  if (path === "/salone" || path.startsWith("/salone/")) return "salon";
  if (path === "/account/salone" || path.startsWith("/account/salone/")) return "salon";
  return "public";
}

export type PanelHandoffKind = "salon" | "staff" | "admin";

function normalizeSurfacePath(pathname: string): string {
  return pathname.split("?")[0]?.split("#")[0]?.replace(/\/+$/, "") || "/";
}

/** Pannello che la home clienti non apre da sola: va annunciato con il link all'altra origine. */
export function panelHandoffKind(pathname: string): PanelHandoffKind | null {
  const path = normalizeSurfacePath(pathname);
  if (path === "/admin" || path.startsWith("/admin/")) return "admin";
  if (path === "/account/staff" || path.startsWith("/account/staff/")) return "staff";
  if (
    path === "/salone"
    || path.startsWith("/salone/")
    || path === "/account/salone"
    || path.startsWith("/account/salone/")
  ) {
    return "salon";
  }
  return null;
}

function panelHandoffPath(pathname: string, kind: PanelHandoffKind): string {
  const path = normalizeSurfacePath(pathname);
  if (kind === "admin") return path === "/admin" ? "/admin/dashboard" : path;
  if (kind === "staff") return path;
  if (path === "/account/salone" || path.startsWith("/account/salone/")) {
    return path.replace(/^\/account\/salone/, "/salone") || "/salone";
  }
  return path;
}

/**
 * Sulla home di ricerca un indirizzo da pannello non si apre.
 * L'avviso di trasporto vale solo per chi è già salone, dipendente o super admin.
 * Cliente e ospite tornano alla home.
 */
export function publicSurfaceDeniesPanelPath(
  pathname: string,
  roles: { admin: boolean; owner: boolean; staff: boolean } | null,
): boolean {
  if (isPublicSalonRegistrationPath(pathname)) return false;
  if (!panelHandoffKind(pathname)) return false;
  return panelKindForRoles(roles ?? { admin: false, owner: false, staff: false }) == null;
}

/** Link assoluto verso il pannello, solo se siamo sulla home clienti. */
export function panelHandoffUrl(loc: SurfaceLocation): string | null {
  if (currentSurface(loc) !== "public") return null;
  const kind = panelHandoffKind(loc.pathname);
  if (!kind) return null;
  const surface = kind === "admin" ? "admin" : "salon";
  return urlForSurface(surface, panelHandoffPath(loc.pathname, kind), loc.search, loc.hash, loc);
}

export function currentSurface(loc: SurfaceLocation): LuxurySurface {
  const host = loc.hostname.toLowerCase();
  if (host.startsWith("salone.")) return "salon";
  if (host.startsWith("admin.")) return "admin";
  if (isLocalSurfaceHost(host)) {
    if (loc.port === LUXURY_SALON_DEV_PORT) return "salon";
    if (loc.port === LUXURY_ADMIN_DEV_PORT) return "admin";
  }
  return "public";
}

function apexHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^(www|salone|admin)\./, "");
}

export function surfaceOrigin(surface: LuxurySurface, loc: SurfaceLocation): string {
  const protocol = loc.protocol || "https:";
  const hostname = loc.hostname;
  if (isLocalSurfaceHost(hostname)) {
    const publicPort =
      loc.port === LUXURY_SALON_DEV_PORT || loc.port === LUXURY_ADMIN_DEV_PORT
        ? LUXURY_PUBLIC_DEV_PORT
        : loc.port || LUXURY_PUBLIC_DEV_PORT;
    const port =
      surface === "salon" ? LUXURY_SALON_DEV_PORT : surface === "admin" ? LUXURY_ADMIN_DEV_PORT : publicPort;
    return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
  }
  const apex = apexHostname(hostname);
  if (surface === "salon") return `${protocol}//salone.${apex}`;
  if (surface === "admin") return `${protocol}//admin.${apex}`;
  const host = hostname.toLowerCase();
  if (host.startsWith("salone.") || host.startsWith("admin.")) {
    const publicHost = apex === "saloniluxury.it" ? `www.${apex}` : host.replace(/^(salone|admin)\./, "");
    return `${protocol}//${publicHost}`;
  }
  const portPart = loc.port ? `:${loc.port}` : "";
  return `${protocol}//${hostname}${portPart}`;
}

export function urlForSurface(
  surface: LuxurySurface,
  pathname: string,
  search = "",
  hash = "",
  loc: SurfaceLocation = readSurfaceLocation(),
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${surfaceOrigin(surface, loc)}${path}${search}${hash}`;
}

/**
 * Pagina aperta dal link nell'email (`/conferma-email?token=`).
 * Header e footer restano visibili ma non portano da nessun'altra parte: si chiude la scheda.
 */
export function isEmailVerificationLinkPage(pathname: string, search = ""): boolean {
  if (normalizeSurfacePath(pathname) !== "/conferma-email") return false;
  const query = search.startsWith("?") ? search.slice(1) : search;
  const token = new URLSearchParams(query).get("token");
  return token != null && token.trim() !== "";
}

/** Pagine della registrazione salone: restano sul sito clienti finché il salone non è pronto. */
export function isPublicSalonRegistrationPath(pathname: string): boolean {
  const path = normalizeSurfacePath(pathname);
  return (
    path === "/piani"
    || path.startsWith("/piani/")
    || path === "/registrazione/premium/checkout"
    || path === "/registrazione/premium/success"
    || path === "/conferma-email"
    || path === "/account/billing/checkout"
    || path === "/account/billing/success"
  );
}

export function panelKindForRoles(roles: { admin: boolean; owner: boolean; staff: boolean }): PanelHandoffKind | null {
  if (roles.admin) return "admin";
  if (roles.staff && !roles.owner) return "staff";
  if (roles.owner) return "salon";
  return null;
}

/** Pagina del pannello dopo il login, sullo stesso host del pannello. */
export function panelHomePath(kind: PanelHandoffKind): string {
  if (kind === "admin") return "/admin/dashboard";
  if (kind === "staff") return "/account/staff";
  return "/salone";
}

/**
 * URL assoluto dell'altra superficie, oppure null se il percorso è già sull'origine giusta.
 * La home di ricerca non apre i pannelli. I pannelli non rimandano alla home di ricerca.
 */
export function surfaceRedirectUrl(loc: SurfaceLocation = readSurfaceLocation()): string | null {
  const target = surfaceForPath(loc.pathname);
  const here = currentSurface(loc);
  if (here === "public" && target !== "public") return null;
  if (here !== "public" && target === "public") return null;
  if (target === here) return null;
  const next = urlForSurface(target, loc.pathname, loc.search, loc.hash, loc);
  const portPart = loc.port ? `:${loc.port}` : "";
  const current = `${loc.protocol}//${loc.hostname}${portPart}${loc.pathname}${loc.search}${loc.hash}`;
  return next === current ? null : next;
}
