const KEY_PREFIX = "velvet.trustedSalons.lastSeenCount.";

function readJwtSub(accessToken: string | undefined): string | undefined {
  if (!accessToken) return undefined;
  const parts = accessToken.split(".");
  if (parts.length < 2) return undefined;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad === 2) b64 += "==";
    else if (pad === 3) b64 += "=";
    else if (pad === 1) return undefined;
    const payload = JSON.parse(atob(b64)) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Chiave stabile per account (email JWT o fallback `sub`). */
export function trustedSalonsAccountKey(accessToken: string | undefined, userEmail: string | undefined): string {
  const em = userEmail?.trim().toLowerCase();
  if (em) return `e:${em}`;
  const sub = readJwtSub(accessToken);
  if (sub) return `s:${sub}`;
  return "";
}

export function readTrustedSalonsLastSeenCount(accountKey: string): number | null {
  if (typeof window === "undefined" || !accountKey) return null;
  const raw = window.localStorage.getItem(KEY_PREFIX + accountKey);
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function writeTrustedSalonsLastSeenCount(accountKey: string, count: number): void {
  if (typeof window === "undefined" || !accountKey) return;
  const n = Math.max(0, Math.floor(count));
  window.localStorage.setItem(KEY_PREFIX + accountKey, String(n));
}

export function computeNewTrustedSalonsBadge(currentCount: number, lastSeenCount: number | null): number {
  if (lastSeenCount === null) return 0;
  return Math.max(0, currentCount - lastSeenCount);
}
