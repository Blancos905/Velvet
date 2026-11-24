import { describe, expect, it } from "vitest";
import {
  SALON_TRIAL_RENEWAL_LEAD_MS,
  SALON_TRIAL_RENEWAL_URGENT_MS,
  trialDaysRemaining,
  trialRenewalPromptBucket,
} from "./salonTrialRenewal";

const HOUR = 60 * 60 * 1000;

describe("trialRenewalPromptBucket", () => {
  it("resta silenzioso oltre le 48 ore e a prova scaduta", () => {
    expect(trialRenewalPromptBucket(SALON_TRIAL_RENEWAL_LEAD_MS + 1)).toBeNull();
    expect(trialRenewalPromptBucket(0)).toBeNull();
    expect(trialRenewalPromptBucket(-HOUR)).toBeNull();
  });

  it("mostra un solo avviso tra 48 e 24 ore", () => {
    expect(trialRenewalPromptBucket(SALON_TRIAL_RENEWAL_LEAD_MS)).toBe("h48");
    expect(trialRenewalPromptBucket(SALON_TRIAL_RENEWAL_URGENT_MS + HOUR)).toBe("h48");
  });

  it("cambia finestra ogni 4 ore nell'ultimo giorno", () => {
    expect(trialRenewalPromptBucket(SALON_TRIAL_RENEWAL_URGENT_MS)).toBe("h24");
    expect(trialRenewalPromptBucket(20 * HOUR + 1)).toBe("h24");
    expect(trialRenewalPromptBucket(20 * HOUR)).toBe("h20");
    expect(trialRenewalPromptBucket(4 * HOUR)).toBe("h4");
    expect(trialRenewalPromptBucket(30 * 60 * 1000)).toBe("h4");
  });
});

describe("trialDaysRemaining", () => {
  it("arrotonda per eccesso e non supera i 30 giorni", () => {
    const ends = "2026-12-31T00:00:00.000Z";
    const endsMs = Date.parse(ends);
    expect(trialDaysRemaining(ends, endsMs - 30 * 24 * HOUR)).toBe(30);
    expect(trialDaysRemaining(ends, endsMs - 36 * HOUR)).toBe(2);
    expect(trialDaysRemaining(ends, endsMs - HOUR)).toBe(1);
    expect(trialDaysRemaining(ends, endsMs + HOUR)).toBe(0);
  });
});
