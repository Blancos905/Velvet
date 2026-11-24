import type { MessageCatalog } from "../it";
import { itFooterMessages } from "./it";

export type FooterMessageCatalog = Pick<MessageCatalog, keyof typeof itFooterMessages>;

export const enFooterMessages: FooterMessageCatalog = {
  "footer.aria": "Site footer",
  "footer.app.title": "Download the Saloni Luxury app",
  "footer.app.lead":
    "Book at your favourite salon and manage your appointments directly from the official app for Android and iPhone.",
  "footer.store.availableOn": "Get it on",
  "footer.store.downloadOn": "Download on the",
  "footer.store.googlePlay": "Google Play",
  "footer.store.appStore": "App Store",
  "footer.legal.navAria": "Legal documents",
  "footer.legal.toggle": "Legal documents",
  "footer.legal.privacyClient": "Client privacy (B2C)",
  "footer.legal.privacyStaff": "Staff privacy",
  "footer.legal.privacySalon": "Salon privacy (B2B)",
  "footer.legal.terms": "Terms of service",
  "footer.legal.freeLicense": "Free license",
  "footer.legal.privacyChoices": "Privacy choices",
  "footer.legal.cookies": "Cookie policy",
  "footer.legal.deleteAccount": "Delete account",
  "footer.legal.storeHub": "Store requirements",
};

export const frFooterMessages: FooterMessageCatalog = {
  ...enFooterMessages,
  "footer.aria": "Pied de page",
  "footer.app.title": "Téléchargez l'app Saloni Luxury",
  "footer.app.lead":
    "Réservez dans votre salon préféré et gérez vos rendez-vous directement depuis l'app officielle pour Android et iPhone.",
  "footer.store.availableOn": "Disponible sur",
  "footer.store.downloadOn": "Télécharger dans l'",
  "footer.legal.navAria": "Documents légaux",
  "footer.legal.toggle": "Documents légaux",
  "footer.legal.privacyClient": "Confidentialité clients (B2C)",
  "footer.legal.privacyStaff": "Confidentialité staff",
  "footer.legal.privacySalon": "Confidentialité salons (B2B)",
  "footer.legal.terms": "Conditions d'utilisation",
  "footer.legal.freeLicense": "Licence gratuite",
  "footer.legal.privacyChoices": "Choix de confidentialité",
  "footer.legal.cookies": "Politique cookies",
  "footer.legal.deleteAccount": "Supprimer le compte",
  "footer.legal.storeHub": "Exigences stores",
};

export const deFooterMessages: FooterMessageCatalog = {
  ...enFooterMessages,
  "footer.aria": "Fußzeile",
  "footer.app.title": "Saloni Luxury App herunterladen",
  "footer.app.lead":
    "Buchen Sie in Ihrem Lieblingssalon und verwalten Sie Termine direkt in der offiziellen App für Android und iPhone.",
  "footer.store.availableOn": "Jetzt bei",
  "footer.store.downloadOn": "Laden im",
  "footer.legal.navAria": "Rechtliche Dokumente",
  "footer.legal.toggle": "Rechtliche Dokumente",
  "footer.legal.privacyClient": "Kunden-Datenschutz (B2C)",
  "footer.legal.privacyStaff": "Staff-Datenschutz",
  "footer.legal.privacySalon": "Salon-Datenschutz (B2B)",
  "footer.legal.terms": "Nutzungsbedingungen",
  "footer.legal.freeLicense": "Kostenlose Lizenz",
  "footer.legal.privacyChoices": "Datenschutzeinstellungen",
  "footer.legal.cookies": "Cookie-Richtlinie",
  "footer.legal.deleteAccount": "Konto löschen",
  "footer.legal.storeHub": "Store-Anforderungen",
};

export const esFooterMessages: FooterMessageCatalog = {
  ...enFooterMessages,
  "footer.aria": "Pie de página",
  "footer.app.title": "Descarga la app Saloni Luxury",
  "footer.app.lead":
    "Reserva en tu salón favorito y gestiona tus citas directamente desde la app oficial para Android e iPhone.",
  "footer.store.availableOn": "Disponible en",
  "footer.store.downloadOn": "Descargar en la",
  "footer.legal.navAria": "Documentos legales",
  "footer.legal.toggle": "Documentos legales",
  "footer.legal.privacyClient": "Privacidad clientes (B2C)",
  "footer.legal.privacyStaff": "Privacidad staff",
  "footer.legal.privacySalon": "Privacidad salones (B2B)",
  "footer.legal.terms": "Términos del servicio",
  "footer.legal.freeLicense": "Licencia gratuita",
  "footer.legal.privacyChoices": "Opciones de privacidad",
  "footer.legal.cookies": "Política de cookies",
  "footer.legal.deleteAccount": "Eliminar cuenta",
  "footer.legal.storeHub": "Requisitos de las stores",
};

export const ptFooterMessages: FooterMessageCatalog = {
  ...enFooterMessages,
  "footer.aria": "Rodapé",
  "footer.app.title": "Descarregue a app Saloni Luxury",
  "footer.app.lead":
    "Marque no seu salão preferido e gira as suas marcações diretamente na app oficial para Android e iPhone.",
  "footer.store.availableOn": "Disponível no",
  "footer.store.downloadOn": "Descarregar na",
  "footer.legal.navAria": "Documentos legais",
  "footer.legal.toggle": "Documentos legais",
  "footer.legal.privacyClient": "Privacidade clientes (B2C)",
  "footer.legal.privacyStaff": "Privacidade staff",
  "footer.legal.privacySalon": "Privacidade salões (B2B)",
  "footer.legal.terms": "Termos de serviço",
  "footer.legal.freeLicense": "Licença gratuita",
  "footer.legal.privacyChoices": "Escolhas de privacidade",
  "footer.legal.cookies": "Política de cookies",
  "footer.legal.deleteAccount": "Eliminar conta",
  "footer.legal.storeHub": "Requisitos das stores",
};
