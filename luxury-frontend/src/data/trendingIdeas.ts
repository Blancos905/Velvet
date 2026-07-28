import { getEditorialWeekIndex, selectWeeklyItems } from "../lib/editorialWeekIndex";
import { TRENDING_GROUP_POOLS_NATIVE_APP } from "./trendingIdeasNativeApp";

export type TrendIdeaCard = {
  id: string;
  title: string;
  q: string;
  image: string;
  imageAlt: string;
};

export type TrendingGroup = {
  /** Allineato a `monthlyIdeaSalonKind` lato API: estetisti | parrucchieri | massaggi */
  id: string;
  heading: string;
  items: TrendIdeaCard[];
};

export type TrendingGroupPool = Omit<TrendingGroup, "items"> & {
  items: TrendIdeaCard[];
};

/** Card visibili in home web per ogni tipologia salone. */
export const TREND_IDEAS_VISIBLE_WEB = 3;

/** Pool completo per tipologia — la home ne mostra 3 ruotate ogni settimana. */
export const TRENDING_GROUP_POOLS: TrendingGroupPool[] = [
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
    ],
  },
  {
    id: "massaggi",
    heading: "Massaggi & benessere",
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
        id: "spa",
        title: "Spa & centri benessere",
        q: "centro benessere",
        image:
          "/editorial/photo-1507652313519-d4e9174996dd.webp",
        imageAlt: "Ambiente spa e benessere",
      },
      {
        id: "pietre",
        title: "Massaggio terapeutico",
        q: "massaggio decontratturante",
        image:
          "/editorial/photo-1519823551278-64ac92734fb1.webp",
        imageAlt: "Massaggio con pietre calde",
      },
      {
        id: "sportivo",
        title: "Massaggio sportivo",
        q: "massaggio sportivo",
        image:
          "/editorial/photo-1571019614242-c5c5dee9f50b.webp",
        imageAlt: "Massaggio sportivo e recupero",
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
        id: "shiatsu",
        title: "Shiatsu & olistico",
        q: "massaggio shiatsu",
        image:
          "/editorial/photo-1600334089648-b0d9d3028eb2.webp",
        imageAlt: "Massaggio shiatsu olistico",
      },
    ],
  },
];

/** @deprecated Usare `trendIdeaGroupsForHome()` per la rotazione settimanale. */
export const TRENDING_GROUPS: TrendingGroup[] = TRENDING_GROUP_POOLS.map((pool) => ({
  ...pool,
  items: pool.items.slice(0, TREND_IDEAS_VISIBLE_WEB),
}));

function trendIdeaPoolsFor(options?: { nativeApp?: boolean }): TrendingGroupPool[] {
  return options?.nativeApp === true ? TRENDING_GROUP_POOLS_NATIVE_APP : TRENDING_GROUP_POOLS;
}

/** Griglie «Idee per la tua prossima visita» in home, con card e servizi ruotati ogni settimana. */
export function trendIdeaGroupsForHome(options?: {
  nativeApp?: boolean;
  weekIndex?: number;
}): TrendingGroup[] {
  const pools = trendIdeaPoolsFor(options);
  const weekIndex = options?.weekIndex ?? getEditorialWeekIndex();
  const visibleCount = options?.nativeApp === true ? 4 : TREND_IDEAS_VISIBLE_WEB;
  return pools.map((pool) => ({
    id: pool.id,
    heading: pool.heading,
    items: selectWeeklyItems(pool.items, visibleCount, weekIndex),
  }));
}

export function findTrendIdea(
  groupId: string,
  itemId: string,
  options?: { nativeApp?: boolean },
): { group: TrendingGroup; card: TrendIdeaCard } | null {
  const pools = trendIdeaPoolsFor(options);
  const pool = pools.find((g) => g.id === groupId);
  if (!pool) return null;
  const card = pool.items.find((i) => i.id === itemId);
  if (!card) return null;
  return { group: pool, card };
}

/** Gruppi idee home nell'app mobile (4 card × 4 verticali, rotazione settimanale). */
export function trendIdeaGroupsForNativeApp(options?: { weekIndex?: number }): TrendingGroup[] {
  return trendIdeaGroupsForHome({ nativeApp: true, weekIndex: options?.weekIndex });
}
