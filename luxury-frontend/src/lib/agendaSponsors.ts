/** Sponsor del posto «agenda cliente». Il carousel ne mostra al massimo cinque. */

export const AGENDA_SPONSOR_PLACEMENT = "client_bookings";
export const AGENDA_SPONSOR_SLOTS = 5;

export type AgendaSponsor = {
  id: string;
  placement: string;
  brandName: string;
  headline: string;
  ctaLabel: string;
  href: string;
  imageSrc: string;
  sortOrder: number;
  active: boolean;
};

export const AGENDA_SPONSOR_DEMOS: readonly AgendaSponsor[] = [
  demo("noir-silk", "Noir Silk", "After-care per i capelli tra una visita e l’altra", "Scopri", "/ads/demo-client-noir-silk.svg", 0),
  demo("velvet-bloom", "Velvet Bloom", "Fiori e gloss per il tuo after-care", "Scopri", "/ads/demo-client-velvet-bloom.svg", 1),
  demo("aqua-mirage", "Aqua Mirage", "Idratazione che si nota", "Prova", "/ads/demo-client-aqua-mirage.svg", 2),
  demo("amber-brush", "Amber Brush", "Pennelli che non tradiscono il colore", "Scopri", "/ads/demo-staff-amber-brush.svg", 3),
  demo("echo-scent", "Echo Scent", "Una firma leggera tra un appuntamento e l’altro", "Prova", "/ads/demo-staff-echo-scent.svg", 4),
];

function demo(
  id: string,
  brandName: string,
  headline: string,
  ctaLabel: string,
  imageSrc: string,
  sortOrder: number,
): AgendaSponsor {
  return {
    id,
    placement: AGENDA_SPONSOR_PLACEMENT,
    brandName,
    headline,
    ctaLabel,
    href: `https://example.com/ads/${id}`,
    imageSrc,
    sortOrder,
    active: true,
  };
}

/** I marchi salvati dal super admin sostituiscono i cinque di prova. */
export function resolveAgendaSponsors(remote: readonly AgendaSponsor[] | null | undefined): AgendaSponsor[] {
  const live = (remote ?? [])
    .filter(
      (sponsor) =>
        sponsor.active !== false &&
        Boolean(sponsor.brandName?.trim()) &&
        Boolean(sponsor.headline?.trim()) &&
        Boolean(sponsor.imageSrc?.trim()),
    )
    .slice(0, AGENDA_SPONSOR_SLOTS);
  if (live.length > 0) return [...live];
  return AGENDA_SPONSOR_DEMOS.map((sponsor) => ({ ...sponsor }));
}
