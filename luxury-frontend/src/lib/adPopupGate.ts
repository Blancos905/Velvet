import type { AdPopupFrequency, AdPopupZone } from "../data/adPopups";

const PENDING_KEY = "luxury_ad_popup_pending";
const SEEN_SESSION_PREFIX = "luxury_ad_popup_seen_session:";
const SEEN_DAY_PREFIX = "luxury_ad_popup_seen_day:";

/** Segna che al prossimo ingresso in /account va valutato un popup post-login. */
export function markAdPopupPendingAfterLogin(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeAdPopupPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (raw !== "1") return false;
    sessionStorage.removeItem(PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

export function peekAdPopupPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

function dayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hasSeenAdPopup(
  campaignId: string,
  frequency: AdPopupFrequency = "once_per_session",
): boolean {
  try {
    if (frequency === "once_per_day") {
      if (typeof localStorage === "undefined") return false;
      return localStorage.getItem(`${SEEN_DAY_PREFIX}${campaignId}`) === dayKey();
    }
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(`${SEEN_SESSION_PREFIX}${campaignId}`) === "1";
  } catch {
    return false;
  }
}

export function markAdPopupSeen(
  campaignId: string,
  frequency: AdPopupFrequency = "once_per_session",
): void {
  try {
    if (frequency === "once_per_day") {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(`${SEEN_DAY_PREFIX}${campaignId}`, dayKey());
      return;
    }
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(`${SEEN_SESSION_PREFIX}${campaignId}`, "1");
  } catch {
    /* ignore */
  }
}

/** Debug: forza la prova senza nuovo login (`localStorage.setItem("luxury.debug.ads","1")`). */
export function isAdPopupDebugForceEnabled(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem("luxury.debug.ads") === "1";
  } catch {
    return false;
  }
}

export function resolvePostLoginAdZone(input: {
  isLuxurySuperAdmin: boolean;
  isSalonTitolare: boolean;
  isSalonStaff: boolean;
}): AdPopupZone | null {
  if (input.isLuxurySuperAdmin) return null;
  if (input.isSalonTitolare) return "post_login_owner";
  if (input.isSalonStaff) return "post_login_staff";
  return "post_login_client";
}
