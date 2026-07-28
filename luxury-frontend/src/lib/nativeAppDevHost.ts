import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);
const NATIVE_DEV_ORIGIN_KEY = "luxury_native_dev_origin";

function isLanDevHostname(hostname: string): boolean {
  return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

function isDevHostDrift(hostname: string): boolean {
  return LOCAL_DEV_HOSTS.has(hostname) || isLanDevHostname(hostname);
}

function currentLocationHost(): string {
  const { hostname, port } = window.location;
  return `${hostname}${port ? `:${port}` : ""}`;
}

/** Allinea host dev (localhost o IP LAN diverso) all'origin della WebView app. */
export function normalizeNativeDevPageHost(): void {
  if (!import.meta.env.DEV || typeof window === "undefined" || !isLuxuryNativeAppShell()) {
    return;
  }
  rememberNativeDevOrigin();
  const preferred = preferredNativeDevOrigin();
  const { pathname, search, hash } = window.location;
  const host = window.location.hostname;

  if (preferred) {
    const preferredHost = new URL(preferred).host;
    if (currentLocationHost() !== preferredHost && isDevHostDrift(host)) {
      window.location.replace(`${preferred}${pathname}${search}${hash}`);
      return;
    }
    return;
  }

  if (LOCAL_DEV_HOSTS.has(host) && host !== "127.0.0.1") {
    const portPart = window.location.port ? `:${window.location.port}` : "";
    window.location.replace(
      `${window.location.protocol}//127.0.0.1${portPart}${pathname}${search}${hash}`,
    );
  }
}

/** Stripe può reindirizzare a localhost mentre la WebView usa la LAN: riallinea al ritorno post-pagamento. */
export function repairNativeDevStripeReturnUrl(): void {
  if (!import.meta.env.DEV || typeof window === "undefined" || !isLuxuryNativeAppShell()) {
    return;
  }
  rememberNativeDevOrigin();
  const preferred = preferredNativeDevOrigin();
  const { pathname, search, hash } = window.location;
  const host = window.location.hostname;

  if (preferred) {
    const preferredHost = new URL(preferred).host;
    if (currentLocationHost() !== preferredHost && isDevHostDrift(host)) {
      window.location.replace(`${preferred}${pathname}${search}${hash}`);
      return;
    }
    return;
  }

  if (!LOCAL_DEV_HOSTS.has(host)) {
    return;
  }
  const portPart = window.location.port ? `:${window.location.port}` : "";
  window.location.replace(
    `${window.location.protocol}//127.0.0.1${portPart}${pathname}${search}${hash}`,
  );
}

/** Memorizza l'origin LAN della WebView (es. 192.168.x) per riallineare link email e ritorni Stripe. */
export function bootstrapNativeDevOrigin(): void {
  rememberNativeDevOrigin();
}

function rememberNativeDevOrigin(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  const { hostname, origin } = window.location;
  if (LOCAL_DEV_HOSTS.has(hostname)) {
    return;
  }
  if (!isLanDevHostname(hostname)) {
    return;
  }
  sessionStorage.setItem(NATIVE_DEV_ORIGIN_KEY, origin);
}

function preferredNativeDevOrigin(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const stored = sessionStorage.getItem(NATIVE_DEV_ORIGIN_KEY)?.trim();
  if (stored) {
    return stored.replace(/\/+$/, "");
  }
  return null;
}

export function normalizeNativeDevAbsoluteUrl(rawUrl: string): string {
  if (!import.meta.env.DEV || !isLuxuryNativeAppShell()) {
    return rawUrl;
  }
  const preferred = preferredNativeDevOrigin();
  if (!preferred) {
    return rawUrl;
  }
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (!isDevHostDrift(url.hostname)) {
      return rawUrl;
    }
    const preferredHost = new URL(preferred).host;
    if (`${url.hostname}${url.port ? `:${url.port}` : ""}` === preferredHost) {
      return url.toString();
    }
    return `${preferred}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawUrl;
  }
}
