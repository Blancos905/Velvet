import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { beginLuxuryAuthenticatedSession, clearLuxurySessionStartedAt, isLuxuryLoginSessionExpired } from "../lib/luxurySessionStartedAt";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import { clearMeNotificationsQueryGateFlags } from "../lib/meNotificationsQueryGate";
import { primeInAppAlertSound } from "../lib/luxuryInAppSoundBus";
import { currentSurface, panelKindForRoles, readSurfaceLocation } from "../lib/luxurySurfaces";
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
import {
  clearSessionMarkerCookie,
  clearStoredEpoch,
  readSessionMarker,
  readStoredEpoch,
  rememberSessionEpoch,
  sessionBootAction,
} from "../lib/luxurySessionMarker";
import {
  clearPublicSurfaceSessionReleased,
  isPublicSurfaceSessionReleased,
  markPublicSurfaceSessionReleased,
  shouldSkipSharedSessionRestore,
} from "../lib/publicSurfaceSessionRelease";

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
  /**
   * La home di ricerca lascia il pannello sull'altra origine.
   * Toglie solo la sessione di questa scheda: il cookie condiviso resta per la finestra del pannello.
   */
  releasePublicSurfaceAfterPanelOpen: () => void;
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

function discardSharedSession(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
  clearStoredRefreshToken();
  clearStoredEpoch();
  clearAdminSession();
}

function readBootSession(): { token: string | undefined; restore: boolean } {
  if (shouldSkipSharedSessionRestore(currentSurface(readSurfaceLocation()), isPublicSurfaceSessionReleased())) {
    discardSharedSession();
    return { token: undefined, restore: false };
  }
  const marker = readSessionMarker();
  const epoch = readStoredEpoch();
  const token = readStoredAccessToken();
  const action = sessionBootAction(marker, epoch, Boolean(token));
  if (action === "clear") {
    discardSharedSession();
    return { token: undefined, restore: false };
  }
  return { token, restore: action === "restore" };
}

export function LuxuryAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [boot] = useState(readBootSession);
  const restorePending = useRef(boot.restore);
  const [accessToken, setAccessToken] = useState<string | undefined>(boot.token);
  const [isLoading, setIsLoading] = useState(boot.restore);

  const persistToken = useCallback((token: string) => {
    clearMeNotificationsQueryGateFlags();
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    rememberSessionEpoch();
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
    clearStoredEpoch();
    clearPublicSurfaceSessionReleased();
    clearSessionMarkerCookie();
    clearLuxurySessionStartedAt();
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
    const marker = readSessionMarker();
    const epoch = readStoredEpoch();
    const markerMismatch = Boolean(marker) && epoch !== marker;
    const needsRefresh =
      markerMismatch
      || ((!accessToken || isLuxuryAccessTokenExpired(accessToken))
        && (Boolean(accessToken) || Boolean(readStoredRefreshToken()) || Boolean(marker)));
    const finishRestore = () => {
      if (!restorePending.current) return;
      restorePending.current = false;
      setIsLoading(false);
    };
    if (shouldSkipSharedSessionRestore(currentSurface(readSurfaceLocation()), isPublicSurfaceSessionReleased())) {
      finishRestore();
      return;
    }
    if (!needsRefresh) {
      if (accessToken && !isLuxuryAccessTokenExpired(accessToken)) {
        rememberSessionEpoch();
      }
      finishRestore();
      return;
    }
    // Evita POST /refresh (401 in console) quando non c'è alcuna sessione da rinnovare.
    if (!accessToken && !readStoredRefreshToken() && !marker) {
      finishRestore();
      return;
    }
    if (isLuxuryLoginSessionExpired()) {
      if (!cancelled) expireSession();
      finishRestore();
      return;
    }
    void (async () => {
      const refreshed = await refreshLuxuryAccessToken();
      if (cancelled) return;
      if (refreshed && !isLuxuryAccessTokenExpired(refreshed)) {
        if (shouldSkipSharedSessionRestore(currentSurface(readSurfaceLocation()), isPublicSurfaceSessionReleased())) {
          finishRestore();
          return;
        }
        persistToken(refreshed);
        if (luxuryJwtHintsFromAccessToken(refreshed).realmRoles.includes("ADMIN")) {
          syncAdminRefreshTokenFromLuxurySession();
        }
        finishRestore();
        return;
      }
      if (accessToken && luxuryJwtHintsFromAccessToken(accessToken).realmRoles.includes("ADMIN")) {
        writeAdminAccessToken(accessToken);
      }
      finishRestore();
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, persistToken, expireSession]);

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
          clearPublicSurfaceSessionReleased();
          beginLuxuryAuthenticatedSession();
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
            && currentSurface(readSurfaceLocation()) !== "public"
          ) {
            void primeInAppAlertSound(true);
          }
        } finally {
          setIsLoading(false);
        }
      },
      signInWithIssuedToken: async (token: string, options?: SignInWithIssuedTokenOptions) => {
        clearPublicSurfaceSessionReleased();
        if (options?.preserveAdminSession) {
          markAdminImpersonationActive();
        } else {
          clearAdminSession();
        }
        setIsLoading(true);
        try {
          queryClient.removeQueries({ queryKey: ["me"] });
          beginLuxuryAuthenticatedSession();
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
            && currentSurface(readSurfaceLocation()) !== "public"
          ) {
            void primeInAppAlertSound(true);
          }
        } finally {
          setIsLoading(false);
        }
      },
      signOut: async () => {
        const panel = panelKindForRoles({
          admin: isLuxurySuperAdmin,
          owner: isSalonTitolare,
          staff: isSalonStaff,
        });
        await unregisterLuxuryFcmDevice(accessToken);
        await logoutLuxurySession();
        clearToken();
        clearAdminSession();
        queryClient.removeQueries({ queryKey: ["me"] });
        redirectAfterLuxuryLogout(panel);
      },
      signOutForAccountSwitch: async () => {
        await unregisterLuxuryFcmDevice(accessToken);
        await logoutLuxurySession();
        clearToken();
        clearAdminSession();
        queryClient.removeQueries({ queryKey: ["me"] });
      },
      releasePublicSurfaceAfterPanelOpen: () => {
        markPublicSurfaceSessionReleased();
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        }
        clearStoredRefreshToken();
        clearStoredEpoch();
        clearAdminSession();
        queryClient.removeQueries({ queryKey: ["me"] });
        setAccessToken(undefined);
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
