import { useEffect } from "react";

/** WebView Flutter: user agent impostato in velvet-app/lib/shell/velvet_web_shell.dart */
const NATIVE_APP_UA_MARKERS = [/SaloniLuxuryApp\//i, /VelvetMobileApp/i];

export function isVelvetNativeAppShell(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  return NATIVE_APP_UA_MARKERS.some((marker) => marker.test(ua));
}

/** True quando la pagina gira nell'app mobile (non nel browser del sito). */
export function useVelvetNativeAppShell(): boolean {
  return isVelvetNativeAppShell();
}

/** Classe su `<html>` per stili dedicati alla WebView Flutter. */
export function useVelvetNativeAppDocumentClass(): void {
  useEffect(() => {
    if (!isVelvetNativeAppShell()) {
      return;
    }
    document.documentElement.classList.add("luxury-native-app");
    return () => document.documentElement.classList.remove("luxury-native-app");
  }, []);
}
