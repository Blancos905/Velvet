import { useEffect } from "react";

/** WebView Flutter: user agent impostato in luxury-app/lib/shell/luxury_web_shell.dart */
const NATIVE_APP_UA_MARKERS = [/SaloniLuxuryApp\//i, /LuxuryMobileApp/i];

export function isLuxuryNativeAppShell(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return NATIVE_APP_UA_MARKERS.some((marker) => marker.test(ua));
}

/** True quando la pagina gira nell'app mobile (non nel browser del sito). */
export function useLuxuryNativeAppShell(): boolean {
  return isLuxuryNativeAppShell();
}

/** Classe su `<html>` per stili dedicati alla WebView Flutter. */
export function useLuxuryNativeAppDocumentClass(): void {
  useEffect(() => {
    if (!isLuxuryNativeAppShell()) {
      return;
    }
    document.documentElement.classList.add("luxury-native-app");
    return () => document.documentElement.classList.remove("luxury-native-app");
  }, []);
}
