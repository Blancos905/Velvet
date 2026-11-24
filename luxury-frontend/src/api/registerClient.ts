import { apiUrl } from "../config/env";
import { LEGAL_DOCUMENT_VERSION } from "../content/legalEntity";
import { httpApiErrorMessage } from "./httpApiErrorMessage";
import { registrationApiHeaders } from "../lib/registrationApiHeaders";
import { rememberRegistrationPollSecret } from "../lib/emailVerificationConfirmShared";

export type ClientRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** ISO 3166-1 alpha-2 (es. IT, FR). */
  country: string;
  /** Lingua UI scelta in registrazione (`it`, `en`, …). */
  preferredLocale?: string;
  phone?: string;
  /** Solo prima installazione: vedi backend `LuxuryAccountRegistrationService`. */
  bootstrapSuperAdmin?: boolean;
};

export type RegistrationCreatedResponse = {
  message: string;
  pollSecret?: string | null;
};

/**
 * Registrazione **cliente** (consumatore) via `POST /api/v1/public/client-registration` (backend Luxury).
 */
export async function registerClientApi(payload: ClientRegistrationPayload): Promise<string> {
  const body: Record<string, unknown> = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    country: payload.country.trim().toUpperCase(),
    acceptedTermsAndPrivacy: true,
    legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
  };
  const preferredLocale = payload.preferredLocale?.trim().toLowerCase();
  if (preferredLocale) body.preferredLocale = preferredLocale;
  const phone = payload.phone?.trim();
  if (phone) body.phone = phone;
  if (payload.bootstrapSuperAdmin === true) {
    body.bootstrapSuperAdmin = true;
  }

  const controller = new AbortController();
  const timeoutMs = 45_000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/v1/public/client-registration"), {
      method: "POST",
      headers: registrationApiHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
    if (name === "AbortError") {
      throw new Error(
        `Nessuna risposta dal backend entro ${timeoutMs / 1000}s. Controlla che Spring sia avviato e che il proxy Vite inoltri /api (porta 8081), oppure imposta VITE_API_BASE_URL.`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (res.ok) {
    try {
      const j = (await res.json()) as RegistrationCreatedResponse;
      rememberRegistrationPollSecret(payload.email, j.pollSecret);
      if (typeof j.message === "string" && j.message.trim()) {
        return j.message.trim();
      }
    } catch {
      /* body opzionale */
    }
    return "Abbiamo inviato un'email di conferma. Clicca il link per attivare l'account, poi accedi.";
  }

  const msg = await httpApiErrorMessage(res, "Registrazione non riuscita");
  throw new Error(msg);
}
