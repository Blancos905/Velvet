const SEEN_PENDING_KEY = "velvet.clientReviews.seenPendingAppointmentIds";
const MAX_STORED_IDS = 200;

export function readSeenClientReviewPendingIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_PENDING_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

export function markClientReviewPendingSeen(appointmentIds: string[]): void {
  if (typeof window === "undefined" || !appointmentIds.length) return;
  const next = readSeenClientReviewPendingIds();
  for (const id of appointmentIds) {
    if (id.trim()) next.add(id.trim());
  }
  const trimmed = [...next].slice(-MAX_STORED_IDS);
  window.localStorage.setItem(SEEN_PENDING_KEY, JSON.stringify(trimmed));
}

export function countUnseenClientReviewPending(appointmentIds: string[]): number {
  if (!appointmentIds.length) return 0;
  const seen = readSeenClientReviewPendingIds();
  return appointmentIds.reduce((acc, id) => (seen.has(id) ? acc : acc + 1), 0);
}
