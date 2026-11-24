/**
 * =============================================================================
 * POPUP PUBBLICITARI — zone nominate (post-login, ecc.)
 * =============================================================================
 *
 * Demo: marchi inventati a caso. In DEMO ogni ingresso in /account pesca
 * una campagna random per il ruolo (utile per la prova).
 *
 * Campagne reali → `AD_POPUPS_LIVE` + `AD_POPUP_DEMO_PLACEHOLDERS = false`.
 */

export type AdPopupZone =
  | "post_login_client"
  | "post_login_owner"
  | "post_login_staff"
  /** Card soft in `/account/profilo` (cliente). */
  | "client_profile"
  /** Legacy: l’agenda cliente usa `placement_sponsors` (`client_bookings`), non questa zona. */
  | "client_bookings"
  /** Strip soft in hub consumer (poco invasiva). */
  | "client_home";

export type AdPopupFrequency = "once_per_session" | "once_per_day";

export type AdPopupCampaign = {
  id: string;
  brandName: string;
  zone: AdPopupZone;
  headline: string;
  body: string;
  ctaLabel: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  priority?: number;
  frequency?: AdPopupFrequency;
};

export const AD_POPUP_DEMO_PLACEHOLDERS = true;

/**
 * Solo per stress-test del modal post-login.
 * Lasciare `false` in uso normale: il modal esce solo dopo login (pending).
 */
export const AD_POPUP_DEMO_SHOW_ON_ACCOUNT_ENTER = false;

export const AD_POPUP_SHOW_DELAY_MS = 900;

const AD_POPUP_DEMO_LIST: readonly AdPopupCampaign[] = [
  /* —— CLIENT —— */
  {
    id: "demo-client-velvet-bloom",
    brandName: "Velvet Bloom",
    zone: "post_login_client",
    headline: "Fiori e gloss per il tuo after-care",
    body: "Sieri e lip oil Velvet Bloom pensati per mantenere il glow dopo il salone.",
    ctaLabel: "Scopri Velvet Bloom",
    imageSrc: "/ads/demo-client-velvet-bloom.svg",
    imageAlt: "Creatività Velvet Bloom",
    href: "https://example.com/ads/velvet-bloom",
    priority: 10,
    frequency: "once_per_session",
  },
  {
    id: "demo-client-aqua-mirage",
    brandName: "Aqua Mirage",
    zone: "post_login_client",
    headline: "Idratazione che si nota",
    body: "Mist e cream Aqua Mirage: freschezza leggera, finish luxury.",
    ctaLabel: "Prova Aqua Mirage",
    imageSrc: "/ads/demo-client-aqua-mirage.svg",
    imageAlt: "Creatività Aqua Mirage",
    href: "https://example.com/ads/aqua-mirage",
    priority: 9,
    frequency: "once_per_session",
  },
  {
    id: "demo-client-noir-silk",
    brandName: "Noir Silk",
    zone: "post_login_client",
    headline: "Notte di seta sui capelli",
    body: "Olio leave-in Noir Silk per lucentezza soft fino al mattino.",
    ctaLabel: "Vai a Noir Silk",
    imageSrc: "/ads/demo-client-noir-silk.svg",
    imageAlt: "Creatività Noir Silk",
    href: "https://example.com/ads/noir-silk",
    priority: 8,
    frequency: "once_per_session",
  },
  /* —— OWNER —— */
  {
    id: "demo-owner-forge-pro",
    brandName: "Forge Pro Tools",
    zone: "post_login_owner",
    headline: "Attrezzatura trade per il tuo team",
    body: "Phon, piastre e kit colore Forge Pro con listino riservato ai titolari.",
    ctaLabel: "Apri listino trade",
    imageSrc: "/ads/demo-owner-forge-pro.svg",
    imageAlt: "Creatività Forge Pro",
    href: "https://example.com/ads/forge-pro",
    priority: 10,
    frequency: "once_per_session",
  },
  {
    id: "demo-owner-chrome-lab",
    brandName: "Chrome Lab Color",
    zone: "post_login_owner",
    headline: "Colori che fanno parlare il salone",
    body: "Sistema colore Chrome Lab: formazione inclusa e refill smart per Premium.",
    ctaLabel: "Richiedi demo",
    imageSrc: "/ads/demo-owner-chrome-lab.svg",
    imageAlt: "Creatività Chrome Lab",
    href: "https://example.com/ads/chrome-lab",
    priority: 9,
    frequency: "once_per_session",
  },
  {
    id: "demo-owner-linen-spa",
    brandName: "Linen & Spa Co.",
    zone: "post_login_owner",
    headline: "Accoglienza che si sente",
    body: "Linen, candele e amenity Linen & Spa Co. per alzare il tono della reception.",
    ctaLabel: "Catalogo hospitality",
    imageSrc: "/ads/demo-owner-linen-spa.svg",
    imageAlt: "Creatività Linen Spa",
    href: "https://example.com/ads/linen-spa",
    priority: 8,
    frequency: "once_per_session",
  },
  /* —— STAFF —— */
  {
    id: "demo-staff-pulse-cut",
    brandName: "Pulse Cut Studio",
    zone: "post_login_staff",
    headline: "Forme e texture della stagione",
    body: "Lookbook Pulse Cut per operatori: tagli, finishing e video tutorial.",
    ctaLabel: "Apri lookbook",
    imageSrc: "/ads/demo-staff-pulse-cut.svg",
    imageAlt: "Creatività Pulse Cut",
    href: "https://example.com/ads/pulse-cut",
    priority: 10,
    frequency: "once_per_session",
  },
  {
    id: "demo-staff-amber-brush",
    brandName: "Amber Brush",
    zone: "post_login_staff",
    headline: "Pennelli che non tradiscono",
    body: "Set Amber Brush anti-statici, pensati per coloristi e styling intensivo.",
    ctaLabel: "Scopri i set",
    imageSrc: "/ads/demo-staff-amber-brush.svg",
    imageAlt: "Creatività Amber Brush",
    href: "https://example.com/ads/amber-brush",
    priority: 9,
    frequency: "once_per_session",
  },
  {
    id: "demo-staff-echo-scent",
    brandName: "Echo Scent",
    zone: "post_login_staff",
    headline: "La firma olfattiva in cabina",
    body: "Diffusori Echo Scent a bassa intensità: atmosfera luxury senza stancare il cliente.",
    ctaLabel: "Prova le fragranze",
    imageSrc: "/ads/demo-staff-echo-scent.svg",
    imageAlt: "Creatività Echo Scent",
    href: "https://example.com/ads/echo-scent",
    priority: 8,
    frequency: "once_per_session",
  },
  /* —— CLIENT PROFILE (soft, focus) —— */
  {
    id: "demo-profile-velvet-bloom",
    brandName: "Velvet Bloom",
    zone: "client_profile",
    headline: "Cura a casa, tra un appuntamento e l’altro",
    body: "Suggerimenti beauty discreti sul tuo profilo: niente popup invasivi, solo un’idea se ti interessa.",
    ctaLabel: "Scopri Velvet Bloom",
    imageSrc: "/ads/demo-client-velvet-bloom.svg",
    imageAlt: "Velvet Bloom",
    href: "https://example.com/ads/velvet-bloom-profile",
    priority: 10,
    frequency: "once_per_day",
  },
  {
    id: "demo-profile-aqua-mirage",
    brandName: "Aqua Mirage",
    zone: "client_profile",
    headline: "Idratazione leggera per la tua routine",
    body: "Mist e cream Aqua Mirage — un tocco in più sul profilo, chiudibile quando vuoi.",
    ctaLabel: "Vedi Aqua Mirage",
    imageSrc: "/ads/demo-client-aqua-mirage.svg",
    imageAlt: "Aqua Mirage",
    href: "https://example.com/ads/aqua-mirage-profile",
    priority: 9,
    frequency: "once_per_day",
  },
  /* —— CLIENT BOOKINGS (soft strip) —— */
  {
    id: "demo-bookings-noir-silk",
    brandName: "Noir Silk",
    zone: "client_bookings",
    headline: "After-care per i capelli tra una visita e l’altra",
    body: "Olio leave-in Noir Silk — solo un suggerimento in fondo all’agenda.",
    ctaLabel: "Scopri",
    imageSrc: "/ads/demo-client-noir-silk.svg",
    imageAlt: "Noir Silk",
    href: "https://example.com/ads/noir-silk-bookings",
    priority: 10,
    frequency: "once_per_day",
  },
  /* —— CLIENT HOME (soft strip, rarissima) —— */
  {
    id: "demo-home-aqua-mirage",
    brandName: "Aqua Mirage",
    zone: "client_home",
    headline: "Un’idea beauty per la tua prossima visita",
    body: "Suggerimento leggero nell’hub: chiudilo e non ripropone oggi.",
    ctaLabel: "Apri",
    imageSrc: "/ads/demo-client-aqua-mirage.svg",
    imageAlt: "Aqua Mirage",
    href: "https://example.com/ads/aqua-mirage-home",
    priority: 5,
    frequency: "once_per_day",
  },
];

export const AD_POPUPS_LIVE: readonly AdPopupCampaign[] = [];

export const AD_POPUPS: readonly AdPopupCampaign[] = AD_POPUP_DEMO_PLACEHOLDERS
  ? AD_POPUP_DEMO_LIST
  : AD_POPUPS_LIVE;

function campaignsForZone(zone: AdPopupZone): AdPopupCampaign[] {
  return AD_POPUPS.filter((c) => c.zone === zone).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
}

export function pickAdPopupForZone(zone: AdPopupZone): AdPopupCampaign | null {
  return campaignsForZone(zone)[0] ?? null;
}

/** Demo / test: pesca a caso tra le campagne della zona. */
export function pickRandomAdPopupForZone(zone: AdPopupZone): AdPopupCampaign | null {
  const list = campaignsForZone(zone);
  if (list.length === 0) return null;
  const i = Math.floor(Math.random() * list.length);
  return list[i] ?? list[0] ?? null;
}
