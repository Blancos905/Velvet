import type { SalonBillingProfilePayload } from "../api/billing";

export function validateSalonBillingProfileForm(input: {
  legalName: string;
  billingEmail: string;
  vatNumber: string;
  fiscalCode: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  sdiCode: string;
  pecEmail: string;
}): string | null {
  const t = (v: string) => v.trim();
  if (!t(input.legalName)) return "Indica la ragione sociale o l'intestazione per la fattura.";
  if (!t(input.billingEmail)) return "Indica l'email per l'invio delle fatture.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(input.billingEmail))) return "Email di fatturazione non valida.";
  const vat = normalizeItalianVat(input.vatNumber);
  const fiscal = t(input.fiscalCode).toUpperCase();
  if (!vat && !fiscal) return "Indica la Partita IVA o il codice fiscale.";
  if (vat && !/^\d{11}$/.test(vat)) return "Partita IVA italiana non valida: usa 11 cifre.";
  if (fiscal && !/^(\d{11}|[A-Z0-9]{16})$/.test(fiscal)) return "Codice fiscale non valido.";
  if (!t(input.addressLine1)) return "Indica l'indirizzo di fatturazione.";
  if (!t(input.postalCode)) return "Indica il CAP di fatturazione.";
  if (!t(input.city)) return "Indica la città di fatturazione.";
  if (!t(input.province)) return "Indica la provincia (sigla, es. MI).";
  const country = (t(input.country) || "IT").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return "Paese non valido: usa il codice ISO a 2 lettere (es. IT).";
  if (country === "IT") {
    const sdi = t(input.sdiCode).toUpperCase();
    const pec = t(input.pecEmail);
    if (!sdi && !pec) {
      return "Per la fatturazione elettronica in Italia indica il codice destinatario SDI oppure la PEC.";
    }
    if (sdi && !/^[A-Z0-9]{7}$/.test(sdi)) return "Codice SDI non valido: usa 7 caratteri alfanumerici.";
    if (pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec)) return "Indirizzo PEC non valido.";
  }
  return null;
}

export function toBillingProfilePayload(input: {
  legalName: string;
  billingEmail: string;
  vatNumber: string;
  fiscalCode: string;
  subjectType: "" | "COMPANY" | "INDIVIDUAL";
  addressLine1: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  sdiCode: string;
  pecEmail: string;
}): SalonBillingProfilePayload {
  const payload: SalonBillingProfilePayload = {
    legalName: input.legalName.trim(),
    billingEmail: input.billingEmail.trim().toLowerCase(),
    addressLine1: input.addressLine1.trim(),
    postalCode: input.postalCode.trim(),
    city: input.city.trim(),
    province: input.province.trim().toUpperCase(),
    country: (input.country.trim() || "IT").toUpperCase(),
  };
  const vat = normalizeItalianVat(input.vatNumber);
  const fiscal = input.fiscalCode.trim().toUpperCase();
  const sdi = input.sdiCode.trim().toUpperCase();
  const pec = input.pecEmail.trim().toLowerCase();
  if (vat) payload.vatNumber = vat;
  if (fiscal) payload.fiscalCode = fiscal;
  if (input.subjectType) payload.subjectType = input.subjectType;
  if (sdi) payload.sdiCode = sdi;
  if (pec) payload.pecEmail = pec;
  return payload;
}

function normalizeItalianVat(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s.startsWith("IT")) s = s.slice(2);
  return s;
}
