export function formatSalonClientAudienceLabel(genders: readonly string[] | null | undefined): string | null {
  if (!genders?.length) return null;
  const set = new Set(genders.map((g) => g.trim().toUpperCase()).filter(Boolean));
  if (set.size === 0) return null;
  const male = set.has("MALE");
  const female = set.has("FEMALE");
  if (male && female) return "Femminile e Maschile";
  if (male) return "Maschile";
  if (female) return "Femminile";
  return null;
}
