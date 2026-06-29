import type { AppointmentDto, MeSalonReview } from "../api/types";

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Prima data (YYYY-MM-DD) di appuntamento per ogni salonClientId. */
export function firstAppointmentDayByClient(appointments: AppointmentDto[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of appointments) {
    if (!a.salonClientId) continue;
    const day = a.start.slice(0, 10);
    const cur = m.get(a.salonClientId);
    if (!cur || day < cur) m.set(a.salonClientId, day);
  }
  return m;
}

export type StaffPerfRow = {
  operatorId: string;
  displayName: string;
  role: string;
  photoDataUrl: string | null;
  /** Clienti distinti serviti nel mese (appuntamenti del mese). */
  clientCount: number;
  /** Media stelle «verso l'operatore» (`staffRating`) sulle recensioni collegate; {@code null} se nessun voto operatore. */
  avgRating: number | null;
};

export function buildStaffPerformance(
  monthAppointments: AppointmentDto[],
  reviews: MeSalonReview[],
  appointmentById: Map<string, AppointmentDto>,
  staffById: Map<string, { firstName: string; lastName: string; role: string; photoDataUrl: string | null }>,
): StaffPerfRow[] {
  const byOp = new Map<
    string,
    { clients: Set<string>; staffRatingSum: number; staffRatingN: number }
  >();

  for (const a of monthAppointments) {
    const op = a.operatorId;
    if (!byOp.has(op)) byOp.set(op, { clients: new Set(), staffRatingSum: 0, staffRatingN: 0 });
    const s = byOp.get(op)!;
    if (a.salonClientId) s.clients.add(a.salonClientId);
  }

  for (const r of reviews) {
    if (!r.appointmentId) continue;
    const ap = appointmentById.get(r.appointmentId);
    if (!ap) continue;
    const s = byOp.get(ap.operatorId);
    if (!s) continue;
    const st = r.staffRating;
    if (st != null && Number.isFinite(st)) {
      s.staffRatingSum += st;
      s.staffRatingN += 1;
    }
  }

  const rows: StaffPerfRow[] = [];
  for (const [operatorId, agg] of byOp) {
    const meta = staffById.get(operatorId);
    const fallbackName = monthAppointments.find((x) => x.operatorId === operatorId)?.operatorName;
    const name = meta
      ? `${meta.firstName} ${meta.lastName}`.trim()
      : (fallbackName?.trim() || "Staff");
    rows.push({
      operatorId,
      displayName: name,
      role: meta?.role?.trim() || "Staff",
      photoDataUrl: meta?.photoDataUrl ?? null,
      clientCount: agg.clients.size,
      avgRating: agg.staffRatingN > 0 ? Math.round((agg.staffRatingSum / agg.staffRatingN) * 10) / 10 : null,
    });
  }
  rows.sort((a, b) => b.clientCount - a.clientCount);
  return rows;
}

export function mergeAppointmentIndex(sets: AppointmentDto[][]): Map<string, AppointmentDto> {
  const m = new Map<string, AppointmentDto>();
  for (const set of sets) {
    for (const a of set) {
      if (!m.has(a.id)) m.set(a.id, a);
    }
  }
  return m;
}
