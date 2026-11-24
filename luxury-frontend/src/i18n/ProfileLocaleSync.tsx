import { useEffect } from "react";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useMeProfileQuery } from "../hooks/useMeProfile";
import { resolveProfileLocale } from "./resolveProfileLocale";
import { useLuxuryLocale } from "./useLuxuryLocale";

/** Con sessione attiva: forza la lingua da `GET /me/profile` (registrazione / preferenza salvata). */
export function ProfileLocaleSync() {
  const { accessToken } = useLuxuryAuth();
  const meProfile = useMeProfileQuery();
  const { lockProfileLocale, unlockProfileLocale } = useLuxuryLocale();

  useEffect(() => {
    if (!accessToken) {
      unlockProfileLocale();
      return;
    }
    const profile = meProfile.data;
    if (!profile) return;
    lockProfileLocale(resolveProfileLocale(profile.preferredLocale, profile.country));
  }, [
    accessToken,
    meProfile.data?.preferredLocale,
    meProfile.data?.country,
    lockProfileLocale,
    unlockProfileLocale,
    meProfile.data,
  ]);

  return null;
}
