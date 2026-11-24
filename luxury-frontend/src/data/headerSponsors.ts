/**
 * =============================================================================
 * HEADER SPONSOR — area da aggiornare quando arrivano i marchi reali
 * =============================================================================
 *
 * Cosa serve per ogni sponsor (dammelo così e li inserisco):
 *   1. nome commerciale
 *   2. logo ufficiale (SVG preferito, oppure PNG trasparente alta qualità)
 *   3. URL sito ufficiale (https://…)
 *   4. (opzionale) ordine di priorità nel percorso
 *
 * Dove vanno i file:
 *   - loghi → `luxury-frontend/public/sponsors/`  (vedi README lì)
 *   - elenco → questo file, array `HEADER_SPONSORS` sotto
 *
 * Comportamento UI (non toccare se non serve):
 *   - `HeaderSponsorRotator` in `AppHeader` (desktop ≥900px)
 *   - un marchio alla volta, destra → sinistra; click → sito sponsor (nuova scheda)
 *
 * Stato attuale: DEMO_PLACEHOLDERS = true → loghi/testi finti.
 * Quando arrivano i reali: metti DEMO_PLACEHOLDERS = false e sostituisci l’array.
 */

export type HeaderSponsor = {
  /** Chiave stabile snake-case (es. `loreal-professionnel`). */
  id: string;
  /** Nome mostrato in accessibilità / tracking. */
  name: string;
  /** Path sotto `public/` (es. `/sponsors/loreal.svg`) o URL assoluto del logo. */
  logoSrc: string;
  /** Sito ufficiale del marchio — obbligatorio per i reali (si apre in nuova scheda). */
  href?: string;
};

/**
 * `true` = placeholder di sviluppo (non usare in go-live).
 * `false` = solo marchi reali in `HEADER_SPONSORS`.
 */
export const HEADER_SPONSOR_DEMO_PLACEHOLDERS = true;

/** Durata (secondi) del percorso di un singolo sponsor da destra a sinistra. */
export const HEADER_SPONSOR_PATH_SECONDS = 7.5;

/** Marchi di prova orizzontali, fatti per il percorso dell’header. */
const HEADER_SPONSOR_DEMO_LIST: readonly HeaderSponsor[] = [
  {
    id: "noir-silk",
    name: "Noir Silk",
    logoSrc: "/sponsors/noir-silk.svg",
    href: "https://example.com/ads/noir-silk",
  },
  {
    id: "velvet-bloom",
    name: "Velvet Bloom",
    logoSrc: "/sponsors/velvet-bloom.svg",
    href: "https://example.com/ads/velvet-bloom",
  },
  {
    id: "aqua-mirage",
    name: "Aqua Mirage",
    logoSrc: "/sponsors/aqua-mirage.svg",
    href: "https://example.com/ads/aqua-mirage",
  },
  {
    id: "amber-brush",
    name: "Amber Brush",
    logoSrc: "/sponsors/amber-brush.svg",
    href: "https://example.com/ads/amber-brush",
  },
  {
    id: "echo-scent",
    name: "Echo Scent",
    logoSrc: "/sponsors/echo-scent.svg",
    href: "https://example.com/ads/echo-scent",
  },
];

/**
 * Elenco ufficiale sponsor header.
 * Quando me li dai: inserisco qui (e i file in `public/sponsors/`), poi
 * `HEADER_SPONSOR_DEMO_PLACEHOLDERS = false`.
 */
export const HEADER_SPONSORS_LIVE: readonly HeaderSponsor[] = [
  // Esempio (commentato):
  // {
  //   id: "brand-slug",
  //   name: "Nome Brand",
  //   logoSrc: "/sponsors/brand-slug.svg",
  //   href: "https://www.brand.example/",
  // },
];

export const HEADER_SPONSORS: readonly HeaderSponsor[] = HEADER_SPONSOR_DEMO_PLACEHOLDERS
  ? HEADER_SPONSOR_DEMO_LIST
  : HEADER_SPONSORS_LIVE;
