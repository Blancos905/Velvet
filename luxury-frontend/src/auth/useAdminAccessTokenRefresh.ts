import { useEffect } from "react";
import { isLuxuryAccessTokenExpired, readJwtExpirationEpochMs } from "../lib/luxuryAccessTokenExpiry";
import { refreshAdminAccessToken } from "./adminRefreshSession";

const REFRESH_LEAD_MS = 60_000;

/** Rinnova il JWT super admin prima della scadenza; chiama `onRefreshFailed` solo se il refresh fallisce. */
export function useAdminAccessTokenRefresh(
  accessToken: string | undefined,
  onRefreshed: (token: string) => void,
  onRefreshFailed: () => void,
): void {
  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    let timer: number | undefined;

    const attemptRefresh = async (): Promise<boolean> => {
      const next = await refreshAdminAccessToken();
      if (cancelled) return false;
      if (next && !isLuxuryAccessTokenExpired(next)) {
        onRefreshed(next);
        return true;
      }
      onRefreshFailed();
      return false;
    };

    const schedule = (token: string) => {
      if (timer != null) {
        window.clearTimeout(timer);
      }
      if (isLuxuryAccessTokenExpired(token)) {
        void attemptRefresh();
        return;
      }
      const expMs = readJwtExpirationEpochMs(token);
      if (expMs == null) return;
      const delay = Math.max(0, expMs - Date.now() - REFRESH_LEAD_MS);
      timer = window.setTimeout(() => {
        void attemptRefresh();
      }, delay);
    };

    schedule(accessToken);

    const onResume = () => {
      if (isLuxuryAccessTokenExpired(accessToken)) {
        void attemptRefresh();
      } else {
        schedule(accessToken);
      }
    };
    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onResume);

    return () => {
      cancelled = true;
      if (timer != null) {
        window.clearTimeout(timer);
      }
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [accessToken, onRefreshed, onRefreshFailed]);
}
