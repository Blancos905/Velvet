import { describe, expect, it } from "vitest";
import {
  expectedCapLength,
  isFreeformPostalCountry,
  isPostalComplete,
  normalizePostalInput,
} from "./searchLocations";

describe("postal formats (multi-country)", () => {
  it("Italy stays 5 digits", () => {
    expect(expectedCapLength("IT")).toBe(5);
    expect(normalizePostalInput("20.121", "IT")).toBe("20121");
    expect(isPostalComplete("20121", "IT")).toBe(true);
    expect(isPostalComplete("2012", "IT")).toBe(false);
  });

  it("Germany and France use 5 digits", () => {
    expect(expectedCapLength("DE")).toBe(5);
    expect(expectedCapLength("FR")).toBe(5);
    expect(normalizePostalInput("75 001", "FR")).toBe("75001");
  });

  it("Switzerland uses 4 digits", () => {
    expect(expectedCapLength("CH")).toBe(4);
    expect(isPostalComplete("8001", "CH")).toBe(true);
  });

  it("UK freeform keeps letters", () => {
    expect(isFreeformPostalCountry("GB")).toBe(true);
    expect(expectedCapLength("GB")).toBe(0);
    expect(normalizePostalInput("sw1a 1aa", "GB")).toBe("SW1A 1AA");
    expect(isPostalComplete("SW1", "GB")).toBe(true);
    expect(isPostalComplete("SW", "GB")).toBe(false);
  });

  it("Portugal accepts 4 or 7 digits", () => {
    expect(expectedCapLength("PT")).toBe(7);
    expect(isPostalComplete("1000", "PT")).toBe(true);
    expect(isPostalComplete("1000001", "PT")).toBe(true);
  });

  it("US ZIP+4 truncates to 5", () => {
    expect(normalizePostalInput("10001-2345", "US")).toBe("10001");
  });
});
