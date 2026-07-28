export type SalonOpenDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export const SALON_OPEN_DAYS_ORDER: SalonOpenDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const SALON_OPEN_DAY_LABELS: Record<SalonOpenDay, string> = {
  MONDAY: "Lunedì",
  TUESDAY: "Martedì",
  WEDNESDAY: "Mercoledì",
  THURSDAY: "Giovedì",
  FRIDAY: "Venerdì",
  SATURDAY: "Sabato",
  SUNDAY: "Domenica",
};

export const SALON_OPEN_DAY_SHORT: Record<SalonOpenDay, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mer",
  THURSDAY: "Gio",
  FRIDAY: "Ven",
  SATURDAY: "Sab",
  SUNDAY: "Dom",
};

/** Tutti i giorni aperti — default legacy quando il salone non ha configurazione esplicita. */
export const ALL_SALON_OPEN_DAYS: SalonOpenDay[] = [...SALON_OPEN_DAYS_ORDER];

export function normalizeSalonOpenDays(
  openDays: readonly string[] | null | undefined,
): SalonOpenDay[] {
  if (!openDays?.length) return ALL_SALON_OPEN_DAYS;
  const allowed = new Set<SalonOpenDay>(SALON_OPEN_DAYS_ORDER);
  const out: SalonOpenDay[] = [];
  for (const raw of openDays) {
    const key = raw.trim().toUpperCase() as SalonOpenDay;
    if (allowed.has(key) && !out.includes(key)) out.push(key);
  }
  return out.length > 0 ? out : ALL_SALON_OPEN_DAYS;
}

function parseYmdLocal(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Mappa `Date` locale → chiave API (`MONDAY` …). */
export function localDateToSalonOpenDay(date: Date): SalonOpenDay {
  const idx = date.getDay();
  const orderIdx = idx === 0 ? 6 : idx - 1;
  return SALON_OPEN_DAYS_ORDER[orderIdx]!;
}

export function ymdToSalonOpenDay(ymd: string): SalonOpenDay | null {
  const parsed = parseYmdLocal(ymd);
  if (!parsed) return null;
  return localDateToSalonOpenDay(parsed);
}

export function isSalonOpenOnYmd(
  ymd: string,
  openDays: readonly string[] | null | undefined,
): boolean {
  const day = ymdToSalonOpenDay(ymd);
  if (!day) return true;
  return normalizeSalonOpenDays(openDays).includes(day);
}

export function formatSalonOpenDaysLabel(openDays: readonly string[] | null | undefined): string {
  const normalized = normalizeSalonOpenDays(openDays);
  if (normalized.length === SALON_OPEN_DAYS_ORDER.length) return "Tutti i giorni";
  return normalized.map((d) => SALON_OPEN_DAY_SHORT[d]).join(", ");
}

export function salonClosedMessageForYmd(ymd: string): string {
  const day = ymdToSalonOpenDay(ymd);
  if (!day) return "Il salone è chiuso in questo giorno.";
  return `Il salone è chiuso di ${SALON_OPEN_DAY_LABELS[day].toLowerCase()}.`;
}
