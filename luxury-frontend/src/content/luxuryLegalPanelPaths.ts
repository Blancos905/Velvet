/** Percorsi web del pannello legale (stesso contenuto in app via `?embed=1`). */
export const LUXURY_LEGAL_PANEL_PATHS = {
  /** Informativa saloni partner (B2B). */
  privacy: "/privacy",
  /** Informativa clienti finali / app consumatore (B2C). */
  privacyConsumer: "/privacy/clienti",
  /** Informativa operatori e collaboratori del salone (staff). */
  privacyStaff: "/privacy/staff",
  terms: "/termini",
  privacyChoices: "/privacy/scelte",
  cookies: "/privacy/cookie",
  deleteAccount: "/privacy/elimina-account",
  legalHub: "/legale",
  /** Accordo Art. 28 GDPR (DPA) salone partner. */
  dataProcessingAgreement: "/legale/accordo-trattamento",
  accountInfoPrivacy: "/account/info-privacy",
} as const;

export function luxuryLegalPanelUrl(baseUrl: string, path: string, embed = true): string {
  const base = baseUrl.replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return embed ? `${base}${normalized}?embed=1` : `${base}${normalized}`;
}
