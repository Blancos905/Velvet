/** Catalogo **100 template** layout piano Premium: 10 strutture documentate + 90 varianti colore (`vet-palette-*`). */

export const SALON_STANDARD_LAYOUT_TEMPLATE_STORAGE_KEY = "velvet_salon_standard_layout_template_id";

export const BASE_STANDARD_LAYOUT_TEMPLATE_IDS = [
  "essenziale",
  "focus-giornata",
  "operatore-solo",
  "studio-calmo",
  "alta-densita",
  "mobile-first-estremo",
  "dual-column",
  "card-timeline",
  "minimal-notifiche",
  "brand-hero",
] as const;

/** 90 id `vet-palette-011` … `vet-palette-100` (stessa struttura vetrina, tema HSL da `--showcase-h`). */
export const VET_PALETTE_TEMPLATE_IDS: readonly string[] = Array.from({ length: 90 }, (_, i) => {
  const n = i + 11;
  return `vet-palette-${String(n).padStart(3, "0")}`;
});

export const STANDARD_LAYOUT_TEMPLATE_IDS = [
  ...BASE_STANDARD_LAYOUT_TEMPLATE_IDS,
  ...VET_PALETTE_TEMPLATE_IDS,
] as readonly string[];

export type StandardLayoutTemplateId = (typeof STANDARD_LAYOUT_TEMPLATE_IDS)[number];

export type StandardLayoutTemplate = {
  id: StandardLayoutTemplateId;
  order: number;
  name: string;
  description: string;
  tokenHighlights: string[];
};

const BASE_STANDARD_LAYOUT_CATALOG: StandardLayoutTemplate[] = [
  {
    id: "essenziale",
    order: 1,
    name: "Essenziale",
    description:
      "Timeline a tutta larghezza, metriche compatte in alto e FAB in basso — reception velocissima.",
    tokenHighlights: ["Timeline comoda", "Metriche compatte", "CTA primaria in basso"],
  },
  {
    id: "focus-giornata",
    order: 2,
    name: "Focus giornata",
    description:
      "Blocco stato giornata ingrandito, timeline compressa a metà schermo su desktop; ideale per buchi agenda e priorità giornata.",
    tokenHighlights: ["Hero stato giornata", "Timeline ridotta desktop", "KPI in evidenza"],
  },
  {
    id: "operatore-solo",
    order: 3,
    name: "Operatore solo",
    description:
      "Nasconde le metriche globali e filtra di default sull’operatore loggato — meno rumore cognitivo.",
    tokenHighlights: ["Vista operatore", "Metriche globali off", "Default filtro “io”"],
  },
  {
    id: "studio-calmo",
    order: 4,
    name: "Studio calmo",
    description:
      "Palette a bassa saturazione e animazioni ridotte — contesti estetici premium.",
    tokenHighlights: ["Contrasto soft", "Motion ridotto", "Card morbide"],
  },
  {
    id: "alta-densita",
    order: 5,
    name: "Alta densità",
    description:
      "Più righe per viewport, tipografia leggermente compatta — centri con molti appuntamenti brevi.",
    tokenHighlights: ["Righe extra", "Font −1 step", "Timeline compatta"],
  },
  {
    id: "mobile-first-estremo",
    order: 6,
    name: "Mobile first estremo",
    description:
      "Azioni critiche in bottom sheet, tab superiori ridotte al minimo.",
    tokenHighlights: ["Bottom sheet", "Nav superiore minima", "Thumb zone"],
  },
  {
    id: "dual-column",
    order: 7,
    name: "Dual column",
    description:
      "Su desktop affianca agenda e lista clienti / insight — telefono e walk-in insieme.",
    tokenHighlights: ["Griglia 2 colonne", "Pannello insight", "Breakpoint desktop"],
  },
  {
    id: "card-timeline",
    order: 8,
    name: "Card timeline",
    description:
      "Appuntamenti come card anziché riga continua — note lunghe sempre visibili.",
    tokenHighlights: ["Card verticali", "Note espanse", "Scroll card"],
  },
  {
    id: "minimal-notifiche",
    order: 9,
    name: "Minimal notifiche",
    description:
      "Sidebar notifiche smart persistente, timeline centrale pulita.",
    tokenHighlights: ["Colonna notifiche", "Timeline centrale", "Distrazioni minime"],
  },
  {
    id: "brand-hero",
    order: 10,
    name: "Brand hero",
    description:
      "Logo e colore salone in header prominente; branding piattaforma discreto in footer — vicino al white-label senza fork.",
    tokenHighlights: ["Header brand", "Footer platform soft", "Accento brand"],
  },
];

const PALETTE_ADJ = [
  "Corallo",
  "Oceano",
  "Sabbia",
  "Nebbia",
  "Bosco",
  "More",
  "Malva",
  "Zenzero",
  "Petrolio",
  "Ambra",
  "Granato",
  "Orchidea",
  "Oliva",
  "Cipria",
  "Indaco",
] as const;

const PALETTE_TONE = ["Soft", "Vivo", "Notte", "Alba", "Profondo", "Chiaro"] as const;

const PALETTE_DESC_SNIPPETS = [
  "Accenti HSL coordinati su shell, carousel e pill servizi.",
  "Contrasto calibrato per titoli chiari e strip servizi leggibile.",
  "Glow e bordi leggeri legati all’accento principale del tema.",
  "Tipografia titolo neutra; il colore guida percezione brand.",
  "Adatto a vetrina pubblica: palette distinta senza fork CSS.",
] as const;

const PALETTE_TOKENS = [
  ["Shell HSL", "Accent pill", "Dot carousel"],
  ["Hero strip", "Bordo vetrina", "Glow soft"],
  ["Titolo chiaro", "Sottotitolo morbido", "Nav carousel"],
  ["Service strip", "Viewport foto", "CTA outline"],
] as const;

/** 9 preset di composizione sfondo (stesso id colore → stesso indice). */
export const VET_PALETTE_SKIN_LABELS = [
  "Aurora (luci in alto)",
  "Bacino (bagliore dal basso)",
  "Velatura (conico soft)",
  "Colonne (strati verticali)",
  "Gemini (due radiali)",
  "Vignetta (angoli)",
  "Diagonale (due toni)",
  "Spotlight (centro)",
  "Strati (fasce orizzontali)",
] as const;

const PALETTE_SKIN_DESC: readonly string[] = [
  "Doppio alone chiaro in alto a destra e profondità in basso a sinistra.",
  "Massa luminosa dal basso come riflesso su pavimento.",
  "Leggera rotazione cromatica sul fondo senza distrarre.",
  "Transizione verticale tra zone chiara e accento.",
  "Due foci laterali che incorniciano il contenuto.",
  "Scuritura agli angoli per effetto cornice cinematografica.",
  "Taglio diagonale tra due saturazioni dello stesso hue.",
  "Chiarore centrale tipo faretto su header vetrina.",
  "Bande orizzontali soft che ritmano la superficie.",
];

function vetPaletteCatalogRows(): StandardLayoutTemplate[] {
  return VET_PALETTE_TEMPLATE_IDS.map((id, i) => {
    const order = 11 + i;
    const name = `${PALETTE_ADJ[i % PALETTE_ADJ.length]} ${PALETTE_TONE[Math.floor(i / PALETTE_ADJ.length)]}`;
    const skin = i % 9;
    const baseTok: string[] = [...PALETTE_TOKENS[i % PALETTE_TOKENS.length]];
    baseTok[2] = VET_PALETTE_SKIN_LABELS[skin];
    return {
      id: id as StandardLayoutTemplateId,
      order,
      name,
      description: `Variante “${name}”: ${PALETTE_DESC_SNIPPETS[i % PALETTE_DESC_SNIPPETS.length]} Sfondo: ${PALETTE_SKIN_DESC[skin]}`,
      tokenHighlights: baseTok,
    };
  });
}

export const STANDARD_LAYOUT_CATALOG: StandardLayoutTemplate[] = [
  ...BASE_STANDARD_LAYOUT_CATALOG,
  ...vetPaletteCatalogRows(),
];

/** Hue 0–359 per id `vet-palette-NNN` (NNN 011–100), spaziatura uniforme sul cerchio cromatico. */
export function vetPaletteHueFromTemplateId(id: string): number | null {
  const m = /^vet-palette-(\d{3})$/.exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 11 || n > 100) return null;
  return Math.round((n * 137.5080469) % 360);
}

/** 0–8: preset strati sfondo (`data-palette-skin` + CSS). Allineato a `(NNN - 11) % 9`. */
export function vetPaletteSkinIndexFromTemplateId(id: string): number | null {
  const m = /^vet-palette-(\d{3})$/.exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 11 || n > 100) return null;
  return (n - 11) % 9;
}

export function isStandardLayoutTemplateId(value: string): value is StandardLayoutTemplateId {
  return (STANDARD_LAYOUT_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function getStandardLayoutTemplateById(id: string): StandardLayoutTemplate | undefined {
  return STANDARD_LAYOUT_CATALOG.find((t) => t.id === id);
}

export function readStoredStandardLayoutTemplateId(): StandardLayoutTemplateId | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SALON_STANDARD_LAYOUT_TEMPLATE_STORAGE_KEY);
    if (!raw || !isStandardLayoutTemplateId(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeStoredStandardLayoutTemplateId(id: StandardLayoutTemplateId): void {
  try {
    sessionStorage.setItem(SALON_STANDARD_LAYOUT_TEMPLATE_STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}
