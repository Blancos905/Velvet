import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import { fetchBillingStatus, startPremiumCheckout } from "../api/billing";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { VELVET_ACCESS_TOKEN_KEY } from "../auth/adminSession";
import { refreshVelvetAccessToken, writeStoredRefreshToken } from "../auth/velvetRefreshSession";
import {
  VelvetEmailVerificationPendingBox,
  VelvetEmailVerifiedSuccessBox,
} from "../components/VelvetEmailVerifiedSuccessBox";
import { VelvetPremiumCheckoutPromptModal } from "../components/VelvetPremiumCheckoutPromptModal";
import { parseSalonPlanTier } from "../data/salonPlans";
import {
  loginReturnPathForSalonRegistration,
  PREMIUM_SALON_POST_LOGIN_PATH,
  readIntendedSalonPlanFromSession,
  setPostLoginPathForSalonRegistration,
} from "../lib/salonRegistrationPostLogin";
import { isSalonPremiumCheckoutRequired, SALON_OWNER_HOME_PATH } from "../lib/salonPremiumCheckoutPolicy";
import { isNativePremiumBillingBlocked } from "../lib/nativePremiumUpgradePolicy";
import { useSalonPremiumCheckoutPolicyQuery } from "../hooks/useSalonPremiumCheckoutPolicy";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";

type EmailVerificationConfirmResponse = {
  message: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  nextPath?: string | null;
};

type EmailVerificationResendResponse = {
  message: string;
};

function successLeadFromApiMessage(message: string): string {
  const trimmed = message.trim();
  const withoutPrefix = trimmed.replace(/^email confermata\.?\s*/i, "").trim();
  return withoutPrefix || "Ora puoi accedere con le tue credenziali.";
}

function normalizeTokenFromUrl(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

const EMAIL_CONFIRM_RESULT_PREFIX = "velvet_email_confirm_ok:";
const EMAIL_CONFIRM_SESSION_PREFIX = "velvet_email_confirm_session:";

function readCachedConfirmMessage(token: string): string | null {
  if (typeof sessionStorage === "undefined" || !token) return null;
  const cached = sessionStorage.getItem(`${EMAIL_CONFIRM_RESULT_PREFIX}${token}`);
  return cached && cached.trim() ? cached.trim() : null;
}

function cacheConfirmMessage(token: string, message: string): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.setItem(`${EMAIL_CONFIRM_RESULT_PREFIX}${token}`, message.trim());
}

function cacheConfirmSession(token: string, body: EmailVerificationConfirmResponse): void {
  if (typeof sessionStorage === "undefined" || !token) return;
  sessionStorage.setItem(
    `${EMAIL_CONFIRM_SESSION_PREFIX}${token}`,
    JSON.stringify({
      message: body.message,
      accessToken: body.accessToken ?? null,
      refreshToken: body.refreshToken ?? null,
      nextPath: body.nextPath ?? null,
    }),
  );
}

function readCachedConfirmSession(token: string): EmailVerificationConfirmResponse | null {
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

function markConfirmAttempted(token: string): boolean {
  if (typeof sessionStorage === "undefined" || !token) return false;
  const key = `velvet_email_confirm_attempt:${token}`;
  if (sessionStorage.getItem(key)) return true;
  sessionStorage.setItem(key, "1");
  return false;
}

function isTokenAlreadyUsedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("non valido") ||
    lower.includes("scaduto") ||
    lower.includes("email_verification_token_invalid")
  );
}

function resolvePostConfirmNextPath(
  body: EmailVerificationConfirmResponse,
  premiumCheckoutRequired: boolean,
): string {
  return body.nextPath?.trim() || loginReturnPathForSalonRegistration(readIntendedSalonPlanFromSession(), premiumCheckoutRequired);
}

function isPremiumCheckoutPostConfirmPath(path: string): boolean {
  return path === PREMIUM_SALON_POST_LOGIN_PATH;
}

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, signInWithIssuedToken } = useVelvetAuth();
  const [searchParams] = useSearchParams();
  const formId = useId();

  const tokenParam = searchParams.get("token");
  const tokenFromUrl = useMemo(() => normalizeTokenFromUrl(tokenParam), [tokenParam]);
  const planParam = searchParams.get("plan");
  const intentConfirm = searchParams.has("token");
  const hasValidTokenFormat = tokenFromUrl.length === 64 && /^[a-f0-9]+$/i.test(tokenFromUrl);
  const mode: "confirm" | "invalid-token" | "resend" = intentConfirm
    ? hasValidTokenFormat
      ? "confirm"
      : "invalid-token"
    : "resend";

  const cachedSessionOnMount = hasValidTokenFormat ? readCachedConfirmSession(tokenFromUrl) : null;

  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(() =>
    hasValidTokenFormat ? readCachedConfirmMessage(tokenFromUrl) ?? cachedSessionOnMount?.message ?? null : null,
  );
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [redirectingAfterConfirm, setRedirectingAfterConfirm] = useState(false);
  const [showPremiumCheckoutModal, setShowPremiumCheckoutModal] = useState(false);
  const [checkoutRedirectBusy, setCheckoutRedirectBusy] = useState(false);
  const [premiumCheckoutError, setPremiumCheckoutError] = useState<string | null>(null);
  const issuedAccessTokenRef = useRef<string | null>(null);
  const [confirmedNextPath, setConfirmedNextPath] = useState<string | null>(() =>
    cachedSessionOnMount?.nextPath?.trim() ? cachedSessionOnMount.nextPath.trim() : null,
  );

  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);

  const sessionCompletionRef = useRef(false);

  const completePostConfirmSession = async (
    body: EmailVerificationConfirmResponse,
  ): Promise<"redirected" | "premium_modal" | "failed"> => {
    const nextPath = resolvePostConfirmNextPath(body, premiumCheckoutRequired);
    setConfirmedNextPath(nextPath);
    setPostLoginReturnPath(nextPath);

    let accessToken = body.accessToken?.trim() ?? "";
    if (!accessToken) {
      accessToken = (await refreshVelvetAccessToken())?.trim() ?? "";
    }
    if (!accessToken) {
      return "failed";
    }

    sessionCompletionRef.current = true;
    if (body.refreshToken?.trim()) {
      writeStoredRefreshToken(body.refreshToken.trim());
    }
    await signInWithIssuedToken(accessToken);
    issuedAccessTokenRef.current = accessToken;

    if (isPremiumCheckoutPostConfirmPath(nextPath)) {
      if (isNativePremiumBillingBlocked()) {
        setRedirectingAfterConfirm(true);
        window.location.assign(SALON_OWNER_HOME_PATH);
        return "redirected";
      }
      const billingStatus = await fetchBillingStatus(accessToken);
      if (!billingStatus.configured) {
        setRedirectingAfterConfirm(true);
        window.location.assign(SALON_OWNER_HOME_PATH);
        return "redirected";
      }
      setShowPremiumCheckoutModal(true);
      return "premium_modal";
    }

    setRedirectingAfterConfirm(true);
    window.location.assign(nextPath);
    return "redirected";
  };

  const goToPremiumCheckout = () => {
    const token =
      issuedAccessTokenRef.current?.trim() ||
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(VELVET_ACCESS_TOKEN_KEY)?.trim() : "") ||
      "";
    if (!token) {
      setPremiumCheckoutError("Sessione non disponibile. Ricarica la pagina o accedi con email e password.");
      return;
    }
    setCheckoutRedirectBusy(true);
    setPremiumCheckoutError(null);
    setPostLoginReturnPath(PREMIUM_SALON_POST_LOGIN_PATH);
    void startPremiumCheckout(token).catch((err: unknown) => {
      setCheckoutRedirectBusy(false);
      setPremiumCheckoutError(
        err instanceof Error ? err.message : "Impossibile aprire il pagamento Stripe.",
      );
    });
  };

  const emailParam = searchParams.get("email");
  useEffect(() => {
    if (emailParam && emailParam.trim()) {
      setEmail((e) => (e.trim() ? e : emailParam.trim().toLowerCase()));
    }
  }, [emailParam]);

  useEffect(() => {
    const plan = parseSalonPlanTier(planParam);
    if (plan) {
      setPostLoginPathForSalonRegistration(plan, premiumCheckoutRequired);
    }
  }, [planParam, premiumCheckoutRequired]);

  const resendM = useMutation({
    mutationFn: async () => {
      const body = await apiJson<EmailVerificationResendResponse>("/api/v1/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return body.message;
    },
    onSuccess: (m) => {
      setResendErr(null);
      setResendMsg(m);
    },
    onError: (e: Error) => {
      setResendMsg(null);
      setResendErr(e.message);
    },
  });

  const confirmM = useMutation({
    mutationFn: async () => {
      return apiJson<EmailVerificationConfirmResponse>("/api/v1/auth/email-verification/confirm", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ token: tokenFromUrl.toLowerCase() }),
      });
    },
    onSuccess: (body) => {
      setConfirmErr(null);
      setConfirmMsg(body.message);
      if (tokenFromUrl) {
        cacheConfirmMessage(tokenFromUrl, body.message);
        cacheConfirmSession(tokenFromUrl, body);
      }
      void completePostConfirmSession(body).then((result) => {
        if (result === "failed") {
          setRedirectingAfterConfirm(false);
        }
      });
    },
    onError: (e: Error) => {
      setConfirmMsg(null);
      setConfirmErr(e.message);
    },
  });

  const confirmAttempted = useRef(false);
  const resumeAttemptedRef = useRef(false);
  const intendedSalonPlan = readIntendedSalonPlanFromSession();
  const postVerifyLoginPath = confirmedNextPath ?? loginReturnPathForSalonRegistration(intendedSalonPlan);

  useEffect(() => {
    if (intendedSalonPlan) {
      setPostLoginPathForSalonRegistration(intendedSalonPlan);
    }
  }, [intendedSalonPlan]);

  useEffect(() => {
    if (mode !== "confirm" || !hasValidTokenFormat || isAuthenticated || sessionCompletionRef.current) {
      return;
    }
    if (resumeAttemptedRef.current) {
      return;
    }

    const cachedSession = readCachedConfirmSession(tokenFromUrl);
    if (cachedSession?.accessToken?.trim()) {
      resumeAttemptedRef.current = true;
      if (cachedSession.message) {
        setConfirmMsg(cachedSession.message);
      }
      void completePostConfirmSession(cachedSession);
      return;
    }

    if (confirmMsg && !confirmErr) {
      resumeAttemptedRef.current = true;
      void (async () => {
        const refreshed = await refreshVelvetAccessToken();
        if (refreshed?.trim()) {
          await completePostConfirmSession({
            message: confirmMsg,
            accessToken: refreshed,
            nextPath: confirmedNextPath,
          });
        }
      })();
      return;
    }

    if (confirmMsg || confirmErr) {
      return;
    }
    if (confirmAttempted.current || markConfirmAttempted(tokenFromUrl)) {
      return;
    }
    confirmAttempted.current = true;
    confirmM.mutate();
  }, [
    mode,
    hasValidTokenFormat,
    confirmMsg,
    confirmErr,
    tokenFromUrl,
    confirmM,
    isAuthenticated,
    confirmedNextPath,
  ]);

  return (
    <main className="luxury-auth-page">
      <VelvetPremiumCheckoutPromptModal
        open={showPremiumCheckoutModal && premiumCheckoutRequired && !isNativePremiumBillingBlocked()}
        busy={checkoutRedirectBusy}
        error={premiumCheckoutError}
        onContinue={goToPremiumCheckout}
      />
      <div className="luxury-auth-card">
        <div className="luxury-auth-card-toolbar">
          <button type="button" className="luxury-auth-back" aria-label="Torna indietro" onClick={() => navigate(-1)}>
            <svg className="luxury-auth-back-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Indietro</span>
          </button>
        </div>

        {mode === "invalid-token" ? (
          <>
            <h1 className="luxury-auth-title">Link non valido</h1>
            <p className="luxury-auth-lead">
              Il link è incompleto, scaduto o già utilizzato. Richiedi un nuovo invio dall&apos;email di registrazione.
            </p>
            <p className="luxury-auth-lead">
              <Link className="luxury-link-inline" to="/conferma-email">
                Richiedi di nuovo il link
              </Link>{" "}
              ·{" "}
              <Link className="luxury-link-inline" to="/account">
                Torna all&apos;accesso
              </Link>
            </p>
          </>
        ) : mode === "confirm" ? (
          <>
            {confirmErr ? (
              <>
                <h1 className="luxury-auth-title">Conferma email</h1>
                <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
                  {confirmErr}
                </p>
                {isTokenAlreadyUsedError(confirmErr) ? (
                  <p className="luxury-auth-lead">
                    Se hai già cliccato il link in passato, l&apos;account potrebbe essere già attivo: prova ad{" "}
                    <Link className="luxury-link-inline" to={postVerifyLoginPath}>
                      accedere con email e password
                    </Link>
                    .
                  </p>
                ) : null}
                <p className="luxury-auth-lead">
                  <Link className="luxury-link-inline" to="/conferma-email">
                    Richiedi un nuovo link
                  </Link>{" "}
                  ·{" "}
                  <Link className="luxury-link-inline" to="/account">
                    Torna all&apos;accesso
                  </Link>
                </p>
              </>
            ) : confirmMsg ? (
              redirectingAfterConfirm ? (
                <VelvetEmailVerificationPendingBox />
              ) : showPremiumCheckoutModal && !isNativePremiumBillingBlocked() ? (
                <p className="luxury-auth-lead" style={{ marginTop: "0.5rem", textAlign: "center" }}>
                  Email confermata. Completa il pagamento nel riquadro qui sopra.
                </p>
              ) : (
                <VelvetEmailVerifiedSuccessBox
                  message={successLeadFromApiMessage(confirmMsg)}
                  loginReturnPath={postVerifyLoginPath}
                />
              )
            ) : (
              <VelvetEmailVerificationPendingBox />
            )}
          </>
        ) : (
          <>
            <h1 className="luxury-auth-title">Conferma email</h1>
            <p className="luxury-auth-lead">
              Inserisci l&apos;email usata in registrazione: se l&apos;account è in attesa di conferma, riceverai un nuovo
              messaggio con il link di attivazione.
            </p>
            {resendErr ? (
              <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
                {resendErr}
              </p>
            ) : null}
            {resendMsg ? (
              <p className="luxury-alert luxury-alert--success luxury-auth-alert" role="status">
                {resendMsg}
              </p>
            ) : null}
            <form
              className="luxury-auth-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setResendErr(null);
                setResendMsg(null);
                const u = email.trim().toLowerCase();
                if (!u) {
                  setResendErr("Inserisci un indirizzo email.");
                  return;
                }
                resendM.mutate();
              }}
            >
              <div className="luxury-auth-field">
                <label htmlFor={`${formId}-email`} className="luxury-auth-label">
                  Email
                </label>
                <input
                  id={`${formId}-email`}
                  className="luxury-auth-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  disabled={resendM.isPending}
                />
              </div>
              <button type="submit" className="luxury-auth-submit" disabled={resendM.isPending}>
                {resendM.isPending ? "Invio…" : "Reinvia email di conferma"}
              </button>
            </form>
            <p className="luxury-auth-lead" style={{ marginTop: "1rem" }}>
              <Link className="luxury-link-inline" to="/account">
                Torna all&apos;accesso
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
