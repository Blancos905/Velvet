/// Piano salone (JWT / API). `BASE` è lo stato tecnico non-Premium, `PREMIUM` il piano commerciale. `STANDARD`/`FULL` → premium.
enum SalonPlanTier {
  base,
  premium,
}

SalonPlanTier? parseSalonPlanTier(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  switch (raw.trim().toUpperCase()) {
    case 'BASE':
      return SalonPlanTier.base;
    case 'PREMIUM':
    case 'STANDARD':
    case 'FULL':
      return SalonPlanTier.premium;
    default:
      return null;
  }
}

String salonPlanTierCode(SalonPlanTier tier) {
  switch (tier) {
    case SalonPlanTier.base:
      return 'BASE';
    case SalonPlanTier.premium:
      return 'PREMIUM';
  }
}
