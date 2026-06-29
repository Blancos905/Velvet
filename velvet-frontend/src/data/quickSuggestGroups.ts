import type { SalonClientGenderId } from "./salonClientGenders";

export type QuickSuggestTag = {
  label: string;
  /** Valore `q` in ricerca; allineato a {@code SalonQuickSearchCatalogHints} (backend). */
  q: string;
  /** Pubblico salone (maschile/femminile) per filtrare i risultati geolocalizzati. */
  clientGenders?: SalonClientGenderId[];
};

export type QuickSuggestGroup = {
  id: string;
  label: string;
  tags: QuickSuggestTag[];
};

/** Suggerimenti rapidi: si aprono dopo il click su «Oppure un tocco». */
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
