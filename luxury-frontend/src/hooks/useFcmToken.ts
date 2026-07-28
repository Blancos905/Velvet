import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import {
  detectFcmDeviceOs,
  readRegisteredFcmToken,
  registerLuxuryFcmDevice,
  storeRegisteredFcmToken,
  type FcmDeviceOs,
} from "../api/fcmDevice";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { isLuxuryNativeAppShell } from "./useLuxuryNativeAppShell";
import {
  normalizePushNotificationOpen,
  openLuxuryNotificationPopup,
  resolveSalonNotificationViewerRole,
} from "../lib/luxuryNotificationPopup";

declare global {
  interface Window {
    luxuryFcmToken?: string;
    onLuxuryFcmTokenReceived?: (token: string) => void;
    onLuxuryPushNotificationOpen?: (payload: Record<string, unknown>) => void;
  }
}

function normalizeFcmToken(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Bridge Flutter → React: legge `window.luxuryFcmToken` e registra il token sul backend
 * quando l'utente è autenticato (solo shell mobile WebView).
 */
export function useFcmToken(): void {
  const { accessToken, isAuthenticated, isSalonStaff, isSalonTitolare } = useLuxuryAuth();
  const lastSyncedTokenRef = useRef<string | undefined>(undefined);
  const pendingTokenRef = useRef<string | undefined>(undefined);

  const registerM = useMutation({
    mutationFn: async ({ token, os }: { token: string; os: FcmDeviceOs }) => {
      if (!accessToken) {
        throw new Error("Sessione assente");
      }
      await registerLuxuryFcmDevice(accessToken, token, os);
    },
    onSuccess: (_data, variables) => {
      lastSyncedTokenRef.current = variables.token;
    },
  });

  const syncToken = useCallback(
    (rawToken: unknown) => {
      if (!isLuxuryNativeAppShell()) return;
      const token = normalizeFcmToken(rawToken);
      if (!token) return;

      storeRegisteredFcmToken(token);

      if (!isAuthenticated || !accessToken) {
        pendingTokenRef.current = token;
        return;
      }

      if (lastSyncedTokenRef.current === token && registerM.isPending) {
        return;
      }
      if (lastSyncedTokenRef.current === token && readRegisteredFcmToken() === token) {
        return;
      }

      pendingTokenRef.current = undefined;
      registerM.mutate({ token, os: detectFcmDeviceOs() });
    },
    [accessToken, isAuthenticated, registerM],
  );

  useEffect(() => {
    if (!isLuxuryNativeAppShell()) return;

    window.onLuxuryFcmTokenReceived = (token: string) => {
      syncToken(token);
    };

    window.onLuxuryPushNotificationOpen = (raw) => {
      const role = resolveSalonNotificationViewerRole(isSalonStaff, isSalonTitolare);
      const payload = normalizePushNotificationOpen(raw, role);
      if (payload) {
        openLuxuryNotificationPopup(payload);
      }
    };

    syncToken(window.luxuryFcmToken);

    if (typeof window.onLuxuryPushNotificationOpen === "function") {
      try {
        const raw = sessionStorage.getItem("luxury_pending_push_open");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          window.onLuxuryPushNotificationOpen(parsed);
          sessionStorage.removeItem("luxury_pending_push_open");
        }
      } catch {
        /* ignore malformed pending push payload */
      }
    }

    return () => {
      delete window.onLuxuryFcmTokenReceived;
      delete window.onLuxuryPushNotificationOpen;
    };
  }, [syncToken, isSalonStaff, isSalonTitolare]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const pending = pendingTokenRef.current ?? window.luxuryFcmToken ?? readRegisteredFcmToken();
    if (pending) {
      syncToken(pending);
    }
  }, [accessToken, isAuthenticated, syncToken]);
}
