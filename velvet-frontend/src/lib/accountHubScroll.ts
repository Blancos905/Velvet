/** Scroll al contenuto account dopo tap sui bottoni hub (sotto masthead + navigazione). */
export function scrollAccountHubToContent(hubBody?: HTMLElement | null): void {
  const overlayBody = document.querySelector(".luxury-native-account-overlay__body");
  if (overlayBody instanceof HTMLElement) {
    overlayBody.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const target = hubBody ?? document.getElementById("luxury-account-hub-body");
  if (!(target instanceof HTMLElement)) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function isAccountInternalNavigation(fromPath: string, toPath: string): boolean {
  return fromPath.startsWith("/account") && toPath.startsWith("/account");
}
