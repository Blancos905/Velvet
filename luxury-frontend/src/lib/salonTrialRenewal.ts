import { SALON_PREMIUM_TRIAL_DAYS } from "../data/salonPlans";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Prima comparsa del popup di rinnovo. */
export const SALON_TRIAL_RENEWAL_LEAD_MS = 48 * HOUR_MS;
/** Da qui il popup torna ogni 4 ore. */
export const SALON_TRIAL_RENEWAL_URGENT_MS = 24 * HOUR_MS;

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export function hasPaidPremiumSubscription(subscriptionStatus: string | null | undefined): boolean {
  if (!subscriptionStatus) return false;
  return PAID_STATUSES.has(subscriptionStatus.trim().toLowerCase());
}

export function trialRemainingMs(endsAtIso: string | null | undefined, nowMs: number): number | null {
  if (!endsAtIso) return null;
  const ends = Date.parse(endsAtIso);
  if (Number.isNaN(ends)) return null;
  return ends - nowMs;
}

/** Giorni interi ancora visibili nel cerchio (1 finché resta almeno un’ora di prova). */
export function trialDaysRemaining(endsAtIso: string | null | undefined, nowMs: number): number | null {
  const remaining = trialRemainingMs(endsAtIso, nowMs);
  if (remaining == null) return null;
  if (remaining <= 0) return 0;
  return Math.min(SALON_PREMIUM_TRIAL_DAYS, Math.ceil(remaining / DAY_MS));
}

/**
 * Finestra del popup.
 * Oltre 48 ore: nessun avviso.
 * Tra 48 e 24 ore: un solo avviso (`h48`).
 * Ultime 24 ore: un avviso ogni 4 ore (`h24` … `h4`).
 */
export function trialRenewalPromptBucket(remainingMs: number): string | null {
  if (remainingMs <= 0 || remainingMs > SALON_TRIAL_RENEWAL_LEAD_MS) return null;
  if (remainingMs > SALON_TRIAL_RENEWAL_URGENT_MS) return "h48";
  const hoursLeft = remainingMs / HOUR_MS;
  const slot = Math.ceil(hoursLeft / 4) * 4;
  return `h${slot}`;
}

export function trialRenewalStorageKey(endsAtIso: string): string {
  return `luxury.trialRenewalPrompt.v1:${endsAtIso}`;
}

export function shouldShowSalonTrialRing(input: {
  trialActive?: boolean;
  trialEndsAt?: string | null;
  subscriptionStatus?: string | null;
  nowMs: number;
}): boolean {
  if (hasPaidPremiumSubscription(input.subscriptionStatus)) return false;
  if (input.trialActive === true) return true;
  const days = trialDaysRemaining(input.trialEndsAt, input.nowMs);
  return days != null && days > 0;
}
