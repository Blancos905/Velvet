import {
  beginOperatorAlertSoundSession,
  endOperatorAlertSoundSession,
  isOperatorAlertSoundSessionActive,
  isOperatorAlertSoundWarm,
  playNotificationChime,
  primeBookingAlertSound,
  primeInAppAlertSound,
  startBookingRequestAlertSound,
  stopBookingRequestAlertSound,
} from "./luxuryBookingAlertSound";

export type InAppSoundSource = "chat" | "notification" | "popup";

export type InAppSoundEvent =
  | {
      kind: "chime";
      source: InAppSoundSource;
      /** Evita doppio suono dallo stesso evento (inbox + messaggio, polling multiplo). */
      dedupeKey?: string;
    }
  | {
      kind: "urgent-start";
      forcePrime?: boolean;
    }
  | {
      kind: "urgent-prime";
      force?: boolean;
    }
  | {
      kind: "urgent-stop";
    };

const DEDUPE_MS = 900;
const dedupeUntilByKey = new Map<string, number>();

function isDuplicate(dedupeKey: string): boolean {
  const now = Date.now();
  const until = dedupeUntilByKey.get(dedupeKey);
  if (until != null && until > now) return true;
  dedupeUntilByKey.set(dedupeKey, now + DEDUPE_MS);
  if (dedupeUntilByKey.size > 200) {
    for (const [key, expiry] of dedupeUntilByKey) {
      if (expiry <= now) dedupeUntilByKey.delete(key);
    }
  }
  return false;
}

/** Punto unico per suoni in-app (chime + alert urgente operatore). */
export function emitInAppSound(event: InAppSoundEvent): void {
  switch (event.kind) {
    case "chime": {
      const dedupeKey = event.dedupeKey ?? `${event.source}:generic`;
      if (isDuplicate(dedupeKey)) return;
      void playNotificationChime();
      return;
    }
    case "urgent-start":
      beginOperatorAlertSoundSession();
      void (async () => {
        await primeInAppAlertSound(
          event.forcePrime ?? isOperatorAlertSoundWarm(),
        );
        await startBookingRequestAlertSound();
      })();
      return;
    case "urgent-prime":
      void primeBookingAlertSound(event.force ?? true);
      return;
    case "urgent-stop":
      stopBookingRequestAlertSound();
      return;
    default:
      return;
  }
}

export function beginInAppUrgentSession(): void {
  beginOperatorAlertSoundSession();
}

export function endInAppUrgentSession(): void {
  endOperatorAlertSoundSession();
}

export function isInAppUrgentSessionActive(): boolean {
  return isOperatorAlertSoundSessionActive();
}

export function isInAppSoundWarm(): boolean {
  return isOperatorAlertSoundWarm();
}

export { primeInAppAlertSound };
