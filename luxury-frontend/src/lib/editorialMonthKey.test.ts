import { describe, expect, it } from "vitest";
import { getEditorialMonthKey } from "./editorialMonthKey";

describe("getEditorialMonthKey", () => {
  it("usa il calendario Europe/Rome (YYYY-MM)", () => {
    // 2026-07-01 00:30 UTC = 02:30 a Roma → luglio
    const key = getEditorialMonthKey(new Date("2026-07-01T00:30:00.000Z"));
    expect(key).toBe("2026-07");
  });
});
