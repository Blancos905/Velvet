/** Base URL senza slash finale; vuoto → path relativi (proxy Vite `/api`). */
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * In dev, se {@code VITE_API_BASE_URL} punta allo stesso host+porta del dev server Vite ma con
 * {@code localhost} vs {@code 127.0.0.1} rispetto alla pagina, un URL assoluto diventa cross-origin e Safari/WebKit
 * risponde «cannot load … due to access control checks». In quel caso usiamo path relativi (stesso origin della pagina).
 */
function tryDevRelativeWhenApiIsSamePortAsPage(baseUrl: string, normalizedPath: string): string | null {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }
  try {
    const baseHasScheme = /^https?:\/\//i.test(baseUrl);
    const api = new URL(baseHasScheme ? baseUrl : `http://${baseUrl}`);
    if (!LOCAL_DEV_HOSTS.has(api.hostname) || !LOCAL_DEV_HOSTS.has(window.location.hostname)) {
      return null;
    }
    const pagePort = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
    const apiPort = api.port || (api.protocol === "https:" ? "443" : "80");
    if (apiPort !== pagePort) {
      return null;
    }
    const apiPath = api.pathname.replace(/\/+$/, "") || "/";
    /** Vite: `/` oppure `/api` (base tipo `http://localhost:5173/api`) — in entrambi i casi il proxy è sul path `/api/...`. */
    if (apiPath !== "/" && apiPath !== "/api") {
      return null;
    }
    let out = normalizedPath;
    if (apiPath === "/" && baseUrl.replace(/\/+$/, "").endsWith("/api") && out.startsWith("/api/")) {
      out = out.slice(4);
    }
    return out.startsWith("/") ? out : `/${out}`;
  }
  catch {
    return null;
  }
}

export function apiUrl(path: string): string {
  let p = path.startsWith("/") ? path : `/${path}`;
  if (!apiBaseUrl) {
    return p;
  }
  /*
   * Dev: se la base API è sullo stesso numero di porta del dev server Vite (localhost o 127.0.0.1),
   * usiamo sempre path relativi `/api/...`. Altrimenti un URL assoluto tipo `http://localhost:5173/api/...`
   * aperto da `http://127.0.0.1:5173` scatena «cannot load … due to access control checks» in Safari/WebKit.
   */
  if (import.meta.env.DEV && typeof window !== "undefined" && p.startsWith("/api/")) {
    try {
      const baseHasScheme = /^https?:\/\//i.test(apiBaseUrl);
      const api = new URL(baseHasScheme ? apiBaseUrl : `http://${apiBaseUrl}`);
      if (LOCAL_DEV_HOSTS.has(api.hostname) && LOCAL_DEV_HOSTS.has(window.location.hostname)) {
        const pagePort = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
        const apiPort = api.port || (api.protocol === "https:" ? "443" : "80");
        if (pagePort === apiPort) {
          return p;
        }
      }
    } catch {
      /* fall through */
    }
  }
  const devRelative = tryDevRelativeWhenApiIsSamePortAsPage(apiBaseUrl, p);
  if (devRelative != null) {
    return devRelative;
  }
  /** Evita `/api/api/v1/...` se la base termina già con `/api` e i path sono `/api/v1/...`. */
  if (apiBaseUrl.endsWith("/api") && p.startsWith("/api/")) {
    p = p.slice(4);
  }
  return `${apiBaseUrl}${p}`;
}

/**
 * Destinazione «Diventa partner».
 * Default: pagina interna `/partner` (sempre raggiungibile). In produzione si può puntare a un URL esterno
 * (es. portale onboarding) impostando `VITE_PARTNER_SIGNUP_URL`.
 */
export const partnerSignupUrl = import.meta.env.VITE_PARTNER_SIGNUP_URL ?? "/partner";

/** Email contatto B2B (opzionale): pulsante mailto sulla pagina partner. */
export const partnerContactEmail = (import.meta.env.VITE_PARTNER_CONTACT_EMAIL ?? "").trim();

/**
 * Chiave Maps Embed API (opzionale). Se valorizzata, l’iframe usa `embed/v1/place`; altrimenti embed classico
 * `output=embed` (può variare per policy Google).
 */
export const googleMapsEmbedApiKey = (import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY ?? "").trim();

/** Google Play — footer e CTA download app (override con VITE_PLAY_STORE_URL). */
export const playStoreUrl = (
  import.meta.env.VITE_PLAY_STORE_URL ??
  "https://play.google.com/store/apps/details?id=it.saloniluxury.velvet_app"
).trim();

/**
 * App Store — footer download app.
 * Impostare VITE_APP_STORE_URL con il link definitivo (es. https://apps.apple.com/app/id…).
 * Se assente, il badge App Store non viene mostrato (evita link placeholder in produzione).
 */
export const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL ?? "").trim();
