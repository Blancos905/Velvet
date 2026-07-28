/** Allineati a {@code it.luxury.studio.domain.SalonBusinessType} (backend). */
export const SALON_BUSINESS_TYPE_OPTIONS = [
  { id: "HAIR", label: "Parrucchiere" },
  { id: "BEAUTY", label: "Estetista" },
  { id: "MASSAGE", label: "Massaggio / fisioterapia" },
] as const;

export type SalonBusinessTypeId = (typeof SALON_BUSINESS_TYPE_OPTIONS)[number]["id"];

/** Etichette brevi per chip filtro e badge nei risultati di ricerca. */
export const SALON_BUSINESS_TYPE_SHORT_LABELS: Record<SalonBusinessTypeId, string> = {
  HAIR: "Parrucchiere",
  BEAUTY: "Estetista",
  MASSAGE: "Massaggi",
};

const SALON_BUSINESS_TYPE_IDS = new Set<string>(SALON_BUSINESS_TYPE_OPTIONS.map((o) => o.id));

export function isSalonBusinessTypeId(value: string): value is SalonBusinessTypeId {
  return SALON_BUSINESS_TYPE_IDS.has(value);
}

/** Normalizza una lista di codici (es. da URL/API) ai soli id validi, deduplicati nell'ordine canonico. */
export function normalizeSalonBusinessTypeIds(values: readonly string[] | null | undefined): SalonBusinessTypeId[] {
  if (!values?.length) return [];
  const wanted = new Set<string>();
  for (const v of values) {
    const up = v.trim().toUpperCase();
    if (isSalonBusinessTypeId(up)) wanted.add(up);
  }
  return SALON_BUSINESS_TYPE_OPTIONS.filter((o) => wanted.has(o.id)).map((o) => o.id);
}

/** Indizio testuale parrucchiere (sedi legacy o tipologia non ancora allineata in DB). */
export function salonLooksLikeHairdresser(name?: string | null, slug?: string | null): boolean {
  const hay = `${name ?? ""} ${slug ?? ""}`.toLowerCase();
  if (!hay.trim()) return false;
  return (
    /\b(hair|capelli|parrucch|taglio|barber|barbiere|acconciat)\b/.test(hay) ||
    hay.includes("hair") ||
    hay.includes("capelli")
  );
}

export type SalonBusinessTypeMatchContext = {
  name?: string | null;
  slug?: string | null;
};

/**
 * Filtro tipologia (OR) sui risultati già caricati: non rifare la ricerca API al cambio chip.
 * Sedi senza tipologia → parrucchiere; nome/slug da parrucchiere → inclusi con filtro Parrucchiere.
 */
export function organizationMatchesSalonBusinessTypes(
  salonBusinessTypes: readonly string[] | null | undefined,
  filter: readonly SalonBusinessTypeId[],
  context?: SalonBusinessTypeMatchContext,
): boolean {
  if (filter.length === 0) return true;
  const declared = normalizeSalonBusinessTypeIds(salonBusinessTypes);
  if (filter.some((t) => declared.includes(t))) return true;

  if (filter.includes("HAIR")) {
    if (declared.length === 0) return true;
    if (salonLooksLikeHairdresser(context?.name, context?.slug)) {
      const onlyMassage = declared.length === 1 && declared[0] === "MASSAGE";
      return !onlyMassage;
    }
  }

  return false;
}
