const SEEN_PENDING_KEY = "luxury.clientReviews.seenPendingAppointmentIds";
const DISMISSED_PENDING_KEY = "luxury.clientReviews.dismissedPendingAppointmentIds";
const MAX_STORED_IDS = 200;

export const CLIENT_REVIEW_PENDING_CHANGED_EVENT = "luxury:client-review-pending-changed";

function notifyClientReviewPendingChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLIENT_REVIEW_PENDING_CHANGED_EVENT));
}

function readStoredIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function writeStoredIdSet(key: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  const trimmed = [...ids].slice(-MAX_STORED_IDS);
  window.localStorage.setItem(key, JSON.stringify(trimmed));
}

export function readSeenClientReviewPendingIds(): Set<string> {
  return readStoredIdSet(SEEN_PENDING_KEY);
}

export function readDismissedClientReviewPendingIds(): Set<string> {
  return readStoredIdSet(DISMISSED_PENDING_KEY);
}

export function markClientReviewPendingSeen(appointmentIds: string[]): void {
  if (typeof window === "undefined" || !appointmentIds.length) return;
  const next = readSeenClientReviewPendingIds();
  for (const id of appointmentIds) {
    if (id.trim()) next.add(id.trim());
  }
  writeStoredIdSet(SEEN_PENDING_KEY, next);
  notifyClientReviewPendingChanged();
}

export function dismissClientReviewPending(appointmentIds: string[]): void {
  if (typeof window === "undefined" || !appointmentIds.length) return;
  const next = readDismissedClientReviewPendingIds();
  for (const id of appointmentIds) {
    if (id.trim()) next.add(id.trim());
  }
  writeStoredIdSet(DISMISSED_PENDING_KEY, next);
  markClientReviewPendingSeen(appointmentIds);
}

export function isClientReviewPendingVisible(appointmentId: string): boolean {
  if (!appointmentId.trim()) return false;
  return !readDismissedClientReviewPendingIds().has(appointmentId.trim());
}

export function countUnseenClientReviewPending(appointmentIds: string[]): number {
  if (!appointmentIds.length) return 0;
  const seen = readSeenClientReviewPendingIds();
  const dismissed = readDismissedClientReviewPendingIds();
  return appointmentIds.reduce((acc, id) => {
    if (seen.has(id) || dismissed.has(id)) return acc;
    return acc + 1;
  }, 0);
}
