/**
 * Chiede alla shell Flutter di rileggere JWT + `GET /api/v1/me/salon`
 * (canale `LuxuryProfileMenu`) dopo login o attivazione Premium.
 */
export function notifyNativeSalonSessionSync(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("luxury_native_salon_plan_epoch", String(Date.now()));
  } catch {
    /* sessionStorage non disponibile */
  }
  try {
    const channel = (window as Window & { LuxuryProfileMenu?: { postMessage?: (msg: string) => void } })
      .LuxuryProfileMenu;
    if (typeof channel?.postMessage === "function") {
      channel.postMessage("sync");
    }
  } catch {
    /* canale assente fuori dalla WebView */
  }
}
