import { describe, expect, it } from "vitest";
import type { AppointmentDto, MeSalonReview } from "../api/types";
import {
  avgRatingList,
  buildTopServiceRows,
  firstOfMonthWithOffset,
  monthBounds,
  uniqueClientsInYm,
  ymKey,
} from "./salonStatisticsMetrics";

describe("monthBounds", () => {
  it("restituisce primo e ultimo giorno del mese in YYYY-MM-DD (mock locale)", () => {
    const fixed = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ref = new Date(2026, 4, 12);
    const b = monthBounds(ref, fixed);
    expect(b.from).toBe("2026-05-01");
    expect(b.to).toBe("2026-05-31");
    expect(b.label.length).toBeGreaterThan(3);
  });
});

describe("ymKey", () => {
  it("formatta YYYY-MM", () => {
    expect(ymKey(new Date(2026, 0, 5))).toBe("2026-01");
    expect(ymKey(new Date(2026, 11, 1))).toBe("2026-12");
  });
});

describe("firstOfMonthWithOffset", () => {
  it("sposta il primo del mese", () => {
    const d = firstOfMonthWithOffset(-1, new Date(2026, 5, 15));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(1);
  });
});

describe("uniqueClientsInYm", () => {
  it("conta salonClientId distinti con start nel mese", () => {
    const rows = [
      { start: "2026-05-01T10:00:00", salonClientId: "a" },
      { start: "2026-05-02T10:00:00", salonClientId: "a" },
      { start: "2026-05-03T10:00:00", salonClientId: "b" },
      { start: "2026-04-30T10:00:00", salonClientId: "c" },
    ] as AppointmentDto[];
    expect(uniqueClientsInYm(rows, "2026-05")).toBe(2);
  });
});

describe("avgRatingList", () => {
  it("restituisce null per lista vuota", () => {
    expect(avgRatingList([])).toBeNull();
  });

  it("media arrotondata a un decimale", () => {
    const list: MeSalonReview[] = [
      { rating: 5 } as MeSalonReview,
      { rating: 4 } as MeSalonReview,
    ];
    expect(avgRatingList(list)).toBe(4.5);
  });
});

describe("buildTopServiceRows", () => {
  it("ordina per conteggio e esclude ricavo da CANCELLED", () => {
    const rows = [
      { serviceName: "A", status: "COMPLETED", priceCents: 1000 },
      { serviceName: "A", status: "COMPLETED", priceCents: 2000 },
      { serviceName: "B", status: "CANCELLED", priceCents: 9999 },
      { serviceName: "B", status: "BOOKED", priceCents: 500 },
    ] as AppointmentDto[];
    const top = buildTopServiceRows(rows, 8);
    expect(top[0]!.name).toBe("A");
    expect(top[0]!.count).toBe(2);
    expect(top[0]!.revenue).toBe(3000);
    expect(top[1]!.name).toBe("B");
    expect(top[1]!.count).toBe(2);
    expect(top[1]!.revenue).toBe(500);
  });

  it("rispetta topN", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      serviceName: `S${i}`,
      status: "COMPLETED",
      priceCents: 100,
    })) as AppointmentDto[];
    expect(buildTopServiceRows(rows, 3)).toHaveLength(3);
  });
});
