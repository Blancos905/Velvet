import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isLuxuryAccessTokenExpired } from "../lib/luxuryAccessTokenExpiry";
import { notifyLuxurySessionEnded } from "../lib/luxuryLoginFormReset";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import {
  clearAdminSession,
  resolveValidAdminAccessToken,
  writeAdminAccessToken,
  LUXURY_ACCESS_TOKEN_KEY,
  LUXURY_ADMIN_SESSION_CHANGED_EVENT,
  LUXURY_SUPER_ADMIN_TOKEN_KEY,
} from "./adminSession";
import { logoutAdminSession, refreshAdminAccessToken, syncAdminRefreshTokenFromLuxurySession } from "./adminRefreshSession";
import { useAdminAccessTokenRefresh } from "./useAdminAccessTokenRefresh";

export type AdminAuthContextValue = {
  accessToken: string | undefined;
  isAdminSession: boolean;
  isLoading: boolean;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/** Contesto admin assente (es. hot reload parziale): `null` invece di eccezione. */
export function useOptionalAdminAuth(): AdminAuthContextValue | null {
  return useContext(AdminAuthContext);
}

export function useAdminAuth(): AdminAuthContextValue {
  const v = useOptionalAdminAuth();
  if (!v) throw new Error("useAdminAuth fuori da AdminAuthProvider");
  return v;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = useCallback(() => {
    const hadSession =
      Boolean(accessToken) ||
      Boolean(resolveValidAdminAccessToken()) ||
      (typeof localStorage !== "undefined" && localStorage.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY)) ||
      (typeof sessionStorage !== "undefined" &&
        (sessionStorage.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY) || sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY)));
    void logoutAdminSession();
    clearAdminSession();
    setAccessToken(undefined);
    if (hadSession) {
      notifyLuxurySessionEnded();
    }
  }, [accessToken]);

  const onRefreshFailed = useCallback(() => {
    signOut();
  }, [signOut]);

  const onRefreshed = useCallback((token: string) => {
    writeAdminAccessToken(token);
    setAccessToken(token);
  }, []);

  useAdminAccessTokenRefresh(accessToken, onRefreshed, onRefreshFailed);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      syncAdminRefreshTokenFromLuxurySession();
      let token = resolveValidAdminAccessToken();
      if (!token) {
        const refreshed = await refreshAdminAccessToken();
        if (cancelled) return;
        if (refreshed && !isLuxuryAccessTokenExpired(refreshed)) {
          writeAdminAccessToken(refreshed);
          token = refreshed;
        }
      }
      if (!cancelled) {
        setAccessToken(token);
        setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncFromStorage = () => setAccessToken(resolveValidAdminAccessToken());
    const onStorage = (e: StorageEvent) => {
      if (
        e.storageArea === localStorage &&
        e.key === LUXURY_SUPER_ADMIN_TOKEN_KEY
      ) {
        syncFromStorage();
      }
      if (
        e.storageArea === sessionStorage &&
        (e.key === LUXURY_SUPER_ADMIN_TOKEN_KEY || e.key === LUXURY_ACCESS_TOKEN_KEY)
      ) {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LUXURY_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LUXURY_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => {
    const roles = luxuryJwtHintsFromAccessToken(accessToken).realmRoles;
    const isAdminSession =
      Boolean(accessToken) &&
      !isLuxuryAccessTokenExpired(accessToken) &&
      roles.includes("ADMIN");
    return {
      accessToken,
      isAdminSession,
      isLoading,
      signOut,
    };
  }, [accessToken, isLoading, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
