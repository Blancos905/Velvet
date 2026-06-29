import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import {
  detectFcmDeviceOs,
  readRegisteredFcmToken,
  registerVelvetFcmDevice,
  storeRegisteredFcmToken,
  type FcmDeviceOs,
} from "../api/fcmDevice";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { isVelvetNativeAppShell } from "./useVelvetNativeAppShell";
import {
  normalizePushNotificationOpen,
  openVelvetNotificationPopup,
} from "../lib/velvetNotificationPopup";

declare global {
  interface Window {
    velvetFcmToken?: string;
    onVelvetFcmTokenReceived?: (token: string) => void;
    onVelvetPushNotificationOpen?: (payload: Record<string, unknown>) => void;
  }
}

function normalizeFcmToken(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Bridge Flutter → React: legge `window.velvetFcmToken` e registra il token sul backend
 * quando l'utente è autenticato (solo shell mobile WebView).
 */
export function useFcmToken(): void {
  const { accessToken, isAuthenticated } = useVelvetAuth();
  const lastSyncedTokenRef = useRef<string | undefined>(undefined);
  const pendingTokenRef = useRef<string | undefined>(undefined);

  const registerM = useMutation({
    mutationFn: async ({ token, os }: { token: string; os: FcmDeviceOs }) => {
      if (!accessToken) {
        throw new Error("Sessione assente");
      }
      await registerVelvetFcmDevice(accessToken, token, os);
    },
    onSuccess: (_data, variables) => {
      lastSyncedTokenRef.current = variables.token;
    },
  });

  const syncToken = useCallback(
    (rawToken: unknown) => {
      if (!isVelvetNativeAppShell()) return;
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
    if (!isVelvetNativeAppShell()) return;

    window.onVelvetFcmTokenReceived = (token: string) => {
      syncToken(token);
    };

    window.onVelvetPushNotificationOpen = (raw) => {
      const payload = normalizePushNotificationOpen(raw);
      if (payload) {
        openVelvetNotificationPopup(payload);
      }
    };

    syncToken(window.velvetFcmToken);

    if (typeof window.onVelvetPushNotificationOpen === "function") {
      try {
        const raw = sessionStorage.getItem("velvet_pending_push_open");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          window.onVelvetPushNotificationOpen(parsed);
          sessionStorage.removeItem("velvet_pending_push_open");
        }
      } catch {
        /* ignore malformed pending push payload */
      }
    }

    return () => {
      delete window.onVelvetFcmTokenReceived;
      delete window.onVelvetPushNotificationOpen;
    };
  }, [syncToken]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const pending = pendingTokenRef.current ?? window.velvetFcmToken ?? readRegisteredFcmToken();
    if (pending) {
      syncToken(pending);
    }
  }, [accessToken, isAuthenticated, syncToken]);
}
