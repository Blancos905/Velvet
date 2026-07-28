import { describe, expect, it } from "vitest";
import {
  organizationMatchesSalonBusinessTypes,
  salonLooksLikeHairdresser,
} from "./salonBusinessTypes";

describe("organizationMatchesSalonBusinessTypes", () => {
  it("includes untyped salons when filtering Parrucchiere", () => {
    expect(organizationMatchesSalonBusinessTypes(null, ["HAIR"])).toBe(true);
    expect(organizationMatchesSalonBusinessTypes([], ["HAIR"])).toBe(true);
  });

  it("includes hair-named salons for Parrucchiere even without HAIR in DB", () => {
    expect(
      organizationMatchesSalonBusinessTypes(["BEAUTY"], ["HAIR"], {
        name: "hair capelli cosenza 2",
        slug: "hair-capelli-2",
      }),
    ).toBe(true);
  });

  it("excludes untyped salons when filtering only Estetista", () => {
    expect(organizationMatchesSalonBusinessTypes(null, ["BEAUTY"])).toBe(false);
  });

  it("matches declared BEAUTY for Estetista filter", () => {
    expect(organizationMatchesSalonBusinessTypes(["BEAUTY"], ["BEAUTY"])).toBe(true);
    expect(
      organizationMatchesSalonBusinessTypes(["BEAUTY"], ["HAIR"], { name: "Centro estetico puro" }),
    ).toBe(false);
  });
});

describe("salonLooksLikeHairdresser", () => {
  it("detects common hairdresser naming", () => {
    expect(salonLooksLikeHairdresser("Hair Jassa", "hair-jassa")).toBe(true);
    expect(salonLooksLikeHairdresser("Spa relax", "spa-relax")).toBe(false);
  });
});
