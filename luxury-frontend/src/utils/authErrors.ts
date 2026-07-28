function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
    const ts = (err as { toString?: () => string }).toString;
    if (typeof ts === "function") {
      const s = ts.call(err);
      if (typeof s === "string" && s !== "[object Object]") return s;
    }
  }
  return String(err);
}

/** Messaggi più chiari quando il browser non raggiunge l’API (backend spento, proxy Vite, rete). */
export function humanizeAuthNetworkError(err: unknown): string {
  const raw = errorMessage(err);
  const t = raw.toLowerCase();
  const isNetwork =
    t.includes("load failed") ||
    t.includes("failed to fetch") ||
    t.includes("networkerror") ||
    t.includes("network request failed") ||
    t === "typeerror: failed to fetch";

  if (!isNetwork) {
    return raw;
  }

  return [
    "Il browser non riesce a contattare l’API Luxury.",
    "1) Avvia Spring Boot sulla porta attesa dal proxy (in dev: `http://127.0.0.1:8080`, vedi `vite.config.ts` → proxy `/api`).",
    "2) Se usi un dominio diverso da quello del backend, imposta `VITE_API_BASE_URL` coerente con l’origine del browser.",
  ].join(" ");
}

function authTokenErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const o = err as { name?: unknown; error?: unknown };
  if (o.name === "ErrorResponse" && typeof o.error === "string") {
    return o.error.toLowerCase();
  }
  return null;
}

const LOGIN_HELP = [
  "Email o password non riconosciute, oppure l’account non è ancora attivo.",
  "Se ti sei appena registrato, riprova con la stessa password; in caso di errore ripetuto controlla che il backend sia raggiungibile.",
].join(" ");

/** Dopo login o registrazione: credenziali errate, risposte API non OK, errori di rete. */
export function humanizePostRegistrationAuthError(err: unknown): string {
  const code = authTokenErrorCode(err);
  if (code === "invalid_grant" || code === "unauthorized_client" || code === "invalid_client") {
    return LOGIN_HELP;
  }

  const raw = errorMessage(err);
  const t = raw.toLowerCase();
  if (
    t.includes("conferma l'indirizzo email") ||
    t.includes("email_not_verified") ||
    t.includes("non ancora verificato")
  ) {
    return raw;
  }
  if (
    t.includes("invalid_grant") ||
    t.includes("unauthorized_client") ||
    t.includes("invalid_client") ||
    t.includes("invalid user credentials") ||
    t.includes("401") ||
    t.includes("unauthorized") ||
    t.includes("bad credentials") ||
    t.includes("credenziali")
  ) {
    return LOGIN_HELP;
  }
  return humanizeAuthNetworkError(err);
}
