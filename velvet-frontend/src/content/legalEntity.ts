import { LEGAL_PRIVACY_EMAIL } from "./legalReferences";
import { LEGAL_DOCUMENT_VERSION as SHARED_LEGAL_DOCUMENT_VERSION } from "./legalSharedCopy";

/** Versione pubblicata dei documenti legali (allineare a data/aggiornamento pagine). */
export const LEGAL_DOCUMENT_VERSION = SHARED_LEGAL_DOCUMENT_VERSION;

function trimEnv(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Valorizzare via env prima del go-live; altrimenti restano placeholder visibili. */
export const LEGAL_ENTITY_LEGAL_NAME_TODO =
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_LEGAL_NAME) || "[TODO_LEGAL: Inserire Ragione Sociale S.r.l. / Nome Ditta]";
export const LEGAL_ENTITY_ADDRESS_TODO =
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_ADDRESS) || "[TODO_LEGAL: Indirizzo Completo]";
export const LEGAL_ENTITY_VAT_TODO =
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_VAT) || "[TODO_LEGAL: Numero P.IVA]";

export const legalEntityName = trimEnv(import.meta.env.VITE_LEGAL_ENTITY_NAME) || "Saloni Luxury";
export const legalEntityLegalName = trimEnv(import.meta.env.VITE_LEGAL_ENTITY_LEGAL_NAME) || legalEntityName;
export const legalEntityAddress =
  trimEnv(import.meta.env.VITE_LEGAL_ENTITY_ADDRESS) ||
  "Sede legale comunicata su richiesta a " + LEGAL_PRIVACY_EMAIL + ".";
export const legalEntityVat = trimEnv(import.meta.env.VITE_LEGAL_ENTITY_VAT);
export const legalEntityDpoEmail = trimEnv(import.meta.env.VITE_LEGAL_ENTITY_DPO_EMAIL) || LEGAL_PRIVACY_EMAIL;

export function legalEntitySummaryParagraph(): string {
  const parts = [
    `${legalEntityLegalName} (di seguito «${legalEntityName}»)`,
    legalEntityAddress,
    legalEntityVat ? `P.IVA ${legalEntityVat}` : null,
    `contatti privacy: ${LEGAL_PRIVACY_EMAIL}`,
    legalEntityDpoEmail !== LEGAL_PRIVACY_EMAIL ? `referente privacy: ${legalEntityDpoEmail}` : null,
  ].filter(Boolean);
  return parts.join(" — ");
}
