import { isNativeAccountHubPath, type NativeAccountHubRole } from "./nativeAccountHubPaths";

/** Scroll window/document (+ contenitori tipici WebView) in cima. */
export function scrollAccountHubToTop(instant = false): void {
  const behavior: ScrollBehavior = instant ? "auto" : "smooth";
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;

  const main = document.querySelector(".luxury-layout-main");
  if (main instanceof HTMLElement) {
    main.scrollTop = 0;
    main.scrollLeft = 0;
  }
  const hub = document.querySelector(".luxury-account-hub--native-hub");
  if (hub instanceof HTMLElement) {
    hub.scrollTop = 0;
    hub.scrollLeft = 0;
  }
}

/**
 * Torna in cima all’hub nativo dopo chiusura overlay (Agenda, Info privacy, …).
 * Usa più frame: la history restoration del browser può ripristinare lo scroll dopo il primo paint.
 */
export function ensureNativeAccountHubScrolledToTop(): void {
  scrollAccountHubToTop(true);
  window.requestAnimationFrame(() => {
    scrollAccountHubToTop(true);
    window.setTimeout(() => scrollAccountHubToTop(true), 50);
    window.setTimeout(() => scrollAccountHubToTop(true), 200);
  });
}

/** Scroll al contenuto account dopo tap sui bottoni hub (sotto masthead + navigazione). */
export function scrollAccountHubToContent(hubBody?: HTMLElement | null): void {
  const overlayBody = document.querySelector(".luxury-native-account-overlay__body");
  if (overlayBody instanceof HTMLElement) {
    overlayBody.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  // Hub nativo (/account/salone, /account/staff, …): masthead + griglia — sempre in cima.
  if (document.querySelector(".luxury-account-hub--native-hub")) {
    ensureNativeAccountHubScrolledToTop();
    return;
  }

  const target = hubBody ?? document.getElementById("luxury-account-hub-body");
  if (!(target instanceof HTMLElement)) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function isAccountInternalNavigation(fromPath: string, toPath: string): boolean {
  return fromPath.startsWith("/account") && toPath.startsWith("/account");
}

/** Navigazione verso hub nativo (es. chiusura overlay Agenda → /account/salone): va in cima. */
export function isReturnToNativeAccountHub(
  fromPath: string,
  toPath: string,
  role?: NativeAccountHubRole,
): boolean {
  if (!fromPath.startsWith("/account") || !toPath.startsWith("/account")) return false;
  if (isNativeAccountHubPath(fromPath, role)) return false;
  return isNativeAccountHubPath(toPath, role);
}
