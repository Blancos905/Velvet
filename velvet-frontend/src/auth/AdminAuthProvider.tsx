import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isVelvetAccessTokenExpired } from "../lib/velvetAccessTokenExpiry";
import { notifyVelvetSessionEnded } from "../lib/velvetLoginFormReset";
import { velvetJwtHintsFromAccessToken } from "../lib/velvetJwtHintsFromAccessToken";
import {
  clearAdminAccessToken,
  resolveValidAdminAccessToken,
  VELVET_ACCESS_TOKEN_KEY,
  VELVET_ADMIN_SESSION_CHANGED_EVENT,
  VELVET_SUPER_ADMIN_TOKEN_KEY,
} from "./adminSession";
import { useVelvetSessionExpiryWatchdog } from "./useVelvetSessionExpiryWatchdog";

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
  const [accessToken, setAccessToken] = useState<string | undefined>(() => resolveValidAdminAccessToken());

  const signOut = useCallback(() => {
    const hadSession =
      Boolean(accessToken) ||
      (typeof sessionStorage !== "undefined" &&
        (sessionStorage.getItem(VELVET_SUPER_ADMIN_TOKEN_KEY) || sessionStorage.getItem(VELVET_ACCESS_TOKEN_KEY)));
    clearAdminAccessToken();
    setAccessToken(undefined);
    if (hadSession) {
      notifyVelvetSessionEnded();
    }
  }, [accessToken]);

  useVelvetSessionExpiryWatchdog(accessToken, signOut);

  useEffect(() => {
    const syncFromStorage = () => setAccessToken(resolveValidAdminAccessToken());
    syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (
        e.storageArea === sessionStorage &&
        (e.key === VELVET_SUPER_ADMIN_TOKEN_KEY || e.key === VELVET_ACCESS_TOKEN_KEY)
      ) {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(VELVET_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(VELVET_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => {
    const roles = velvetJwtHintsFromAccessToken(accessToken).realmRoles;
    const isAdminSession =
      Boolean(accessToken) &&
      !isVelvetAccessTokenExpired(accessToken) &&
      roles.includes("ADMIN");
    return {
      accessToken,
      isAdminSession,
      isLoading: false,
      signOut,
    };
  }, [accessToken, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
