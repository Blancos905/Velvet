import { describe, expect, it } from "vitest";
import { localeFromCountryCode } from "./countryToLocale";

describe("localeFromCountryCode", () => {
  it("maps core markets", () => {
    expect(localeFromCountryCode("IT")).toBe("it");
    expect(localeFromCountryCode("FR")).toBe("fr");
    expect(localeFromCountryCode("DE")).toBe("de");
    expect(localeFromCountryCode("ES")).toBe("es");
    expect(localeFromCountryCode("PT")).toBe("pt");
    expect(localeFromCountryCode("GB")).toBe("en");
    expect(localeFromCountryCode("US")).toBe("en");
  });

  it("defaults unknown countries to English", () => {
    expect(localeFromCountryCode("JP")).toBe("en");
    expect(localeFromCountryCode("SE")).toBe("en");
  });
});
