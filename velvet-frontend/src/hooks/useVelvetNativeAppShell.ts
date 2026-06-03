import { useEffect, useState } from "react";

/** WebView Flutter: user agent impostato in velvet-app/lib/shell/velvet_web_shell.dart */
const NATIVE_APP_UA_MARKER = /SaloniVelvetApp\//i;

export function isVelvetNativeAppShell(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return NATIVE_APP_UA_MARKER.test(navigator.userAgent);
}

/** True quando la pagina gira nell'app mobile (non nel browser del sito). */
export function useVelvetNativeAppShell(): boolean {
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(isVelvetNativeAppShell());
  }, []);

  return isNativeApp;
}

/** Classe su `<html>` per stili dedicati alla WebView Flutter. */
export function useVelvetNativeAppDocumentClass(): void {
  useEffect(() => {
    if (!isVelvetNativeAppShell()) {
      return;
    }
    document.documentElement.classList.add("velvet-native-app");
    return () => document.documentElement.classList.remove("velvet-native-app");
  }, []);
}
