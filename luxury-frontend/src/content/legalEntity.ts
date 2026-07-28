import { LEGAL_PRIVACY_EMAIL } from "./legalReferences";
import { LEGAL_DOCUMENT_VERSION as SHARED_LEGAL_DOCUMENT_VERSION, LEGAL_DPA_DOCUMENT_VERSION as SHARED_LEGAL_DPA_DOCUMENT_VERSION } from "./legalSharedCopy";

/** Versione pubblicata dei documenti legali (allineare a data/aggiornamento pagine). */
export const LEGAL_DOCUMENT_VERSION = SHARED_LEGAL_DOCUMENT_VERSION;

/** Versione pubblicata del DPA Art. 28 per saloni partner. */
export const LEGAL_DPA_DOCUMENT_VERSION = SHARED_LEGAL_DPA_DOCUMENT_VERSION;

function trimEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Ragione sociale / denominazione commerciale (valorizzare via env prima del go-live). */
export const companyName =
  trimEnv(import.meta.env.VITE_COMPANY_NAME) || trimEnv(import.meta.env.VITE_LEGAL_ENTITY_NAME) || "Saloni Luxury";

export const companyLegalName =
  trimEnv(import.meta.env.VITE_COMPANY_LEGAL_NAME) ||
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_LEGAL_NAME) ||
  companyName;

export const companyAddress =
  trimEnv(import.meta.env.VITE_COMPANY_ADDRESS) ||
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_ADDRESS) ||
  `Sede legale comunicata su richiesta a ${LEGAL_PRIVACY_EMAIL}.`;

export const companyVat =
  trimEnv(import.meta.env.VITE_COMPANY_VAT) || trimEnv(import.meta.env.VITE_LEGAL_ENTITY_VAT) || "";

export const companyEmail =
  trimEnv(import.meta.env.VITE_COMPANY_EMAIL) ||
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_DPO_EMAIL) ||
  LEGAL_PRIVACY_EMAIL;

/** Alias storici usati nei documenti legali esistenti. */
export const legalEntityName = companyName;
export const legalEntityLegalName = companyLegalName;
export const legalEntityAddress = companyAddress;
export const legalEntityVat = companyVat;
export const legalEntityDpoEmail = companyEmail;

export function legalEntitySummaryParagraph(): string {
  const parts = [
    `${companyLegalName} (di seguito «${companyName}»)`,
    companyAddress,
    companyVat ? `P.IVA ${companyVat}` : null,
    `contatti privacy: ${companyEmail}`,
    companyEmail !== LEGAL_PRIVACY_EMAIL ? `referente privacy: ${companyEmail}` : null,
  ].filter(Boolean);
  return parts.join(" — ");
}
