import { describe, expect, it } from "vitest";
import { resolveProfileLocale } from "./resolveProfileLocale";

describe("resolveProfileLocale", () => {
  it("prefers preferredLocale when valid", () => {
    expect(resolveProfileLocale("en", "IT")).toBe("en");
    expect(resolveProfileLocale("fr", "DE")).toBe("fr");
  });

  it("falls back to country when preferredLocale missing", () => {
    expect(resolveProfileLocale(null, "FR")).toBe("fr");
    expect(resolveProfileLocale("", "US")).toBe("en");
  });

  it("defaults to italian when nothing set", () => {
    expect(resolveProfileLocale(null, null)).toBe("it");
  });
});
