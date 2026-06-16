import { apiUrl } from "../config/env";
import { LEGAL_DOCUMENT_VERSION } from "../content/legalEntity";
import { httpApiErrorMessage } from "./httpApiErrorMessage";

export type ClientRegistrationPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** ISO 3166-1 alpha-2 (es. IT, FR). */
  country: string;
  phone?: string;
  /** Solo prima installazione: vedi backend `VelvetAccountRegistrationService`. */
  bootstrapSuperAdmin?: boolean;
};

/**
 * Registrazione **cliente** (consumatore) via `POST /api/v1/public/client-registration` (backend Velvet).
 */
export async function registerClientApi(payload: ClientRegistrationPayload): Promise<void> {
  const body: Record<string, unknown> = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    country: payload.country.trim().toUpperCase(),
    acceptedTermsAndPrivacy: true,
    legalDocumentVersion: LEGAL_DOCUMENT_VERSION,
  };
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

  if (res.ok) return;

  const msg = await httpApiErrorMessage(res, "Registrazione non riuscita");
  throw new Error(msg);
}
