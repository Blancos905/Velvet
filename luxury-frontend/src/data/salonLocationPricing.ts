/** Allineato a {@code SalonMultiLocationPricing} (backend). */
export const SALON_MAX_LOCATIONS = 20;

export const SALON_PREMIUM_TRIAL_DAYS_FOR_LOCATIONS = 30;

/** Euro al mese per sede: 1 → 40, 2 → 35, da 3 → 30. */
export function salonLocationUnitEuros(locationCount: number): number {
  const count = clampSalonLocationCount(locationCount);
  if (count <= 1) return 40;
  if (count === 2) return 35;
  return 30;
}

export function salonLocationMonthlyTotalEuros(locationCount: number): number {
  const count = clampSalonLocationCount(locationCount);
  return salonLocationUnitEuros(count) * count;
}

export function clampSalonLocationCount(locationCount: number): number {
  if (!Number.isFinite(locationCount)) return 1;
  const whole = Math.floor(locationCount);
  if (whole < 1) return 1;
  return Math.min(SALON_MAX_LOCATIONS, whole);
}
