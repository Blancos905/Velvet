import { useEffect } from "react";
import { primeInAppAlertSound } from "../lib/luxuryInAppSoundBus";

type UseLuxuryInAppSoundPrimeOptions = {
  accessToken: string | null | undefined;
  /** Sblocca audio al login e alla navigazione account (tutti i ruoli autenticati). */
  enabled?: boolean;
  pathname?: string;
};

/** Prepara AudioContext su area account / admin (gesto utente o login). */
export function useLuxuryInAppSoundPrime({
  accessToken,
  enabled = true,
  pathname = "",
}: UseLuxuryInAppSoundPrimeOptions): void {
  useEffect(() => {
    if (!enabled || !accessToken) return;
    void primeInAppAlertSound(true);
  }, [accessToken, enabled, pathname]);
}
