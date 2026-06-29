import { apiUrl } from "../config/env";
import { LEGAL_DOCUMENT_VERSION } from "../content/legalEntity";
import { httpApiErrorMessage } from "./httpApiErrorMessage";
import type { SalonPlanTier } from "../data/salonPlans";
import type { SalonBillingProfilePayload } from "./billing";

export type ConsumerRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Nome pubblico del salone (directory / vetrina). */
  salonName: string;
  planTier: SalonPlanTier;
  /** Indirizzo sede per ricerca / vetrina — obbligatorio per BASE (doc Location §8.1). */
  salonAddressLine1?: string;
  salonPostalCode?: string;
  salonCity?: string;
  salonProvince?: string;
  salonCountry?: string;
  /** Codici tipologia (es. HAIR, BEAUTY); obbligatori per BASE/PREMIUM lato backend. */
  salonBusinessTypes?: string[];
  /** Pubblico di riferimento (MALE, FEMALE); obbligatorio per BASE/PREMIUM lato backend. */
  salonClientGenders?: string[];
  /** Dati fatturazione — obbligatori per PREMIUM. */
  billing?: SalonBillingProfilePayload;
};

export type RegistrationCreatedResponse = {
  message: string;
  emailVerificationRequired?: boolean;
};

/**
 * Registrazione salone via backend pubblico — ruolo applicativo **OWNER**, non **CLIENT**.
 */
export async function registerConsumerApi(payload: ConsumerRegistrationPayload): Promise<RegistrationCreatedResponse> {
  const body: Record<string, unknown> = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    salonName: payload.salonName.trim(),
    planTier: payload.planTier,
    acceptedTermsAndPrivacy: true,
    legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
  };
  const phone = payload.phone?.trim();
  if (phone) body.phone = phone;
  const add = (k: string, v: string | undefined) => {
    const t = v?.trim();
    if (t) body[k] = t;
  };
  add("salonAddressLine1", payload.salonAddressLine1);
  add("salonPostalCode", payload.salonPostalCode);
  add("salonCity", payload.salonCity);
  add("salonProvince", payload.salonProvince);
  add("salonCountry", payload.salonCountry);
  if (payload.salonBusinessTypes != null && payload.salonBusinessTypes.length > 0) {
    body.salonBusinessTypes = payload.salonBusinessTypes;
  }
  if (payload.salonClientGenders != null && payload.salonClientGenders.length > 0) {
    body.salonClientGenders = payload.salonClientGenders;
  }
  if (payload.billing) {
    const b = payload.billing;
    add("billingLegalName", b.legalName);
    add("billingEmail", b.billingEmail);
    add("billingVatNumber", b.vatNumber);
    add("billingFiscalCode", b.fiscalCode);
    add("billingSubjectType", b.subjectType);
    add("billingAddressLine1", b.addressLine1);
    add("billingPostalCode", b.postalCode);
    add("billingCity", b.city);
    add("billingProvince", b.province);
    add("billingCountry", b.country);
    add("billingSdiCode", b.sdiCode);
    add("billingPecEmail", b.pecEmail);
  }

  const controller = new AbortController();
  const timeoutMs = 45_000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/v1/public/consumer-registration"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
    if (name === "AbortError") {
      throw new Error(
        `Nessuna risposta dal backend entro ${timeoutMs / 1000}s. Controlla che Spring sia avviato e che il proxy Vite inoltri /api (porta 8080), oppure imposta VITE_API_BASE_URL.`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (res.ok) {
    try {
      const j = (await res.json()) as RegistrationCreatedResponse;
      if (typeof j.message === "string" && j.message.trim()) {
        return {
          message: j.message.trim(),
          emailVerificationRequired: j.emailVerificationRequired !== false,
        };
      }
    } catch {
      /* body opzionale */
    }
    return {
      message:
        "Abbiamo inviato un'email di conferma. Clicca il link per attivare l'account titolare, poi accedi.",
      emailVerificationRequired: true,
    };
  }

  const msg = await httpApiErrorMessage(res, "Registrazione non riuscita");
  throw new Error(msg);
}
