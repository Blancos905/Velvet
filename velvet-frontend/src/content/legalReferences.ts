export type LegalCitation = {
  id: string;
  label: string;
  href: string;
};

export const GDPR_CITATIONS = {
  regulation: {
    id: "gdpr-regulation",
    label: "Regolamento (UE) 2016/679 (GDPR)",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679",
  },
  art12: {
    id: "gdpr-art-12",
    label: "Art. 12 GDPR — Trasparenza",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e1888-1-1",
  },
  art13: {
    id: "gdpr-art-13",
    label: "Art. 13 GDPR — Informazioni raccolte dall’interessato",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e1920-1-1",
  },
  art14: {
    id: "gdpr-art-14",
    label: "Art. 14 GDPR — Informazioni non ottenute dall’interessato",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e2000-1-1",
  },
  art15: {
    id: "gdpr-art-15",
    label: "Art. 15 GDPR — Diritto di accesso",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e2135-1-1",
  },
  art17: {
    id: "gdpr-art-17",
    label: "Art. 17 GDPR — Diritto alla cancellazione",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e2253-1-1",
  },
  art20: {
    id: "gdpr-art-20",
    label: "Art. 20 GDPR — Portabilità dei dati",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e2317-1-1",
  },
  art77: {
    id: "gdpr-art-77",
    label: "Art. 77 GDPR — Reclamo all’autorità di controllo",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679#d1e3117-1-1",
  },
  edpbTransparency: {
    id: "edpb-transparency",
    label: "EDPB — Informazioni agli interessati",
    href: "https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-information-should-i_en",
  },
  garante: {
    id: "garante-privacy",
    label: "Garante per la protezione dei dati personali",
    href: "https://www.garanteprivacy.it",
  },
  cookieDirective: {
    id: "e-privacy-cookie",
    label: "Direttiva 2002/58/CE (ePrivacy) — cookie e comunicazioni elettroniche",
    href: "https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32002L0058",
  },
} as const satisfies Record<string, LegalCitation>;

export const THIRD_PARTY_CITATIONS = {
  googleFonts: {
    id: "google-fonts",
    label: "Google Fonts — Privacy FAQ",
    href: "https://developers.google.com/fonts/faq#what_does_using_the_google_fonts_api_mean_for_the_privacy_of_my_users",
  },
  googleMaps: {
    id: "google-maps-terms",
    label: "Google Maps Platform — Termini di servizio",
    href: "https://cloud.google.com/maps-platform/terms",
  },
  nominatim: {
    id: "nominatim-usage",
    label: "OpenStreetMap Nominatim — Usage policy",
    href: "https://operations.osmfoundation.org/policies/nominatim/",
  },
  unsplash: {
    id: "unsplash",
    label: "Unsplash — Privacy Policy",
    href: "https://unsplash.com/privacy",
  },
} as const satisfies Record<string, LegalCitation>;

export const STORE_LEGAL_CITATIONS = {
  googleUserData: {
    id: "google-user-data",
    label: "Google Play — User Data policy",
    href: "https://support.google.com/googleplay/android-developer/answer/10144311",
  },
  googleDataSafety: {
    id: "google-data-safety",
    label: "Google Play — Data safety",
    href: "https://support.google.com/googleplay/android-developer/answer/10787469",
  },
  googleDeclareDataUse: {
    id: "google-declare-data-use",
    label: "Android Developers — Declare app data use",
    href: "https://developer.android.com/privacy-and-security/declare-data-use",
  },
  applePrivacyDetails: {
    id: "apple-privacy-details",
    label: "Apple — App Privacy Details",
    href: "https://developer.apple.com/app-store/app-privacy-details/",
  },
  appleManagePrivacy: {
    id: "apple-manage-privacy",
    label: "Apple — Manage app privacy",
    href: "https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/",
  },
  applePrivacyManifests: {
    id: "apple-privacy-manifests",
    label: "Apple — Privacy manifests",
    href: "https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests",
  },
} as const satisfies Record<string, LegalCitation>;

/** Contatto assistenza generale e richieste non privacy. */
export const LEGAL_CONTACT_EMAIL = "assistenza@saloniluxury.it";

/** Contatto dedicato all'esercizio dei diritti GDPR (Art. 15–22). */
export const LEGAL_PRIVACY_EMAIL = "privacy@saloniluxury.it";
