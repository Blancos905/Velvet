import type { TrendingGroupPool } from "./trendingIdeas";

/**
 * Pool «Idee per la tua prossima visita» — solo app mobile (UA SaloniLuxuryApp).
 * Quattro card visibili per settimana per: Saloni, Parrucchieri, Estetisti, Massaggiatori.
 */
export const TRENDING_GROUP_POOLS_NATIVE_APP: TrendingGroupPool[] = [
  {
    id: "saloni",
    heading: "Saloni",
    items: [
      {
        id: "completo",
        title: "Salone completo",
        q: "salone bellezza",
        image:
          "/editorial/photo-1522337360788-8b13dee7a37e.webp",
        imageAlt: "Interno salone hair & beauty",
      },
      {
        id: "quartiere",
        title: "Nel tuo quartiere",
        q: "salone parrucchiere",
        image:
          "/editorial/photo-1527799820374-dcf8d9d4a388.webp",
        imageAlt: "Salone di quartiere accogliente",
      },
      {
        id: "team",
        title: "Team di professionisti",
        q: "centro estetico",
        image:
          "/editorial/photo-1516975080664-ed2fc6a32937.webp",
        imageAlt: "Team di estetiste al lavoro",
      },
      {
        id: "benessere",
        title: "Benessere & relax",
        q: "centro benessere",
        image:
          "/editorial/photo-1540555700478-4be289fbecef.webp",
        imageAlt: "Area relax in centro benessere",
      },
      {
        id: "premium",
        title: "Esperienza premium",
        q: "salone luxury",
        image:
          "/editorial/photo-1560066984-138dadb4c035.webp",
        imageAlt: "Salone di lusso con servizi premium",
      },
      {
        id: "family",
        title: "Per tutta la famiglia",
        q: "salone famiglia",
        image:
          "/editorial/photo-1582095133179-bfd08e2fc6b3.webp",
        imageAlt: "Salone accogliente per tutta la famiglia",
      },
      {
        id: "consulenza",
        title: "Consulenza look",
        q: "consulenza immagine",
        image:
          "/editorial/photo-1519699047748-de8e457a634e.webp",
        imageAlt: "Consulenza look e styling",
      },
      {
        id: "novita",
        title: "Novità di stagione",
        q: "trattamento stagionale",
        image:
          "/editorial/photo-1570172619644-dfd03ed5d881.webp",
        imageAlt: "Trattamenti di stagione in salone",
      },
    ],
  },
  {
    id: "parrucchieri",
    heading: "Parrucchieri",
    items: [
      {
        id: "taglio",
        title: "Taglio & piega",
        q: "taglio piega",
        image:
          "/editorial/photo-1560066984-138dadb4c035.webp",
        imageAlt: "Salone parrucchiere",
      },
      {
        id: "barber",
        title: "Barber & barba",
        q: "barbiere",
        image:
          "/editorial/photo-1503951914875-452162b0f3f1.webp",
        imageAlt: "Barbiere al lavoro",
      },
      {
        id: "colore",
        title: "Colore & styling",
        q: "colore capelli",
        image:
          "/editorial/photo-1522337360788-8b13dee7a37e.webp",
        imageAlt: "Colore e piega capelli",
      },
      {
        id: "acconciatura",
        title: "Acconciatura eventi",
        q: "acconciatura",
        image:
          "/editorial/photo-1519699047748-de8e457a634e.webp",
        imageAlt: "Acconciatura per evento",
      },
      {
        id: "trattamento-capelli",
        title: "Trattamento capelli",
        q: "trattamento capelli",
        image:
          "/editorial/photo-1527799820374-dcf8d9d4a388.webp",
        imageAlt: "Trattamento rigenerante per capelli",
      },
      {
        id: "piega",
        title: "Piega & brushing",
        q: "piega",
        image:
          "/editorial/photo-1522337660859-02fbefca4702.webp",
        imageAlt: "Piega e brushing in salone",
      },
      {
        id: "extension",
        title: "Extension & volume",
        q: "extension capelli",
        image:
          "/editorial/photo-1522335789203-aabd1fc54bc9.webp",
        imageAlt: "Extension e volumizzazione capelli",
      },
      {
        id: "uomo",
        title: "Look uomo",
        q: "taglio uomo",
        image:
          "/editorial/photo-1621605815971-fbc98d665033.webp",
        imageAlt: "Taglio e styling uomo",
      },
    ],
  },
  {
    id: "estetisti",
    heading: "Estetisti",
    items: [
      {
        id: "viso",
        title: "Trattamento viso",
        q: "trattamento viso",
        image:
          "/editorial/photo-1570172619644-dfd03ed5d881.webp",
        imageAlt: "Trattamento viso in istituto di bellezza",
      },
      {
        id: "unghie",
        title: "Unghie & nail art",
        q: "unghie",
        image:
          "/editorial/photo-1604654894610-df63bc536371.webp",
        imageAlt: "Manicure e smalto semipermanente",
      },
      {
        id: "makeup",
        title: "Trucco & make-up",
        q: "trucco",
        image:
          "/editorial/photo-1516975080664-ed2fc6a32937.webp",
        imageAlt: "Trucco professionale e make-up",
      },
      {
        id: "depilazione",
        title: "Depilazione",
        q: "depilazione",
        image:
          "/editorial/photo-1515372039744-b8f02a3ae446.webp",
        imageAlt: "Trattamento depilazione in istituto",
      },
      {
        id: "sopracciglia",
        title: "Sopracciglia & laminazione",
        q: "sopracciglia",
        image:
          "/editorial/photo-1522335789203-aabd1fc54bc9.webp",
        imageAlt: "Modellazione e laminazione sopracciglia",
      },
      {
        id: "corpo",
        title: "Trattamento corpo",
        q: "trattamento corpo",
        image:
          "/editorial/photo-1540555700478-4be289fbecef.webp",
        imageAlt: "Trattamento corpo in centro estetico",
      },
      {
        id: "ciglia",
        title: "Ciglia & laminazione",
        q: "extension ciglia",
        image:
          "/editorial/photo-1487412947147-5cebf100ffc2.webp",
        imageAlt: "Trattamento ciglia e laminazione",
      },
      {
        id: "peeling",
        title: "Peeling & glow",
        q: "peeling viso",
        image:
          "/editorial/photo-1596755389378-c31d21fd1273.webp",
        imageAlt: "Peeling viso per pelle luminosa",
      },
    ],
  },
  {
    id: "massaggi",
    heading: "Massaggiatori",
    items: [
      {
        id: "relax",
        title: "Massaggio relax",
        q: "massaggio relax",
        image:
          "/editorial/photo-1544161515-4ab6ce6db874.webp",
        imageAlt: "Massaggio rilassante",
      },
      {
        id: "decontratturante",
        title: "Decontratturante",
        q: "massaggio decontratturante",
        image:
          "/editorial/photo-1519823551278-64ac92734fb1.webp",
        imageAlt: "Massaggio decontratturante",
      },
      {
        id: "sportivo",
        title: "Massaggio sportivo",
        q: "massaggio sportivo",
        image:
          "/editorial/photo-1571019614242-c5c5dee9f50b.webp",
        imageAlt: "Massaggio sportivo",
      },
      {
        id: "linfodrenaggio",
        title: "Linfodrenaggio",
        q: "linfodrenaggio",
        image:
          "/editorial/photo-1515377905703-c4788e51af15.webp",
        imageAlt: "Trattamento linfodrenaggio",
      },
      {
        id: "spa",
        title: "Spa & centri benessere",
        q: "centro benessere",
        image:
          "/editorial/photo-1507652313519-d4e9174996dd.webp",
        imageAlt: "Ambiente spa e benessere",
      },
      {
        id: "pietre",
        title: "Pietre calde",
        q: "massaggio pietre calde",
        image:
          "/editorial/photo-1519823551278-64ac92734fb1.webp",
        imageAlt: "Massaggio con pietre calde",
      },
      {
        id: "shiatsu",
        title: "Shiatsu & olistico",
        q: "massaggio shiatsu",
        image:
          "/editorial/photo-1608571423902-eed4a5ad8108.webp",
        imageAlt: "Massaggio shiatsu olistico",
      },
      {
        id: "coppia",
        title: "Massaggio di coppia",
        q: "massaggio coppia",
        image:
          "/editorial/photo-1591343395082-e120087004b4.webp",
        imageAlt: "Esperienza massaggio di coppia",
      },
    ],
  },
];

/** @deprecated Usare `TRENDING_GROUP_POOLS_NATIVE_APP`. */
export const TRENDING_GROUPS_NATIVE_APP: TrendingGroupPool[] = TRENDING_GROUP_POOLS_NATIVE_APP;
