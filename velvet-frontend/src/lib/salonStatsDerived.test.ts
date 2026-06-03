import { describe, expect, it } from "vitest";
import type { AppointmentDto, MeSalonReview } from "../api/types";
import {
  addDays,
  buildStaffPerformance,
  firstAppointmentDayByClient,
  mergeAppointmentIndex,
} from "./salonStatsDerived";

function ap(partial: Partial<AppointmentDto> & Pick<AppointmentDto, "id" | "operatorId" | "start">): AppointmentDto {
  return {
    locationId: "loc-1",
    locationSlug: "slug",
    locationName: "Salone",
    serviceId: "svc-1",
    serviceName: "Taglio",
    priceCents: 3000,
    operatorName: "Op",
    end: "2026-05-01T11:00:00",
    status: "COMPLETED",
    salonClientId: "c1",
    salonClientDisplayName: "Cliente",
    consumerCancelDeadline: "2026-05-01T08:00:00",
    consumerRescheduleDeadline: "2026-05-01T08:00:00",
    canConsumerCancel: false,
    canConsumerReschedule: false,
    ...partial,
  } as AppointmentDto;
}

describe("addDays", () => {
  it("sposta la data nel futuro", () => {
    const d = new Date(Date.UTC(2026, 4, 3));
    const r = addDays(d, 10);
    expect(r.getUTCDate()).toBe(13);
    expect(r.getUTCMonth()).toBe(4);
  });

  it("non muta la data originale", () => {
    const d = new Date(2026, 0, 15);
    addDays(d, 1);
    expect(d.getDate()).toBe(15);
  });
});

describe("firstAppointmentDayByClient", () => {
  it("tiene la prima data per salonClientId", () => {
    const list = [
      ap({ id: "1", operatorId: "o1", salonClientId: "A", start: "2026-05-10T10:00:00" }),
      ap({ id: "2", operatorId: "o1", salonClientId: "A", start: "2026-05-02T10:00:00" }),
      ap({ id: "3", operatorId: "o1", salonClientId: "B", start: "2026-05-01T10:00:00" }),
    ];
    const m = firstAppointmentDayByClient(list);
    expect(m.get("A")).toBe("2026-05-02");
    expect(m.get("B")).toBe("2026-05-01");
  });

  it("ignora appuntamenti senza salonClientId", () => {
    const list = [ap({ id: "1", operatorId: "o1", salonClientId: "", start: "2026-05-01T10:00:00" })];
    expect(firstAppointmentDayByClient(list).size).toBe(0);
  });
});

describe("mergeAppointmentIndex", () => {
  it("unisce più liste senza duplicare id", () => {
    const a = ap({ id: "x", operatorId: "o1", start: "2026-05-01T10:00:00" });
    const b = ap({ id: "x", operatorId: "o2", start: "2026-06-01T10:00:00" });
    const m = mergeAppointmentIndex([[a], [b]]);
    expect(m.size).toBe(1);
    expect(m.get("x")?.operatorId).toBe("o1");
  });
});

describe("buildStaffPerformance", () => {
  const staffById = new Map([
    [
      "o1",
      { firstName: "Mario", lastName: "Rossi", role: "Stylist", photoDataUrl: null },
    ],
  ]);

  it("conta clienti distinti per operatore e ordina per clientCount", () => {
    const month: AppointmentDto[] = [
      ap({ id: "a1", operatorId: "o1", salonClientId: "c1", start: "2026-05-01T10:00:00" }),
      ap({ id: "a2", operatorId: "o1", salonClientId: "c2", start: "2026-05-02T10:00:00" }),
      ap({ id: "a3", operatorId: "o2", salonClientId: "c3", start: "2026-05-03T10:00:00" }),
    ];
    const reviews: MeSalonReview[] = [];
    const idx = mergeAppointmentIndex([month]);
    const rows = buildStaffPerformance(month, reviews, idx, staffById);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.operatorId).toBe("o1");
    expect(rows[0]!.clientCount).toBe(2);
    expect(rows[0]!.displayName).toBe("Mario Rossi");
    expect(rows[1]!.operatorId).toBe("o2");
    expect(rows[1]!.clientCount).toBe(1);
  });

  it("media stelle voto operatore (staffRating) sulle recensioni collegate agli appuntamenti", () => {
    const month: AppointmentDto[] = [
      ap({ id: "ap1", operatorId: "o1", salonClientId: "c1", start: "2026-05-01T10:00:00" }),
      ap({ id: "ap2", operatorId: "o1", salonClientId: "c2", start: "2026-05-02T10:00:00" }),
    ];
    const reviews: MeSalonReview[] = [
      {
        id: "r1",
        rating: 5,
        staffRating: 5,
        comment: null,
        createdAt: "2026-05-02T00:00:00Z",
        reviewerName: "X",
        appointmentId: "ap1",
        appointmentStart: null,
        serviceName: null,
        locationName: null,
      },
      {
        id: "r2",
        rating: 4,
        staffRating: 3,
        comment: null,
        createdAt: "2026-05-03T00:00:00Z",
        reviewerName: "Y",
        appointmentId: "ap2",
        appointmentStart: null,
        serviceName: null,
        locationName: null,
      },
    ];
    const idx = mergeAppointmentIndex([month]);
    const rows = buildStaffPerformance(month, reviews, idx, staffById);
    expect(rows[0]!.avgRating).toBe(4);
  });

  it("senza staffRating non calcola media (solo voto operatore reale)", () => {
    const month: AppointmentDto[] = [
      ap({ id: "ap1", operatorId: "o1", salonClientId: "c1", start: "2026-05-01T10:00:00" }),
    ];
    const reviews: MeSalonReview[] = [
      {
        id: "r1",
        rating: 5,
        staffRating: null,
        comment: null,
        createdAt: "2026-05-02T00:00:00Z",
        reviewerName: "X",
        appointmentId: "ap1",
        appointmentStart: null,
        serviceName: null,
        locationName: null,
      },
    ];
    const idx = mergeAppointmentIndex([month]);
    const rows = buildStaffPerformance(month, reviews, idx, staffById);
    expect(rows[0]!.avgRating).toBeNull();
  });
});
