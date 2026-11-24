export type EmailVerificationConfirmResponse = {
  message: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  nextPath?: string | null;
  premiumCheckoutToken?: string | null;
};

export type RegistrationEmailVerificationAudience = "client" | "salon";

/** Query `audience=` dal link email ha priorità; altrimenti inferisce dal piano salone. */
export function resolveRegistrationEmailVerificationAudience(
  audienceParam: string | null | undefined,
  hasSalonPlanContext: boolean,
): RegistrationEmailVerificationAudience {
  const raw = audienceParam?.trim().toLowerCase();
  if (raw === "client") return "client";
  if (raw === "salon") return "salon";
  return hasSalonPlanContext ? "salon" : "client";
}

export function successLeadFromApiMessage(message: string): string {
  const trimmed = message.trim();
  const withoutPrefix = trimmed.replace(/^email confermata\.?\s*/i, "").trim();
  return withoutPrefix || "Ora puoi accedere con le tue credenziali.";
}

export function normalizeTokenFromUrl(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function isValidEmailVerificationToken(token: string): boolean {
  return token.length === 64 && /^[a-f0-9]+$/i.test(token);
}

const EMAIL_CONFIRM_RESULT_PREFIX = "luxury_email_confirm_ok:";
const EMAIL_CONFIRM_SESSION_PREFIX = "luxury_email_confirm_session:";

export function readCachedConfirmMessage(token: string): string | null {
  if (typeof sessionStorage === "undefined" || !token) return null;
  const cached = sessionStorage.getItem(`${EMAIL_CONFIRM_RESULT_PREFIX}${token}`);
  return cached && cached.trim() ? cached.trim() : null;
}

export function cacheConfirmMessage(token: string, message: string): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.setItem(`${EMAIL_CONFIRM_RESULT_PREFIX}${token}`, message.trim());
}

export function cacheConfirmSession(token: string, body: EmailVerificationConfirmResponse): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.setItem(
    `${EMAIL_CONFIRM_SESSION_PREFIX}${token}`,
    JSON.stringify({
      message: body.message,
      accessToken: body.accessToken ?? null,
      refreshToken: body.refreshToken ?? null,
      nextPath: body.nextPath ?? null,
      premiumCheckoutToken: body.premiumCheckoutToken ?? null,
    }),
  );
}

export function readCachedConfirmSession(token: string): EmailVerificationConfirmResponse | null {
  if (typeof sessionStorage === "undefined" || !token) return null;
  const raw = sessionStorage.getItem(`${EMAIL_CONFIRM_SESSION_PREFIX}${token}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmailVerificationConfirmResponse;
    return parsed && typeof parsed.message === "string" ? parsed : null;
  } catch {
    return null;
  }
}

const EMAIL_CONFIRM_ATTEMPT_PREFIX = "luxury_email_confirm_attempt:";
/** Richieste confirm in corso (stesso tab; sopravvive al remount StrictMode). */
const confirmInFlightTokens = new Set<string>();

export function hasCachedEmailConfirmOutcome(token: string): boolean {
  return Boolean(readCachedConfirmSession(token) || readCachedConfirmMessage(token));
}

/** Rimuove marker legacy che bloccava il retry dopo refresh o doppio mount StrictMode. */
export function clearStaleEmailConfirmAttemptMarker(token: string): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  if (hasCachedEmailConfirmOutcome(token)) return;
  sessionStorage.removeItem(`${EMAIL_CONFIRM_ATTEMPT_PREFIX}${token}`);
}

/** True se questa istanza può avviare POST /email-verification/confirm. */
export function acquireEmailConfirmAttempt(token: string): boolean {
  if (!token) return false;
  clearStaleEmailConfirmAttemptMarker(token);
  if (confirmInFlightTokens.has(token)) return false;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(`${EMAIL_CONFIRM_ATTEMPT_PREFIX}${token}`)) {
    if (!hasCachedEmailConfirmOutcome(token)) {
      sessionStorage.removeItem(`${EMAIL_CONFIRM_ATTEMPT_PREFIX}${token}`);
    }
  }
  confirmInFlightTokens.add(token);
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(`${EMAIL_CONFIRM_ATTEMPT_PREFIX}${token}`, "1");
  }
  return true;
}

export function releaseEmailConfirmAttempt(token: string): void {
  if (token) confirmInFlightTokens.delete(token);
}

/** Messaggio ok in cache senza sessione completa (stato corrotto / retry interrotto). */
export function hasOrphanEmailConfirmMessageCache(token: string): boolean {
  return Boolean(readCachedConfirmMessage(token) && !readCachedConfirmSession(token));
}

export function clearEmailConfirmCaches(token: string): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.removeItem(`${EMAIL_CONFIRM_RESULT_PREFIX}${token}`);
  sessionStorage.removeItem(`${EMAIL_CONFIRM_SESSION_PREFIX}${token}`);
  sessionStorage.removeItem(`${EMAIL_CONFIRM_ATTEMPT_PREFIX}${token}`);
  releaseEmailConfirmAttempt(token);
}

/** @deprecated Usare {@link acquireEmailConfirmAttempt}. */
export function markConfirmAttempted(token: string): boolean {
  return confirmInFlightTokens.has(token);
}

export function isTokenAlreadyUsedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("non valido") ||
    lower.includes("scaduto") ||
    lower.includes("email_verification_token_invalid")
  );
}

export const CLIENT_POST_EMAIL_CONFIRM_PATH = "/";

import { clearEmailVerifiedCrossTab } from "./emailVerificationCrossTab";

const PENDING_EMAIL_VERIFY_KEY = "luxury_pending_email_verify";
const PENDING_EMAIL_VERIFY_AT_KEY = "luxury_pending_email_verify_at";
const REGISTRATION_POLL_SECRET_KEY = "luxury_registration_poll_secret";

export function rememberRegistrationPollSecret(email: string, secret: string | null | undefined): void {
  const norm = email.trim().toLowerCase();
  const value = secret?.trim().toLowerCase() ?? "";
  if (!norm || !/^[a-f0-9]{64}$/.test(value)) return;
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(REGISTRATION_POLL_SECRET_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[norm] = value;
    sessionStorage.setItem(REGISTRATION_POLL_SECRET_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function readRegistrationPollSecret(email: string): string | undefined {
  const norm = email.trim().toLowerCase();
  if (!norm || typeof sessionStorage === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(REGISTRATION_POLL_SECRET_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, string>;
    const value = map[norm];
    return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function persistPendingEmailVerification(email: string): number {
  const norm = email.trim().toLowerCase();
  const at = Date.now();
  if (!norm) return at;
  try {
    localStorage.setItem(PENDING_EMAIL_VERIFY_KEY, norm);
    localStorage.setItem(PENDING_EMAIL_VERIFY_AT_KEY, String(at));
    clearEmailVerifiedCrossTab();
  } catch {
    /* ignore */
  }
  return at;
}

export function readPendingEmailVerification(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(PENDING_EMAIL_VERIFY_KEY)?.trim().toLowerCase() ?? "";
}

export function readPendingEmailVerificationAt(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(PENDING_EMAIL_VERIFY_AT_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clearPendingEmailVerification(): void {
  try {
    localStorage.removeItem(PENDING_EMAIL_VERIFY_KEY);
    localStorage.removeItem(PENDING_EMAIL_VERIFY_AT_KEY);
  } catch {
    /* ignore */
  }
}

/** Registrazione in attesa di conferma email (persistita per sync app WebView). */
export function hasPendingEmailVerification(): boolean {
  const email = readPendingEmailVerification();
  const at = readPendingEmailVerificationAt();
  return Boolean(email && at > 0);
}

const CLIENT_SIGNUP_AWAITING_KEY = "luxury_client_signup_awaiting";

export type ClientSignupAwaiting = {
  email: string;
  at: number;
};

/** Solo la registrazione cliente su `/registrati`: sopravvive al reload finché non si torna alla home. */
export function markClientSignupAwaiting(email: string, at: number): void {
  const norm = email.trim().toLowerCase();
  if (!norm || !Number.isFinite(at) || at <= 0) return;
  try {
    localStorage.setItem(CLIENT_SIGNUP_AWAITING_KEY, JSON.stringify({ email: norm, at }));
  } catch {
    /* ignore */
  }
}

export function readClientSignupAwaiting(): ClientSignupAwaiting | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLIENT_SIGNUP_AWAITING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: unknown; at?: unknown };
    const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
    const at = typeof parsed.at === "number" ? parsed.at : Number(parsed.at);
    if (!email || !Number.isFinite(at) || at <= 0) return null;
    return { email, at };
  } catch {
    return null;
  }
}

export function clearClientSignupAwaiting(): void {
  try {
    localStorage.removeItem(CLIENT_SIGNUP_AWAITING_KEY);
  } catch {
    /* ignore */
  }
}

export type ClientSignupReloadView = "form" | "check-email" | "thank-you";

/** Reload su «Controlla email» o sul ringraziamento: non si torna al modulo. */
export function resolveClientSignupReloadView(input: {
  awaiting: ClientSignupAwaiting | null;
  verified: { email: string; audience: string; registrationAt: number } | null;
}): ClientSignupReloadView {
  const awaiting = input.awaiting;
  if (!awaiting) return "form";
  const verified = input.verified;
  if (
    verified &&
    verified.audience === "client" &&
    verified.email.trim().toLowerCase() === awaiting.email &&
    verified.registrationAt === awaiting.at
  ) {
    return "thank-you";
  }
  return "check-email";
}

/**
 * Flag di sessione: post-submit Free/Premium su `/piani` fino a Continua dopo ringraziamento.
 * Evita che il redirect «salone già attivo → hub» smonti celebration / thank-you.
 */
const SALON_REG_POST_SIGNUP_ACTIVE_KEY = "luxury_salon_reg_post_signup_active";

export function markSalonRegistrationPostSignupActive(): void {
  try {
    sessionStorage.setItem(SALON_REG_POST_SIGNUP_ACTIVE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearSalonRegistrationPostSignupActive(): void {
  try {
    sessionStorage.removeItem(SALON_REG_POST_SIGNUP_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function isSalonRegistrationPostSignupActive(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(SALON_REG_POST_SIGNUP_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Su `/piani`, «Controlla la tua email» solo dopo l'invio della registrazione salone.
 * La conferma ancora aperta del cliente (stessa email, stesso browser) non sostituisce la scelta dei piani.
 */
export function shouldResumeSalonRegistrationEmailConfirm(input: {
  registrationComplete: boolean;
  salonPostSignupActive: boolean;
  nativeApp: boolean;
  pendingEmail: string;
  clientAwaitingEmail: string;
}): boolean {
  if (input.registrationComplete) return true;
  const pending = input.pendingEmail.trim().toLowerCase();
  const clientAwaiting = input.clientAwaitingEmail.trim().toLowerCase();
  const pendingIsClientSignup = Boolean(clientAwaiting) && (!pending || pending === clientAwaiting);
  if (pendingIsClientSignup) return false;
  if (input.salonPostSignupActive && pending.length > 0) return true;
  if (input.nativeApp && pending.length > 0) return true;
  return false;
}

export function isClientRegistrationEmailConfirm(
  body: EmailVerificationConfirmResponse,
  planParam: string | null,
  parseSalonPlanTier: (raw: string | null | undefined) => string | undefined,
  readIntendedSalonPlan: () => string | undefined,
  audience?: RegistrationEmailVerificationAudience,
): boolean {
  if (body.premiumCheckoutToken?.trim()) return false;
  if (audience === "salon") return false;
  if (audience === "client") return true;
  if (parseSalonPlanTier(planParam)) return false;
  if (readIntendedSalonPlan()) return false;
  const next = body.nextPath?.trim();
  if (next === CLIENT_POST_EMAIL_CONFIRM_PATH) return true;
  if (next === "/account" && !body.accessToken?.trim()) return true;
  return false;
}
