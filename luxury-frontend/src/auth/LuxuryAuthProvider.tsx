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
import { setLuxuryAccountClosedHandler } from "../api/accountClosedSession";
import { setLuxurySessionExpiredHandler } from "../api/luxurySessionExpired";
import type { MeSalonSummary, MeStaffSalon, ProfileDto } from "../api/types";
import type { SalonPlanTier } from "../data/salonPlans";
import { clearIntendedSalonPlan, persistIntendedSalonPlan } from "../lib/salonRegistrationPostLogin";
import { isLuxuryAccessTokenExpired } from "../lib/luxuryAccessTokenExpiry";
import { normalizePostLoginReturnPath, setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { notifyLuxurySessionEnded } from "../lib/luxuryLoginFormReset";
import { redirectAfterLuxuryLogout } from "../lib/postLogoutRedirect";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import { humanizePostRegistrationAuthError } from "../utils/authErrors";
import { clearMeNotificationsQueryGateFlags } from "../lib/meNotificationsQueryGate";
import { primeInAppAlertSound } from "../lib/luxuryInAppSoundBus";
import { clearAdminSession, markAdminImpersonationActive, writeAdminAccessToken } from "./adminSession";
import { syncAdminRefreshTokenFromLuxurySession, writeAdminRefreshToken } from "./adminRefreshSession";
import {
  clearStoredRefreshToken,
  logoutLuxurySession,
  readStoredRefreshToken,
  refreshLuxuryAccessToken,
  writeStoredRefreshToken,
  type AuthLoginResponse,
} from "./luxuryRefreshSession";
import { unregisterLuxuryFcmDevice } from "../api/fcmDevice";
import { useLuxurySessionExpiryWatchdog } from "./useLuxurySessionExpiryWatchdog";

import { LUXURY_ACCESS_TOKEN_KEY } from "./adminSession";

const ACCESS_TOKEN_STORAGE_KEY = LUXURY_ACCESS_TOKEN_KEY;

function readStoredAccessToken(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? undefined;
  if (!raw) return undefined;
  if (isLuxuryAccessTokenExpired(raw)) {
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

export type SignInWithIssuedTokenOptions = {
  /** Impersonazione da pannello admin: mantiene JWT super admin in `localStorage`. */
  preserveAdminSession?: boolean;
};

export type LuxuryAuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signUpForSalon: (plan: SalonPlanTier) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  /**
   * Imposta la sessione app Luxury da un JWT già emesso (es. impersonazione titolare da super admin).
   * Non modifica il token super admin in `luxury_super_admin_access_token` se il JWT non contiene ruolo ADMIN.
   */
  signInWithIssuedToken: (accessToken: string, options?: SignInWithIssuedTokenOptions) => Promise<void>;
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
  /** Ruolo {@code ADMIN} nel JWT (profilo allineato al super admin Luxury). */
  isLuxurySuperAdmin: boolean;
  salonPlanHint: SalonPlanTier | undefined;
};

const LuxuryAuthContext = createContext<LuxuryAuthContextValue | null>(null);

export function useLuxuryAuth(): LuxuryAuthContextValue {
  const v = useContext(LuxuryAuthContext);
  if (!v) throw new Error("useLuxuryAuth fuori da LuxuryAuthProvider");
  return v;
}

export function LuxuryAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | undefined>(() => readStoredAccessToken());
  const [isLoading, setIsLoading] = useState(false);

  const persistToken = useCallback((token: string) => {
    clearMeNotificationsQueryGateFlags();
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    if (luxuryJwtHintsFromAccessToken(token).realmRoles.includes("ADMIN")) {
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
      notifyLuxurySessionEnded();
    }
  }, [accessToken]);

  const expireSession = useCallback(() => {
    clearToken();
    clearAdminSession();
    queryClient.removeQueries({ queryKey: ["me"] });
  }, [clearToken, queryClient]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (accessToken && !isLuxuryAccessTokenExpired(accessToken)) {
        return;
      }
      // Evita POST /refresh (401 in console) quando non c'è alcuna sessione da rinnovare.
      if (!accessToken && !readStoredRefreshToken()) {
        return;
      }
      const refreshed = await refreshLuxuryAccessToken();
      if (!cancelled && refreshed && !isLuxuryAccessTokenExpired(refreshed)) {
        persistToken(refreshed);
        if (luxuryJwtHintsFromAccessToken(refreshed).realmRoles.includes("ADMIN")) {
          syncAdminRefreshTokenFromLuxurySession();
        }
        return;
      }
      if (!cancelled && accessToken && luxuryJwtHintsFromAccessToken(accessToken).realmRoles.includes("ADMIN")) {
        writeAdminAccessToken(accessToken);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, persistToken]);

  useLuxurySessionExpiryWatchdog(accessToken, expireSession);

  useEffect(() => {
    if (!accessToken || isLuxuryAccessTokenExpired(accessToken)) return;
    clearMeNotificationsQueryGateFlags();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || isLuxuryAccessTokenExpired(accessToken)) return;
    if (luxuryJwtHintsFromAccessToken(accessToken).realmRoles.includes("ADMIN")) {
      writeAdminAccessToken(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    setLuxurySessionExpiredHandler(expireSession);
    return () => setLuxurySessionExpiredHandler(null);
  }, [expireSession]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === sessionStorage && e.key === ACCESS_TOKEN_STORAGE_KEY) {
        const next = e.newValue ?? undefined;
        if (next && isLuxuryAccessTokenExpired(next)) {
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
    setLuxuryAccountClosedHandler(expireSession);
    return () => setLuxuryAccountClosedHandler(null);
  }, [expireSession]);

  const value = useMemo<LuxuryAuthContextValue>(() => {
    const { realmRoles, salonPlanHint } = luxuryJwtHintsFromAccessToken(accessToken);
    const isSalonTitolare = realmRoles.includes("OWNER");
    const isSalonStaff = realmRoles.includes("STAFF") && !realmRoles.includes("OWNER");
    const isLuxurySuperAdmin = realmRoles.includes("ADMIN");
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
      Boolean(accessToken) && !isLuxuryAccessTokenExpired(accessToken);

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
        clearAdminSession();
        setIsLoading(true);
        try {
          const body = await apiJson<AuthLoginResponse>("/api/v1/auth/login", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ email: normalizedUsername, password }),
          });
          queryClient.removeQueries({ queryKey: ["me"] });
          persistToken(body.accessToken);
          const token = body.accessToken;
          const rolesAfterLogin = luxuryJwtHintsFromAccessToken(token).realmRoles;
          if (body.refreshToken) {
            writeStoredRefreshToken(body.refreshToken);
            if (rolesAfterLogin.includes("ADMIN")) {
              writeAdminRefreshToken(body.refreshToken);
            }
          }
          await yieldToBrowser();
          await yieldToBrowser();
          if (!rolesAfterLogin.includes("OWNER")) {
            clearIntendedSalonPlan();
          }
          if (token && rolesAfterLogin.includes("ADMIN")) {
            writeAdminAccessToken(token);
          }
          /* Hub «Ciao [nome]»: serve displayName da /me/profile (non è nel JWT). */
          if (token) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "profile", token],
                queryFn: () => apiJson<ProfileDto>("/api/v1/me/profile", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
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
          if (
            token
            && (rolesAfterLogin.includes("STAFF") || rolesAfterLogin.includes("OWNER"))
          ) {
            void primeInAppAlertSound(true);
          }
        } catch (e: unknown) {
          throw new Error(humanizePostRegistrationAuthError(e));
        } finally {
          setIsLoading(false);
        }
      },
      signInWithIssuedToken: async (token: string, options?: SignInWithIssuedTokenOptions) => {
        if (options?.preserveAdminSession) {
          markAdminImpersonationActive();
        } else {
          clearAdminSession();
        }
        setIsLoading(true);
        try {
          queryClient.removeQueries({ queryKey: ["me"] });
          persistToken(token);
          await yieldToBrowser();
          await yieldToBrowser();
          const rolesAfterLogin = luxuryJwtHintsFromAccessToken(token).realmRoles;
          if (token && rolesAfterLogin.includes("ADMIN")) {
            writeAdminAccessToken(token);
          }
          if (token) {
            try {
              await queryClient.prefetchQuery({
                queryKey: ["me", "profile", token],
                queryFn: () => apiJson<ProfileDto>("/api/v1/me/profile", { accessToken: token }),
              });
            } catch {
              /* prefetch best-effort */
            }
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
          if (
            token
            && (rolesAfterLogin.includes("STAFF") || rolesAfterLogin.includes("OWNER"))
          ) {
            void primeInAppAlertSound(true);
          }
        } finally {
          setIsLoading(false);
        }
      },
      signOut: async () => {
        await unregisterLuxuryFcmDevice(accessToken);
        await logoutLuxurySession();
        clearToken();
        clearAdminSession();
        queryClient.removeQueries({ queryKey: ["me"] });
        redirectAfterLuxuryLogout();
      },
      signOutForAccountSwitch: async () => {
        await unregisterLuxuryFcmDevice(accessToken);
        await logoutLuxurySession();
        clearToken();
        clearAdminSession();
        queryClient.removeQueries({ queryKey: ["me"] });
      },
      accessToken,
      userEmail,
      userDisplayLabel,
      realmRoles,
      isSalonTitolare,
      isSalonStaff,
      isLuxurySuperAdmin,
      salonPlanHint,
    };
  }, [accessToken, isLoading, clearToken, persistToken, queryClient]);

  return <LuxuryAuthContext.Provider value={value}>{children}</LuxuryAuthContext.Provider>;
}
