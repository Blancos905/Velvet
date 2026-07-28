import type { RegistrationEmailVerificationAudience } from "./emailVerificationConfirmShared";

/** Stesso browser: la scheda in attesa checkout si aggiorna dopo il pagamento su un'altra scheda. */
const CHANNEL = "luxury.premiumRegistrationPaid";
const STORAGE_KEY = "luxury_premium_registration_paid_cross_tab";

export type PremiumRegistrationPaidCrossTabPayload = {
  email: string;
  audience: RegistrationEmailVerificationAudience;
  registrationAt: number;
  message: string;
  accessToken: string;
  refreshToken?: string | null;
  nextPath?: string | null;
  at: number;
};

export function clearPremiumRegistrationPaidCrossTab(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function notifyPremiumRegistrationPaidCrossTab(
  payload: Omit<PremiumRegistrationPaidCrossTabPayload, "at">,
): void {
  const data: PremiumRegistrationPaidCrossTabPayload = { ...payload, at: Date.now() };
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

function parsePayload(raw: string | null): PremiumRegistrationPaidCrossTabPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PremiumRegistrationPaidCrossTabPayload;
    if (
      !parsed ||
      typeof parsed.message !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.registrationAt !== "number" ||
      typeof parsed.accessToken !== "string" ||
      !parsed.accessToken.trim()
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

export type SubscribePremiumRegistrationPaidCrossTabOptions = {
  expectedEmail: string;
  registrationAt: number;
  audience: RegistrationEmailVerificationAudience;
};

export function readPremiumRegistrationPaidCrossTabPayload(): PremiumRegistrationPaidCrossTabPayload | null {
  try {
    return parsePayload(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function subscribePremiumRegistrationPaidCrossTab(
  onPaid: (payload: PremiumRegistrationPaidCrossTabPayload) => void,
  options: SubscribePremiumRegistrationPaidCrossTabOptions,
): () => void {
  const expectedEmail = options.expectedEmail.trim().toLowerCase();
  const registrationAt = options.registrationAt;

  const accept = (payload: PremiumRegistrationPaidCrossTabPayload | null): void => {
    if (!payload) return;
    if (payload.audience !== options.audience) return;
    if (!emailsMatch(expectedEmail, payload.email)) return;
    if (payload.registrationAt !== registrationAt) return;
    onPaid(payload);
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
      channel.onmessage = (event: MessageEvent<PremiumRegistrationPaidCrossTabPayload>) => {
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
