import type { SalonClientGenderId } from "./salonClientGenders";

export type QuickSuggestTag = {
  label: string;
  /** Valore `q` in ricerca; allineato a {@code SalonQuickSearchCatalogHints} (backend). */
  q: string;
  /** Pubblico salone (maschile/femminile) per filtrare i risultati geolocalizzati. */
  clientGenders?: SalonClientGenderId[];
  /** Tag dinamico da listino salone (non presente nei tasti curati). */
  dynamic?: boolean;
};

export type QuickSuggestGroup = {
  id: string;
  label: string;
  tags: QuickSuggestTag[];
};

export type QuickSuggestExtraFromApi = {
  label: string;
  q: string;
  groupId: string;
};

export type QuickSuggestAvailability = {
  curatedQueries: string[];
  extras: QuickSuggestExtraFromApi[];
};

/** Suggerimenti rapidi curati: si aprono dopo il click su «Oppure un tocco». */
export const QUICK_SUGGEST_GROUPS: QuickSuggestGroup[] = [
  {
    id: "parrucchieri",
    label: "Parrucchieri",
    tags: [
      { label: "Taglio donna", q: "taglio donna", clientGenders: ["FEMALE"] },
      { label: "Taglio uomo", q: "taglio uomo", clientGenders: ["MALE"] },
      { label: "Barbiere", q: "barbiere", clientGenders: ["MALE"] },
      { label: "Colore & mèches", q: "colore capelli" },
      { label: "Piega & brushing", q: "piega" },
      { label: "Keratina / liscio", q: "keratina" },
      { label: "Acconciatura sposa", q: "acconciatura sposa", clientGenders: ["FEMALE"] },
    ],
  },
  {
    id: "massaggi-fisio",
    label: "Massaggi & fisioterapia",
    tags: [
      { label: "Massaggio relax", q: "massaggio relax" },
      { label: "Decontratturante", q: "massaggio decontratturante" },
      { label: "Massaggio sportivo", q: "massaggio sportivo" },
      { label: "Fisioterapia", q: "fisioterapia" },
      { label: "Osteopatia", q: "osteopatia" },
      { label: "Linfodrenaggio", q: "linfodrenaggio" },
      { label: "Riflessologia", q: "riflessologia plantare" },
      { label: "Riabilitazione", q: "riabilitazione" },
    ],
  },
  {
    id: "estetisti",
    label: "Estetisti",
    tags: [
      { label: "Trattamento viso", q: "trattamento viso", clientGenders: ["FEMALE"] },
      { label: "Pulizia viso", q: "pulizia viso", clientGenders: ["FEMALE"] },
      { label: "Unghie & semipermanente", q: "unghie", clientGenders: ["FEMALE"] },
      { label: "Depilazione", q: "depilazione", clientGenders: ["FEMALE"] },
      { label: "Epilazione laser", q: "epilazione laser", clientGenders: ["FEMALE"] },
      { label: "Trucco / make-up", q: "trucco", clientGenders: ["FEMALE"] },
      { label: "Extension ciglia", q: "extension ciglia", clientGenders: ["FEMALE"] },
      { label: "Solarium", q: "solarium", clientGenders: ["FEMALE"] },
      { label: "Trattamento corpo", q: "trattamento corpo", clientGenders: ["FEMALE"] },
    ],
  },
];

const KNOWN_GROUP_IDS = new Set(QUICK_SUGGEST_GROUPS.map((g) => g.id));

function normalizeQuickQ(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Unisce tasti curati (eventualmente filtrati da disponibilità nel raggio) e tag dinamici da listino.
 */
export function mergeQuickSuggestGroups(
  availability: QuickSuggestAvailability | null,
): QuickSuggestGroup[] {
  const curatedSet = availability
    ? new Set(availability.curatedQueries.map(normalizeQuickQ))
    : null;

  const groups: QuickSuggestGroup[] = QUICK_SUGGEST_GROUPS.map((g) => ({
    ...g,
    tags: curatedSet
      ? g.tags.filter((t) => curatedSet.has(normalizeQuickQ(t.q)))
      : [...g.tags],
  }));

  const extras = availability?.extras ?? [];
  if (extras.length === 0) {
    return groups.filter((g) => g.tags.length > 0);
  }

  const byId = new Map(groups.map((g) => [g.id, g]));
  let altri = byId.get("altri");
  if (!altri) {
    altri = { id: "altri", label: "Altri servizi vicino a te", tags: [] };
    byId.set("altri", altri);
    groups.push(altri);
  }

  for (const extra of extras) {
    const groupId = KNOWN_GROUP_IDS.has(extra.groupId) ? extra.groupId : "altri";
    let target = byId.get(groupId);
    if (!target) {
      target = altri;
    }
    const nq = normalizeQuickQ(extra.q);
    if (target.tags.some((t) => normalizeQuickQ(t.q) === nq)) {
      continue;
    }
    target.tags.push({
      label: extra.label.trim() || extra.q.trim(),
      q: extra.q.trim(),
      dynamic: true,
    });
  }

  return groups.filter((g) => g.tags.length > 0);
}
