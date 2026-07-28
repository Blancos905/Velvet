import type {
  EmailVerificationConfirmResponse,
  RegistrationEmailVerificationAudience,
} from "./emailVerificationConfirmShared";

/** Stesso browser, tab diverse: la scheda «Controlla email» si aggiorna dopo il click nel client mail. */
const CHANNEL = "luxury.emailVerification";
const STORAGE_KEY = "luxury_email_verified_cross_tab";

export type EmailVerifiedCrossTabPayload = EmailVerificationConfirmResponse & {
  email: string;
  audience: RegistrationEmailVerificationAudience;
  /** Allineato a `luxury_pending_email_verify_at` della registrazione in corso. */
  registrationAt: number;
  at: number;
};

export function clearEmailVerifiedCrossTab(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function notifyEmailVerifiedCrossTab(payload: Omit<EmailVerifiedCrossTabPayload, "at">): void {
  const data: EmailVerifiedCrossTabPayload = { ...payload, at: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(data);
    ch.close();
  } catch {
    /* ignore */
  }
}

function parsePayload(raw: string | null): EmailVerifiedCrossTabPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmailVerifiedCrossTabPayload;
    if (
      !parsed ||
      typeof parsed.message !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.registrationAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function emailsMatch(a: string | undefined, b: string | undefined): boolean {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left && right && left === right);
}

export type SubscribeEmailVerifiedCrossTabOptions = {
  expectedEmail: string;
  /** Timestamp scritto da `persistPendingEmailVerification` per questa registrazione. */
  registrationAt: number;
  audience: RegistrationEmailVerificationAudience;
};

export function readEmailVerifiedCrossTabPayload(): EmailVerifiedCrossTabPayload | null {
  try {
    return parsePayload(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function subscribeEmailVerifiedCrossTab(
  onConfirmed: (payload: EmailVerifiedCrossTabPayload) => void,
  options: SubscribeEmailVerifiedCrossTabOptions,
): () => void {
  const expectedEmail = options.expectedEmail.trim().toLowerCase();
  const registrationAt = options.registrationAt;

  const accept = (payload: EmailVerifiedCrossTabPayload | null): void => {
    if (!payload) return;
    if (payload.audience !== options.audience) return;
    if (!emailsMatch(expectedEmail, payload.email)) return;
    if (payload.registrationAt !== registrationAt) return;
    onConfirmed(payload);
  };

  try {
    accept(parsePayload(localStorage.getItem(STORAGE_KEY)));
  } catch {
    /* ignore */
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    accept(parsePayload(event.newValue));
  };

  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event: MessageEvent<EmailVerifiedCrossTabPayload>) => {
        accept(event.data ?? null);
      };
    } catch {
      channel = null;
    }
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
