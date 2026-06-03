import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiJson } from "../api/client";
import { isVelvetAccessTokenExpired } from "../lib/velvetAccessTokenExpiry";
import { velvetJwtHintsFromAccessToken } from "../lib/velvetJwtHintsFromAccessToken";
import {
  clearAdminAccessToken,
  readAdminAccessToken,
  VELVET_ADMIN_SESSION_CHANGED_EVENT,
  VELVET_SUPER_ADMIN_TOKEN_KEY,
  writeAdminAccessToken,
} from "./adminSession";
import { useVelvetSessionExpiryWatchdog } from "./useVelvetSessionExpiryWatchdog";

type AdminAuthLoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export type AdminAuthContextValue = {
  accessToken: string | undefined;
  isAdminSession: boolean;
  isLoading: boolean;
  signInWithUsernamePassword: (username: string, password: string) => Promise<void>;
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

function readValidAdminAccessToken(): string | undefined {
  const raw = readAdminAccessToken();
  if (!raw) return undefined;
  if (isVelvetAccessTokenExpired(raw)) {
    clearAdminAccessToken();
    return undefined;
  }
  return raw;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | undefined>(() => readValidAdminAccessToken());
  const [isLoading, setIsLoading] = useState(false);

  const signOut = useCallback(() => {
    clearAdminAccessToken();
    setAccessToken(undefined);
  }, []);

  useVelvetSessionExpiryWatchdog(accessToken, signOut);

  useEffect(() => {
    const syncFromStorage = () => setAccessToken(readValidAdminAccessToken());
    syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === sessionStorage && e.key === VELVET_SUPER_ADMIN_TOKEN_KEY) {
        setAccessToken(e.newValue ?? undefined);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(VELVET_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(VELVET_ADMIN_SESSION_CHANGED_EVENT, syncFromStorage);
    };
  }, []);

  const signInWithUsernamePassword = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const body = await apiJson<AdminAuthLoginResponse>("/api/v1/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const roles = velvetJwtHintsFromAccessToken(body.accessToken).realmRoles;
      if (!roles.includes("ADMIN")) {
        throw new Error("Risposta login non valida: ruolo admin assente.");
      }
      writeAdminAccessToken(body.accessToken);
      setAccessToken(body.accessToken);
    } finally {
      setIsLoading(false);
    }
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
      isLoading,
      signInWithUsernamePassword,
      signOut,
    };
  }, [accessToken, isLoading, signInWithUsernamePassword, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
