import type { AppointmentDto, MeSalonReview } from "../api/types";
import { formatLocalYmd } from "../pages/account/SalonAgendaBoard";

export type MonthBounds = { from: string; to: string; label: string };

export function monthBounds(now = new Date(), toYmd = formatLocalYmd): MonthBounds {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const from = toYmd(start);
  const to = toYmd(end);
  const label = start.toLocaleString("it-IT", { month: "long", year: "numeric" });
  return { from, to, label };
}

export function firstOfMonthWithOffset(offsetMonths: number, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
}

export function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Periodo solare 1 (gen–giu) o 2 (lug–dic), per report semestrali. */
export function semesterBounds(
  year: number,
  semester: 1 | 2,
  toYmd = formatLocalYmd,
): { from: string; to: string; label: string } {
  if (semester === 1) {
    const from = toYmd(new Date(year, 0, 1));
    const to = toYmd(new Date(year, 5, 30));
    return { from, to, label: `1° semestre ${year} (gennaio–giugno)` };
  }
  const from = toYmd(new Date(year, 6, 1));
  const to = toYmd(new Date(year, 11, 31));
  return { from, to, label: `2° semestre ${year} (luglio–dicembre)` };
}

export function uniqueClientsInYm(appointments: AppointmentDto[], ym: string): number {
  const s = new Set<string>();
  for (const a of appointments) {
    if (!a.start.startsWith(ym)) continue;
    if (a.salonClientId) s.add(a.salonClientId);
  }
  return s.size;
}

export function avgRatingList(list: MeSalonReview[]): number | null {
  if (!list.length) return null;
  return Math.round((list.reduce((a, r) => a + r.rating, 0) / list.length) * 10) / 10;
}

export type ServiceAggRow = { name: string; count: number; revenue: number };

/** Servizi aggregati sul mese corrente (stessa logica della dashboard statistiche). */
export function buildTopServiceRows(rows: AppointmentDto[], topN = 8): ServiceAggRow[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const a of rows) {
    const cur = map.get(a.serviceName) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    if (a.status !== "CANCELLED") cur.revenue += a.priceCents ?? 0;
    map.set(a.serviceName, cur);
  }
  return [...map.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
