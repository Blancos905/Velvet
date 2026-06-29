import type { TrendingGroup } from "./trendingIdeas";

/**
 * Griglie «Idee per la tua prossima visita» — solo app mobile (UA SaloniLuxuryApp).
 * Quattro card per: Saloni, Parrucchieri, Estetisti, Massaggiatori.
 */
export const TRENDING_GROUPS_NATIVE_APP: TrendingGroup[] = [
  {
    id: "saloni",
    heading: "Saloni",
    items: [
      {
        id: "completo",
        title: "Salone completo",
        q: "salone bellezza",
        image:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Interno salone hair & beauty",
      },
      {
        id: "quartiere",
        title: "Nel tuo quartiere",
        q: "salone parrucchiere",
        image:
          "https://images.unsplash.com/photo-1633681926022-84c23e8cb04d?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Salone di quartiere accogliente",
      },
      {
        id: "team",
        title: "Team di professionisti",
        q: "centro estetico",
        image:
          "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Team di estetiste al lavoro",
      },
      {
        id: "benessere",
        title: "Benessere & relax",
        q: "centro benessere",
        image:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Area relax in centro benessere",
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
      {
        id: "acconciatura",
        title: "Acconciatura eventi",
        q: "acconciatura",
        image:
          "https://images.unsplash.com/photo-1492106087820-71f1a00d8d11?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Acconciatura per evento",
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
      {
        id: "depilazione",
        title: "Depilazione",
        q: "depilazione",
        image:
          "https://images.unsplash.com/photo-1515377901643-4a974a95949c?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Trattamento depilazione in istituto",
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
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Massaggio rilassante",
      },
      {
        id: "decontratturante",
        title: "Decontratturante",
        q: "massaggio decontratturante",
        image:
          "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Massaggio decontratturante",
      },
      {
        id: "sportivo",
        title: "Massaggio sportivo",
        q: "massaggio sportivo",
        image:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Massaggio sportivo",
      },
      {
        id: "linfodrenaggio",
        title: "Linfodrenaggio",
        q: "linfodrenaggio",
        image:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
        imageAlt: "Trattamento linfodrenaggio",
      },
    ],
  },
];
