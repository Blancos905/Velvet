const REVIEW_LAST_SEEN_KEY = "velvet.salonReviews.lastSeenAt";

export function readSalonReviewLastSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(REVIEW_LAST_SEEN_KEY);
  return raw && raw.trim() ? raw.trim() : null;
}

export function writeSalonReviewLastSeenAt(value: string): void {
  if (typeof window === "undefined" || !value.trim()) return;
  window.localStorage.setItem(REVIEW_LAST_SEEN_KEY, value.trim());
}

export function countUnreadSalonReviews(createdAts: string[], lastSeenAt: string | null): number {
  if (!createdAts.length) return 0;
  if (!lastSeenAt) return createdAts.length;
  const lastSeenMillis = Date.parse(lastSeenAt);
  if (!Number.isFinite(lastSeenMillis)) return createdAts.length;
  return createdAts.reduce((acc, ts) => {
    const ms = Date.parse(ts);
    return Number.isFinite(ms) && ms > lastSeenMillis ? acc + 1 : acc;
  }, 0);
}

export function latestSalonReviewCreatedAt(createdAts: string[]): string | undefined {
  let best: { t: number; iso: string } | null = null;
  for (const iso of createdAts) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) continue;
    if (!best || t > best.t) best = { t, iso };
  }
  return best?.iso;
}
