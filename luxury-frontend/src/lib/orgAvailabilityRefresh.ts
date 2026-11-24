import type { QueryClient } from "@tanstack/react-query";
import type { DayAvailability } from "../api/types";

/**
 * Rimuove subito dallo cache React Query gli slot resi non disponibili dalla prenotazione
 * (stesso criterio overlap del backend: la durata servizio blocca le finestre consecutive),
 * poi invalida per allineare al server.
 */
export function refreshOrgAvailabilityAfterBooking(
  qc: QueryClient,
  organizationSlug: string,
  startIso: string,
  durationMinutes?: number | null,
): void {
  const slug = organizationSlug.trim();
  if (!slug) return;

  const bookedStart = new Date(startIso).getTime();
  if (Number.isNaN(bookedStart)) {
    void qc.invalidateQueries({ queryKey: ["org", "availability", slug] });
    return;
  }

  const durationMs = Math.max(15, durationMinutes ?? 15) * 60_000;
  const bookedEnd = bookedStart + durationMs;

  qc.setQueriesData<DayAvailability[]>({ queryKey: ["org", "availability", slug] }, (days) => {
    if (!days) return days;
    return days.map((day) => ({
      ...day,
      slotsIso: day.slotsIso.filter((iso) => {
        const slotStart = new Date(iso).getTime();
        if (Number.isNaN(slotStart)) return true;
        const slotEnd = slotStart + durationMs;
        return !(slotStart < bookedEnd && bookedStart < slotEnd);
      }),
    }));
  });

  void qc.invalidateQueries({ queryKey: ["org", "availability", slug] });
}
