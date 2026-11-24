import { describe, expect, it } from "vitest";
import { ALL_COUNTRIES, SEARCH_COUNTRIES } from "./searchLocations";
import { SEARCH_COUNTRY_CODES } from "./searchCountryCodes";

describe("SEARCH_COUNTRIES", () => {
  it("is a small curated subset of ALL_COUNTRIES", () => {
    expect(SEARCH_COUNTRIES.length).toBeGreaterThanOrEqual(10);
    expect(SEARCH_COUNTRIES.length).toBeLessThanOrEqual(25);
    expect(SEARCH_COUNTRIES.length).toBeLessThan(ALL_COUNTRIES.length);
    expect(SEARCH_COUNTRIES.length).toBe(SEARCH_COUNTRY_CODES.length);
  });

  it("lists Italy first", () => {
    expect(SEARCH_COUNTRIES[0]?.code).toBe("IT");
  });

  it("includes core EU and major world markets", () => {
    const codes = new Set(SEARCH_COUNTRIES.map((c) => c.code));
    for (const code of ["FR", "DE", "ES", "GB", "CH", "US", "BR", "AU"]) {
      expect(codes.has(code)).toBe(true);
    }
  });
});
