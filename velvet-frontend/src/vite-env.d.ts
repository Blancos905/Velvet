/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** URL o path iscrizione saloni (`/partner` = SPA interna). */
  readonly VITE_PARTNER_SIGNUP_URL?: string;
  /** Email contatto commerciale (pagina partner). */
  readonly VITE_PARTNER_CONTACT_EMAIL?: string;
  /** Opzionale: Google Maps Embed API (place) per iframe dashboard titolare. */
  readonly VITE_GOOGLE_MAPS_EMBED_API_KEY?: string;
  /** Base44: ID app (dashboard API → Authentication). */
  readonly VITE_BASE44_APP_ID?: string;
  /** Base44: API key (header `api_key`). */
  readonly VITE_BASE44_API_KEY?: string;
  /** Base44: override URL (default SDK = https://base44.app). */
  readonly VITE_BASE44_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
