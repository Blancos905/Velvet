import { useEffect } from "react";
import { isVelvetAccessTokenExpired, readJwtExpirationEpochMs } from "../lib/velvetAccessTokenExpiry";

/** Rimuove token scaduto e richiama `onExpired` al momento della scadenza (o al ritorno sul tab). */
export function useVelvetSessionExpiryWatchdog(
  accessToken: string | undefined,
  onExpired: () => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const runCheck = (): boolean => {
      if (isVelvetAccessTokenExpired(accessToken)) {
        onExpired();
        return true;
      }
      return false;
    };

    if (runCheck()) return;

    const expMs = readJwtExpirationEpochMs(accessToken);
    if (expMs == null) return;

    const delay = Math.max(0, expMs - Date.now() + 50);
    const timer = window.setTimeout(runCheck, delay);

    const onResume = () => {
      runCheck();
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [accessToken, onExpired]);
}
