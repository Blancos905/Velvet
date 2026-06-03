import { createClient, type Base44Client } from "@base44/sdk";

/**
 * Client Base44 per app esterne (dashboard API docs: `appId` + header `api_key`).
 * Variabili: `VITE_BASE44_APP_ID`, `VITE_BASE44_API_KEY` (opz. `VITE_BASE44_SERVER_URL`, default produzione = https://base44.app).
 *
 * Le chiavi `VITE_*` sono incluse nel bundle: usale solo se il modello di sicurezza Base44 lo consente per il tuo progetto.
 */
let cached: Base44Client | null = null;

export function isBase44Configured(): boolean {
  const appId = (import.meta.env.VITE_BASE44_APP_ID ?? "").trim();
  const apiKey = (import.meta.env.VITE_BASE44_API_KEY ?? "").trim();
  return appId.length > 0 && apiKey.length > 0;
}

/** Istanza singleton; `null` se env non valorizzate. */
export function getBase44Client(): Base44Client | null {
  if (!isBase44Configured()) {
    return null;
  }
  if (cached) {
    return cached;
  }
  const serverUrl = (import.meta.env.VITE_BASE44_SERVER_URL ?? "").trim();
  cached = createClient({
    appId: (import.meta.env.VITE_BASE44_APP_ID ?? "").trim(),
    ...(serverUrl ? { serverUrl } : {}),
    headers: {
      api_key: (import.meta.env.VITE_BASE44_API_KEY ?? "").trim(),
    },
  });
  return cached;
}
