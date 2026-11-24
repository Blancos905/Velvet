import type { MeSalonNotificationInbox, MeSalonNotificationMessage } from "../api/types";

/** Riapertura modale operatore dopo chiusura senza risposta. */
export const OPERATOR_ALERT_SNOOZE_MS = 15 * 60 * 1000;

const SALON_ALERT_STATE_STORAGE_PREFIX = "luxury.salonAlertState.";

type PersistedSalonAlertState = {
  seen: string[];
  snoozedUntil: Record<string, number>;
};

/** Evita che il polling riapra un modale già gestito (risposta o dismiss definitivo). */
const seenSalonAlertIds = new Set<string>();

/** Snooze temporaneo: modale chiuso senza azione, riapre dopo {@link OPERATOR_ALERT_SNOOZE_MS}. */
const snoozedUntilById = new Map<string, number>();
const snoozeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Popup già aperto in pagina (evita ri-aperture dal polling). */
const activePopupNotificationIds = new Set<string>();

/** Notifiche già presenti in inbox al primo fetch della sessione (non riaprire al refresh polling). */
const sessionBaselineNotificationIds = new Set<string>();

let storageAccountKey: string | null = null;

type SnoozeExpiredListener = (notificationId: string) => void;
let snoozeExpiredListener: SnoozeExpiredListener | null = null;

function clearAllSnoozeTimers(): void {
  for (const timer of snoozeTimers.values()) {
    clearTimeout(timer);
  }
  snoozeTimers.clear();
}

function readPersistedSalonAlertState(accountKey: string): PersistedSalonAlertState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SALON_ALERT_STATE_STORAGE_PREFIX + accountKey);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSalonAlertState;
  } catch {
    return null;
  }
}

function persistSalonAlertState(): void {
  if (!storageAccountKey || typeof sessionStorage === "undefined") return;
  const snoozedUntil: Record<string, number> = {};
  for (const [id, until] of snoozedUntilById.entries()) {
    snoozedUntil[id] = until;
  }
  try {
    sessionStorage.setItem(
      SALON_ALERT_STATE_STORAGE_PREFIX + storageAccountKey,
      JSON.stringify({
        seen: [...seenSalonAlertIds],
        snoozedUntil,
      } satisfies PersistedSalonAlertState),
    );
  } catch {
    /* ignore quota */
  }
}

function scheduleSnoozeTimer(notificationId: string, until: number): void {
  const delayMs = Math.max(0, until - Date.now());
  const timer = setTimeout(() => {
    snoozeTimers.delete(notificationId);
    if (snoozedUntilById.get(notificationId) !== until) return;
    snoozedUntilById.delete(notificationId);
    persistSalonAlertState();
    snoozeExpiredListener?.(notificationId);
  }, delayMs);
  snoozeTimers.set(notificationId, timer);
}

/** Ripristina dismiss/snooze da sessionStorage (sopravvive al refresh tab). */
export function hydrateSalonAlertState(accountKey: string | undefined | null): void {
  const trimmed = accountKey?.trim();
  if (!trimmed || trimmed === storageAccountKey) return;

  storageAccountKey = trimmed;
  seenSalonAlertIds.clear();
  snoozedUntilById.clear();
  sessionBaselineNotificationIds.clear();
  activePopupNotificationIds.clear();
  clearAllSnoozeTimers();

  const persisted = readPersistedSalonAlertState(trimmed);
  if (!persisted) return;

  for (const id of persisted.seen ?? []) {
    if (id?.trim()) seenSalonAlertIds.add(id.trim());
  }

  const now = Date.now();
  for (const [id, until] of Object.entries(persisted.snoozedUntil ?? {})) {
    const trimmedId = id.trim();
    if (!trimmedId || !Number.isFinite(until) || until <= now) continue;
    snoozedUntilById.set(trimmedId, until);
    scheduleSnoozeTimer(trimmedId, until);
  }
}

/** Segna le notifiche già in inbox al boot sessione: il polling non le ripropone come «nuove». */
export function baselineSalonAlertSessionMessages(messages: MeSalonNotificationMessage[]): void {
  for (const message of messages) {
    const id = message.id?.trim();
    if (id) sessionBaselineNotificationIds.add(id);
  }
}

export function isSalonAlertSessionBaselineMessage(id: string | undefined | null): boolean {
  const trimmed = id?.trim();
  return Boolean(trimmed && sessionBaselineNotificationIds.has(trimmed));
}

export function registerSalonAlertSnoozeExpiredListener(listener: SnoozeExpiredListener | null): void {
  snoozeExpiredListener = listener;
}

export function markSalonAlertNotificationSeen(id: string | undefined | null): void {
  const trimmed = id?.trim();
  if (!trimmed) return;
  seenSalonAlertIds.add(trimmed);
  clearSalonAlertNotificationSnooze(trimmed);
  clearSalonAlertPopupActive(trimmed);
  persistSalonAlertState();
}

export function markSalonAlertPopupActive(id: string | undefined | null): void {
  const trimmed = id?.trim();
  if (trimmed) activePopupNotificationIds.add(trimmed);
}

export function clearSalonAlertPopupActive(id: string | undefined | null): void {
  const trimmed = id?.trim();
  if (trimmed) activePopupNotificationIds.delete(trimmed);
}

/** Host popup smontato: libera gli ID attivi così il poller può ripresentare Accetta/Rifiuta. */
export function clearAllSalonAlertPopupsActive(): void {
  activePopupNotificationIds.clear();
}

export function isSalonAlertNotificationSeen(id: string | undefined | null): boolean {
  const trimmed = id?.trim();
  return Boolean(trimmed && seenSalonAlertIds.has(trimmed));
}

export function clearSalonAlertNotificationSnooze(id: string | undefined | null): void {
  const trimmed = id?.trim();
  if (!trimmed) return;
  snoozedUntilById.delete(trimmed);
  const timer = snoozeTimers.get(trimmed);
  if (timer) {
    clearTimeout(timer);
    snoozeTimers.delete(trimmed);
  }
}

/** Modale chiuso senza risposta: riapre (con suono) dopo 15 minuti se l'appuntamento è ancora BOOKED. */
export function snoozeSalonAlertNotification(id: string | undefined | null): void {
  const trimmed = id?.trim();
  if (!trimmed || seenSalonAlertIds.has(trimmed)) return;

  clearSalonAlertNotificationSnooze(trimmed);

  const until = Date.now() + OPERATOR_ALERT_SNOOZE_MS;
  snoozedUntilById.set(trimmed, until);
  scheduleSnoozeTimer(trimmed, until);
  persistSalonAlertState();
}

export function isSalonAlertNotificationSnoozed(id: string | undefined | null): boolean {
  const trimmed = id?.trim();
  if (!trimmed) return false;
  const until = snoozedUntilById.get(trimmed);
  if (until == null) return false;
  if (Date.now() >= until) {
    snoozedUntilById.delete(trimmed);
    persistSalonAlertState();
    return false;
  }
  return true;
}

/** True se il popup automatico operatore può essere mostrato (non gestito e non in snooze). */
export function shouldShowSalonAlertPopup(id: string | undefined | null): boolean {
  const trimmed = id?.trim();
  if (!trimmed) return false;
  if (seenSalonAlertIds.has(trimmed)) return false;
  if (activePopupNotificationIds.has(trimmed)) return false;
  return !isSalonAlertNotificationSnoozed(trimmed);
}

export function inboxAttentionTotal(inbox: MeSalonNotificationInbox | undefined): number {
  const rows = inbox?.types;
  if (!rows?.length) return 0;
  return rows.reduce((acc, r) => {
    const p = Number(r.pending);
    const s = Number(r.sent);
    const pN = Number.isFinite(p) && p > 0 ? Math.floor(p) : 0;
    const sN = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
    return acc + pN + sN;
  }, 0);
}

export function sortMessagesNewestFirst(messages: MeSalonNotificationMessage[]): MeSalonNotificationMessage[] {
  return [...messages].sort((a, b) => {
    const aTs = Date.parse(a.sentAt ?? a.scheduledAt ?? "");
    const bTs = Date.parse(b.sentAt ?? b.scheduledAt ?? "");
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
}
