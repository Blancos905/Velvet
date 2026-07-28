import { useFcmToken } from "../hooks/useFcmToken";

/** Montato una sola volta: sincronizza token FCM Flutter → backend Spring. */
export function LuxuryFcmTokenSync() {
  useFcmToken();
  return null;
}
