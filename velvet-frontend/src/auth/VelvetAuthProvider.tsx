import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiJson } from "../api/client";
import { setVelvetAccountClosedHandler } from "../api/accountClosedSession";
import { setVelvetSessionExpiredHandler } from "../api/velvetSessionExpired";
import type { MeSalonSummary, MeStaffSalon } from "../api/types";
import type { SalonPlanTier } from "../data/salonPlans";
import { clearIntendedSalonPlan, persistIntendedSalonPlan } from "../lib/salonRegistrationPostLogin";
import { isVelvetAccessTokenExpired } from "../lib/velvetAccessTokenExpiry";
import { normalizePostLoginReturnPath, setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { notifyVelvetSessionEnded } from "../lib/velvetLoginFormReset";
import { redirectAfterVelvetLogout } from "../lib/postLogoutRedirect";
import { velvetJwtHintsFromAccessToken } from "../lib/velvetJwtHintsFromAccessToken";
import { humanizePostRegistrationAuthError } from "../utils/oidcErrors";
import { clearAdminAccessToken, writeAdminAccessToken } from "./adminSession";
import {
  clearStoredRefreshToken,
  logoutVelvetSession,
  readStoredRefreshToken,
  refreshVelvetAccessToken,
  writeStoredRefreshToken,
  type AuthLoginResponse,
} from "./velvetRefreshSession";
import { unregisterVelvetFcmDevice } from "../api/fcmDevice";
import { useVelvetSessionExpiryWatchdog } from "./useVelvetSessionExpiryWatchdog";

import { VELVET_ACCESS_TOKEN_KEY } from "./adminSession";

const ACCESS_TOKEN_STORAGE_KEY = VELVET_ACCESS_TOKEN_KEY;

function readStoredAccessToken(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? undefined;
  if (!raw) return undefined;
  if (isVelvetAccessTokenExpired(raw)) {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return undefined;
  }
  return raw;
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });
}

export type VelvetAuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signUpForSalon: (plan: SalonPlanTier) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /**
   * Imposta la sessione app Velvet da un JWT già emesso (es. impersonazione titolare da super admin).
   * Non modifica il token super admin in `velvet_super_admin_access_token` se il JWT non contiene ruolo ADMIN.
   */
  signInWithIssuedToken: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Chiude la sessione app senza redirect post-logout (es. passaggio da super admin a titolare salone). */
  signOutForAccountSwitch: () => Promise<void>;
  accessToken: string | undefined;
  userEmail: string | undefined;
  userDisplayLabel: string | undefined;
  realmRoles: readonly string[];
  isSalonTitolare: boolean;
  /** Ruolo {@code STAFF} (operatore salone, area agenda dedicata). */
  isSalonStaff: boolean;
  /** Ruolo {@code ADMIN} nel JWT (profilo allineato al super admin Velvet). */
  isVelvetSuperAdmin: boolean;
  salonPlanHint: SalonPlanTier | undefined;
};

const VelvetAuthContext = createContext<VelvetAuthContextValue | null>(null);

export function useVelvetAuth(): VelvetAuthContextValue {
  const v = useContext(VelvetAuthContext);
  if (!v) throw new Error("useVelvetAuth fuori da VelvetAuthProvider");
  return v;
}

export function VelvetAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | undefined>(() => readStoredAccessToken());
  const [isLoading, setIsLoading] = useState(false);

  const persistToken = useCallback((token: string) => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    if (velvetJwtHintsFromAccessToken(token).realmRoles.includes("ADMIN")) {
      writeAdminAccessToken(token);
    }
    setAccessToken(token);
  }, []);

  const clearToken = useCallback(() => {
    const hadSession =
      Boolean(accessToken) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    clearStoredRefreshToken();
    setAccessToken(undefined);
    if (hadSession) {
      notifyVelvetSessionEnded();
    }
  }, [accessToken]);

  const expireSession = useCallback(() => {
    clearToken();
    clearAdminAccessToken();
    queryClient.removeQueries({ queryKey: ["me"] });
  }, [clearToken, queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (accessToken && !isVelvetAccessTokenExpired(accessToken)) {
        return;
      }
      // Evita POST /refresh (401 in console) quando non c'è alcuna sessione da rinnovare.
      if (!accessToken && !readStoredRefreshToken()) {
        return;
      }
      const refreshed = await refreshVelvetAccessToken();
      if (!cancelled && refreshed && !isVelvetAccessTokenExpired(refreshed)) {
        persistToken(refreshed);
        return;
      }
      if (!cancelled && accessToken && velvetJwtHintsFromAccessToken(accessToken).realmRoles.includes("ADMIN")) {
        writeAdminAccessToken(accessToken);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, persistToken]);

  useVelvetSessionExpiryWatchdog(accessToken, expireSession);

  useEffect(() => {
    if (!accessToken || isVelvetAccessTokenExpired(accessToken)) return;
    if (velvetJwtHintsFromAccessToken(accessToken).realmRoles.includes("ADMIN")) {
      writeAdminAccessToken(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    setVelvetSessionExpiredHandler(expireSession);
    return () => setVelvetSessionExpiredHandler(null);
  }, [expireSession]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === sessionStorage && e.key === ACCESS_TOKEN_STORAGE_KEY) {
        const next = e.newValue ?? undefined;
        if (next && isVelvetAccessTokenExpired(next)) {
          expireSession();
          return;
        }
        setAccessToken(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [expireSession]);

  useEffect(() => {
    setVelvetAccountClosedHandler(expireSession);
    return () => setVelvetAccountClosedHandler(null);
  }, [expireSession]);

  const value = useMemo<VelvetAuthContextValue>(() => {
    const { realmRoles, salonPlanHint } = velvetJwtHintsFromAccessToken(accessToken);
    const isSalonTitolare = realmRoles.includes("OWNER");
    const isSalonStaff = realmRoles.includes("STAFF") && !realmRoles.includes("OWNER");
    const isVelvetSuperAdmin = realmRoles.includes("ADMIN");
    const payload = (() => {
      if (!accessToken) return null;
      try {
        const p = accessToken.split(".")[1];
        if (!p) return null;
        let b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4;
        if (pad === 2) b64 += "==";
        else if (pad === 3) b64 += "=";
        else if (pad === 1) return null;
        return JSON.parse(atob(b64)) as { email?: string };
      } catch {
        return null;
      }
    })();
    const userEmail = typeof payload?.email === "string" && payload.email.trim() ? payload.email.trim() : undefined;
    const userDisplayLabel = (() => {
      if (userEmail && userEmail.includes("@")) return userEmail.split("@")[0];
      return undefined;
    })();

    const sessionActive =
      Boolean(accessToken) && !isVelvetAccessTokenExpired(accessToken);

    return {
      isAuthenticated: sessionActive,
      isLoading,
      signIn: async () => {
        const raw = `${window.location.pathname}${window.location.search}`;
        setPostLoginReturnPath(normalizePostLoginReturnPath(raw));
        window.location.assign("/account");
      },
      signUpForSalon: (plan: SalonPlanTier) => {
        persistIntendedSalonPlan(plan);
      },
      signInWithPassword: async (email: string, password: string) => {
        const normalizedUsername = email.trim().toLowerCase();
        setIsLoading(true);
        try {
          const body = await apiJson<AuthLoginResponse>("/api/v1/auth/login", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ email: normalizedUsername, password }),
          });
          queryClient.removeQueries({ queryKey: ["me"] });
          persistToken(body.accessToken);
          if (body.refreshToken) {
            writeStoredRefreshToken(body.refreshToken);
          }
          await yieldToBrowser();
          await yieldToBrowser();
          const token = body.accessToken;
          const rolesAfterLogin = velvetJwtHintsFromAccessToken(token).realmRoles;
          if (!rolesAfterLogin.includes("OWNER")) {
            clearIntendedSalonPlan();
          }
          if (token && rolesAfterLogin.includes("ADMIN")) {
            writeAdminAccessToken(token);
          }
          if (token && rolesAfterLogin.includes("OWNER")) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "salon", token],
                queryFn: () => apiJson<MeSalonSummary>("/api/v1/me/salon", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
          }
          if (token && rolesAfterLogin.includes("STAFF") && !rolesAfterLogin.includes("OWNER")) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "staff", "salon", token],
                queryFn: () => apiJson<MeStaffSalon>("/api/v1/me/staff/salon", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
          }
        } catch (e: unknown) {
          throw new Error(humanizePostRegistrationAuthError(e));
        } finally {
          setIsLoading(false);
        }
      },
      signInWithIssuedToken: async (token: string) => {
        setIsLoading(true);
        try {
          queryClient.removeQueries({ queryKey: ["me"] });
          persistToken(token);
          await yieldToBrowser();
          await yieldToBrowser();
          const rolesAfterLogin = velvetJwtHintsFromAccessToken(token).realmRoles;
          if (token && rolesAfterLogin.includes("ADMIN")) {
            writeAdminAccessToken(token);
          }
          if (token && rolesAfterLogin.includes("OWNER")) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "salon", token],
                queryFn: () => apiJson<MeSalonSummary>("/api/v1/me/salon", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
          }
          if (token && rolesAfterLogin.includes("STAFF") && !rolesAfterLogin.includes("OWNER")) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "staff", "salon", token],
                queryFn: () => apiJson<MeStaffSalon>("/api/v1/me/staff/salon", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
          }
        } finally {
          setIsLoading(false);
        }
      },
      signOut: async () => {
        await unregisterVelvetFcmDevice(accessToken);
        await logoutVelvetSession();
        clearToken();
        clearAdminAccessToken();
        queryClient.removeQueries({ queryKey: ["me"] });
        redirectAfterVelvetLogout();
      },
      signOutForAccountSwitch: async () => {
        await unregisterVelvetFcmDevice(accessToken);
        await logoutVelvetSession();
        clearToken();
        clearAdminAccessToken();
        queryClient.removeQueries({ queryKey: ["me"] });
      },
      accessToken,
      userEmail,
      userDisplayLabel,
      realmRoles,
      isSalonTitolare,
      isSalonStaff,
      isVelvetSuperAdmin,
      salonPlanHint,
    };
  }, [accessToken, isLoading, clearToken, persistToken, queryClient]);

  return <VelvetAuthContext.Provider value={value}>{children}</VelvetAuthContext.Provider>;
}
