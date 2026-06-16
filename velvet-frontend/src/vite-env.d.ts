/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** URL o path iscrizione saloni (`/partner` = SPA interna). */
  readonly VITE_PARTNER_SIGNUP_URL?: string;
  /** Email contatto commerciale (pagina partner). */
  readonly VITE_PARTNER_CONTACT_EMAIL?: string;
  /** Opzionale: Google Maps Embed API (place) per iframe dashboard titolare. */
  readonly VITE_GOOGLE_MAPS_EMBED_API_KEY?: string;
  /** Dati societari pubblici (store / GDPR). */
  readonly VITE_COMPANY_NAME?: string;
  readonly VITE_COMPANY_LEGAL_NAME?: string;
  readonly VITE_COMPANY_ADDRESS?: string;
  readonly VITE_COMPANY_VAT?: string;
  readonly VITE_COMPANY_EMAIL?: string;
  /** Giorni conservazione log (allineare a velvet.logging.retention-days). */
  readonly VITE_LOG_RETENTION_DAYS?: string;
  /** @deprecated usare VITE_COMPANY_* */
  readonly VITE_LEGAL_ENTITY_NAME?: string;
  readonly VITE_LEGAL_ENTITY_LEGAL_NAME?: string;
  readonly VITE_LEGAL_ENTITY_ADDRESS?: string;
  readonly VITE_LEGAL_ENTITY_VAT?: string;
  readonly VITE_LEGAL_ENTITY_DPO_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
