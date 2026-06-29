import { apiFetch } from "./client";

export const FCM_DEVICE_TOKEN_STORAGE_KEY = "velvet_fcm_device_token";

export type FcmDeviceOs = "ANDROID" | "IOS";

export function readRegisteredFcmToken(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const raw = sessionStorage.getItem(FCM_DEVICE_TOKEN_STORAGE_KEY);
  return raw && raw.trim() ? raw.trim() : undefined;
}

export function storeRegisteredFcmToken(token: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(FCM_DEVICE_TOKEN_STORAGE_KEY, token.trim());
}

export function clearRegisteredFcmToken(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(FCM_DEVICE_TOKEN_STORAGE_KEY);
}

export function detectFcmDeviceOs(): FcmDeviceOs {
  if (typeof navigator === "undefined") return "ANDROID";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "ANDROID";
  if (/iphone|ipad|ipod/i.test(ua)) return "IOS";
  return "IOS";
}

export async function registerVelvetFcmDevice(
  accessToken: string,
  fcmToken: string,
  os: FcmDeviceOs,
): Promise<void> {
  const response = await apiFetch("/api/v1/me/devices", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ token: fcmToken, os }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Registrazione dispositivo FCM fallita (${response.status})`);
  }
  storeRegisteredFcmToken(fcmToken);
}

export async function unregisterVelvetFcmDevice(
  accessToken: string | undefined,
  fcmToken?: string,
): Promise<void> {
  const token = (fcmToken ?? readRegisteredFcmToken())?.trim();
  if (!token || !accessToken) {
    clearRegisteredFcmToken();
    return;
  }
  try {
    await apiFetch(`/api/v1/me/devices/${encodeURIComponent(token)}`, {
      method: "DELETE",
      accessToken,
    });
  } catch {
    /* best effort al logout */
  } finally {
    clearRegisteredFcmToken();
  }
}
