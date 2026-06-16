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

declare global {
  interface Window {
    velvetFcmToken?: string;
    onVelvetFcmTokenReceived?: (token: string) => void;
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

    syncToken(window.velvetFcmToken);

    return () => {
      delete window.onVelvetFcmTokenReceived;
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
