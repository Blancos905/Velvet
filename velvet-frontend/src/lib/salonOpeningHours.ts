/** Minuti da mezzanotte locale (es. 540 = 09:00). */
export function minuteOfDayToTimeValue(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeValueToMinuteOfDay(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatSalonOpeningHours(openMinuteOfDay: number, closeMinuteOfDay: number): string {
  return `${minuteOfDayToTimeValue(openMinuteOfDay)} – ${minuteOfDayToTimeValue(closeMinuteOfDay)}`;
}

const OPENING_HOURS_RANGE = /(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/;

/** Estrae apertura/chiusura da testi tipo «Martedi - Sabato 08:30 - 19:00». */
export function parseOpeningHoursRange(text: string): { open: number; close: number } | null {
  const m = OPENING_HOURS_RANGE.exec(text.trim());
  if (!m) return null;
  const open = timeValueToMinuteOfDay(m[1]);
  const close = timeValueToMinuteOfDay(m[2]);
  if (open == null || close == null || open >= close) return null;
  return { open, close };
}

export type BookingHoursWindow = {
  openMinute: number;
  closeMinute: number;
  timeZone: string;
};

export function resolveBookingHoursWindow(
  openMinute: number | null | undefined,
  closeMinute: number | null | undefined,
  timeZone: string | null | undefined,
): BookingHoursWindow | null {
  if (
    openMinute == null ||
    closeMinute == null ||
    !Number.isFinite(openMinute) ||
    !Number.isFinite(closeMinute) ||
    openMinute >= closeMinute
  ) {
    return null;
  }
  const tz = timeZone?.trim() || "Europe/Rome";
  return { openMinute, closeMinute, timeZone: tz };
}

/** Minuti da mezzanotte nel fuso della sede. */
export function minuteOfDayInTimeZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isSlotWithinBookingWindow(
  iso: string,
  window: BookingHoursWindow,
  durationMinutes: number,
): boolean {
  const startMinute = minuteOfDayInTimeZone(iso, window.timeZone);
  const endMinute = startMinute + Math.max(0, durationMinutes);
  return startMinute >= window.openMinute && endMinute <= window.closeMinute;
}

export function formatAvailabilitySlotInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Aggiorna solo la fascia HH:mm – HH:mm nel testo orari pubblico. */
export function replaceOpeningHoursTimes(text: string, openMinute: number, closeMinute: number): string {
  const openStr = minuteOfDayToTimeValue(openMinute);
  const closeStr = minuteOfDayToTimeValue(closeMinute);
  const trimmed = text.trim();
  if (OPENING_HOURS_RANGE.test(trimmed)) {
    return trimmed.replace(OPENING_HOURS_RANGE, `${openStr} – ${closeStr}`);
  }
  return trimmed ? `${trimmed} · ${openStr} – ${closeStr}` : `${openStr} – ${closeStr}`;
}
