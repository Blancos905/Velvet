import { describe, expect, it } from "vitest";
import {
  SALON_MAX_LOCATIONS,
  clampSalonLocationCount,
  salonLocationMonthlyTotalEuros,
  salonLocationUnitEuros,
} from "./salonLocationPricing";

describe("salonLocationPricing", () => {
  it("applies the location brackets", () => {
    expect(salonLocationUnitEuros(1)).toBe(40);
    expect(salonLocationUnitEuros(2)).toBe(35);
    expect(salonLocationUnitEuros(3)).toBe(30);
    expect(salonLocationUnitEuros(6)).toBe(30);
  });

  it("totals unit times locations", () => {
    expect(salonLocationMonthlyTotalEuros(1)).toBe(40);
    expect(salonLocationMonthlyTotalEuros(2)).toBe(70);
    expect(salonLocationMonthlyTotalEuros(3)).toBe(90);
    expect(salonLocationMonthlyTotalEuros(4)).toBe(120);
  });

  it("clamps the count", () => {
    expect(clampSalonLocationCount(0)).toBe(1);
    expect(clampSalonLocationCount(SALON_MAX_LOCATIONS + 5)).toBe(SALON_MAX_LOCATIONS);
  });
});
