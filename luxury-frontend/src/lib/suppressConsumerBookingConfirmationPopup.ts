/**
 * Dopo auto-conferma (`require_booking_confirmation=false`) il cliente vede già
 * {@link BookingConfirmedModal} («La prenotazione è confermata…»). Sopprime il secondo
 * popup inbox/push `BOOKING_CONFIRMATION` («Il salone ha confermato…») per lo stesso appuntamento.
 */

const SUPPRESS_TTL_MS = 15 * 60 * 1000;
const STORAGE_KEY = "luxury.suppressConsumerBookingConfirmation";

const suppressedUntilByAppointmentId = new Map<string, number>();

function pruneExpired(now = Date.now()): void {
  for (const [id, until] of suppressedUntilByAppointmentId.entries()) {
    if (until <= now) suppressedUntilByAppointmentId.delete(id);
  }
}

function readPersisted(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    for (const [id, until] of Object.entries(parsed)) {
      if (typeof until === "number" && until > now && id.trim()) {
        suppressedUntilByAppointmentId.set(id.trim(), until);
      }
    }
  } catch {
    /* ignore */
  }
}

function persist(): void {
  if (typeof sessionStorage === "undefined") return;
  pruneExpired();
  const payload: Record<string, number> = {};
  for (const [id, until] of suppressedUntilByAppointmentId.entries()) {
    payload[id] = until;
  }
  try {
    if (Object.keys(payload).length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    /* ignore quota */
  }
}

let hydrated = false;

function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  readPersisted();
}

/** Chiama quando mostri {@link BookingConfirmedModal} con `pendingApproval=false`. */
export function suppressConsumerBookingConfirmationPopup(appointmentId: string | null | undefined): void {
  const id = appointmentId?.trim();
  if (!id) return;
  ensureHydrated();
  suppressedUntilByAppointmentId.set(id, Date.now() + SUPPRESS_TTL_MS);
  persist();
}

export function shouldSuppressConsumerBookingConfirmationPopup(
  appointmentId: string | null | undefined,
): boolean {
  const id = appointmentId?.trim();
  if (!id) return false;
  ensureHydrated();
  pruneExpired();
  const until = suppressedUntilByAppointmentId.get(id);
  if (until == null) return false;
  if (until <= Date.now()) {
    suppressedUntilByAppointmentId.delete(id);
    persist();
    return false;
  }
  return true;
}
