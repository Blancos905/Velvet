import { TRENDING_GROUPS_NATIVE_APP } from "./trendingIdeasNativeApp";

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

export const TRENDING_GROUPS: TrendingGroup[] = [
  {
    id: "estetisti",
    heading: "Estetisti",
    items: [
      {
        id: "viso",
        title: "Trattamento viso",
        q: "trattamento viso",
        image:
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Trattamento viso in istituto di bellezza",
      },
      {
        id: "unghie",
        title: "Unghie & nail art",
        q: "unghie",
        image:
          "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Manicure e smalto semipermanente",
      },
      {
        id: "makeup",
        title: "Trucco & make-up",
        q: "trucco",
        image:
          "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Trucco professionale e make-up",
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
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Salone parrucchiere",
      },
      {
        id: "barber",
        title: "Barber & barba",
        q: "barbiere",
        image:
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Barbiere al lavoro",
      },
      {
        id: "colore",
        title: "Colore & styling",
        q: "colore capelli",
        image:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Colore e piega capelli",
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
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Massaggio rilassante",
      },
      {
        id: "spa",
        title: "Spa & centri benessere",
        q: "centro benessere",
        image:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Ambiente spa e benessere",
      },
      {
        id: "pietre",
        title: "Massaggio terapeutico",
        q: "massaggio decontratturante",
        image:
          "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Massaggio con pietre calde",
      },
    ],
  },
];

export function findTrendIdea(
  groupId: string,
  itemId: string,
  options?: { nativeApp?: boolean },
): { group: TrendingGroup; card: TrendIdeaCard } | null {
  const groups =
    options?.nativeApp === true ? trendIdeaGroupsForNativeApp() : TRENDING_GROUPS;
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  const card = group.items.find((i) => i.id === itemId);
  if (!card) return null;
  return { group, card };
}

/** Gruppi idee home nell'app mobile (4 card × 4 verticali). */
export function trendIdeaGroupsForNativeApp(): TrendingGroup[] {
  return TRENDING_GROUPS_NATIVE_APP;
}
