import { describe, expect, it } from "vitest";
import {
  ALL_SALON_OPEN_DAYS,
  isSalonOpenOnYmd,
  normalizeSalonOpenDays,
  ymdToSalonOpenDay,
} from "./salonOpenDays";

describe("salonOpenDays", () => {
  it("normalizza giorni apertura e fallback tutti i giorni", () => {
    expect(normalizeSalonOpenDays(null)).toEqual(ALL_SALON_OPEN_DAYS);
    expect(normalizeSalonOpenDays(["TUESDAY", "FRIDAY", "tuesday"])).toEqual(["TUESDAY", "FRIDAY"]);
  });

  it("riconosce lunedì chiuso", () => {
    const openDays = ["TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    expect(isSalonOpenOnYmd("2026-07-06", openDays)).toBe(false);
    expect(isSalonOpenOnYmd("2026-07-07", openDays)).toBe(true);
    expect(ymdToSalonOpenDay("2026-07-06")).toBe("MONDAY");
  });
});
