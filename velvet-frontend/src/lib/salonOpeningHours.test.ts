import { describe, expect, it } from "vitest";
import {
  formatSalonOpeningHours,
  isSlotWithinBookingWindow,
  minuteOfDayInTimeZone,
  parseOpeningHoursRange,
  replaceOpeningHoursTimes,
  resolveBookingHoursWindow,
  timeValueToMinuteOfDay,
} from "./salonOpeningHours";

describe("salonOpeningHours", () => {
  it("parses a time range from public opening hours text", () => {
    expect(parseOpeningHoursRange("Martedi - Sabato 08:30 - 19:00")).toEqual({ open: 510, close: 1140 });
  });

  it("replaces only the HH:mm range in opening hours text", () => {
    expect(replaceOpeningHoursTimes("Martedi - Sabato 08:30 - 19:00", 540, 1200)).toBe(
      "Martedi - Sabato 09:00 – 20:00",
    );
  });

  it("formats booking hours for display", () => {
    expect(formatSalonOpeningHours(510, 1140)).toBe("08:30 – 19:00");
    expect(timeValueToMinuteOfDay("19:00")).toBe(1140);
  });

  it("resolves booking window and checks slot boundaries in salon timezone", () => {
    const window = resolveBookingHoursWindow(540, 1080, "Europe/Rome");
    expect(window).not.toBeNull();
    const iso = "2026-05-20T07:00:00.000Z";
    expect(minuteOfDayInTimeZone(iso, "Europe/Rome")).toBe(9 * 60);
    expect(isSlotWithinBookingWindow(iso, window!, 30)).toBe(true);
    expect(isSlotWithinBookingWindow("2026-05-20T15:30:00.000Z", window!, 31)).toBe(false);
  });
});
