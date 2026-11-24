import { useEffect } from "react";
import { isLuxuryAccessTokenExpired, readJwtExpirationEpochMs } from "../lib/luxuryAccessTokenExpiry";
import { isLuxuryLoginSessionExpired, readLuxurySessionExpiresAtMs } from "../lib/luxurySessionStartedAt";

/** Rimuove token scaduto e richiama `onExpired` al momento della scadenza (JWT o 24h dal login). */
export function useLuxurySessionExpiryWatchdog(
  accessToken: string | undefined,
  onExpired: () => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    const runCheck = (): boolean => {
      if (isLuxuryLoginSessionExpired() || isLuxuryAccessTokenExpired(accessToken)) {
        onExpired();
        return true;
      }
      return false;
    };

    if (runCheck()) return;

    const jwtExpMs = readJwtExpirationEpochMs(accessToken);
    const sessionExpMs = readLuxurySessionExpiresAtMs();
    const deadlines = [jwtExpMs, sessionExpMs].filter((value): value is number => value != null);
    if (deadlines.length === 0) return;

    const nextExpiryMs = Math.min(...deadlines);
    const delay = Math.max(0, nextExpiryMs - Date.now() + 50);
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
