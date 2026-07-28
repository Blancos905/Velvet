import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiJson } from "../api/client";
import { LuxuryRegistrationEmailConfirmFlow } from "../components/LuxuryRegistrationEmailConfirmFlow";
import { LuxuryRegistrationEmailConfirmScreen } from "../components/LuxuryRegistrationEmailConfirmScreen";
import { parseSalonPlanTier } from "../data/salonPlans";
import { useSalonPremiumCheckoutPolicyQuery } from "../hooks/useSalonPremiumCheckoutPolicy";
import {
  loginReturnPathForSalonRegistration,
  readIntendedSalonPlanFromSession,
  setPostLoginPathForSalonRegistration,
} from "../lib/salonRegistrationPostLogin";
import { isSalonPremiumCheckoutRequired } from "../lib/salonPremiumCheckoutPolicy";
import {
  hasPendingEmailVerification,
  isValidEmailVerificationToken,
  normalizeTokenFromUrl,
  readPendingEmailVerification,
  readPendingEmailVerificationAt,
  resolveRegistrationEmailVerificationAudience,
  CLIENT_POST_EMAIL_CONFIRM_PATH,
} from "../lib/emailVerificationConfirmShared";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { normalizeNativeDevPageHost } from "../lib/nativeAppDevHost";

type EmailVerificationResendResponse = {
  message: string;
};

function goBackFromEmailVerification(navigate: ReturnType<typeof useNavigate>): void {
  if (isLuxuryNativeAppShell() && hasPendingEmailVerification()) {
    navigate("/piani", { replace: true });
    return;
  }
  navigate(-1);
}

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formId = useId();

  const tokenParam = searchParams.get("token");
  const tokenFromUrl = useMemo(() => normalizeTokenFromUrl(tokenParam), [tokenParam]);
  const planParam = searchParams.get("plan");
  const audienceParam = searchParams.get("audience");
  const emailParam = searchParams.get("email");
  const hasValidTokenFormat = isValidEmailVerificationToken(tokenFromUrl);
  const mode: "confirm" | "invalid-token" | "resend" = searchParams.has("token")
    ? hasValidTokenFormat
      ? "confirm"
      : "invalid-token"
    : "resend";

  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);

  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState("Conferma email");

  useEffect(() => {
    if (emailParam?.trim()) {
      setEmail((current) => (current.trim() ? current : emailParam.trim().toLowerCase()));
    }
  }, [emailParam]);

  useEffect(() => {
    normalizeNativeDevPageHost();
  }, []);

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
    onSuccess: (message) => {
      setResendErr(null);
      setResendMsg(message);
    },
    onError: (error: Error) => {
      setResendMsg(null);
      setResendErr(error.message);
    },
  });

  const resendEmailNorm = email.trim().toLowerCase();
  const showRegistrationEmailConfirmBox = mode === "resend" && resendEmailNorm.includes("@");

  if (showRegistrationEmailConfirmBox) {
    const salonPlan = parseSalonPlanTier(planParam);
    return (
      <LuxuryRegistrationEmailConfirmScreen
        backRow={
          <div className="luxury-search-back-row">
            <button type="button" className="luxury-search-back" aria-label="Torna indietro" onClick={() => goBackFromEmailVerification(navigate)}>
              <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Indietro
            </button>
          </div>
        }
        email={resendEmailNorm}
        accountLabel={salonPlan === "PREMIUM" ? "titolare salone" : "cliente"}
        loginReturnPath={loginReturnPathForSalonRegistration(salonPlan, premiumCheckoutRequired)}
        onEmailCorrected={(corrected) => setEmail(corrected)}
      />
    );
  }

  if (mode === "confirm" && hasValidTokenFormat) {
    const salonPlanFromParam = parseSalonPlanTier(planParam);
    const intendedSalonPlan =
      audienceParam?.trim().toLowerCase() === "client" ? undefined : readIntendedSalonPlanFromSession();
    const salonPlan = salonPlanFromParam ?? intendedSalonPlan;
    const audience = resolveRegistrationEmailVerificationAudience(audienceParam, Boolean(salonPlan));
    const displayEmail = emailParam?.trim().toLowerCase() || readPendingEmailVerification() || "";
    const accountLabel = audience === "salon" ? "titolare salone" : "cliente";
    const loginReturnPath =
      audience === "client"
        ? CLIENT_POST_EMAIL_CONFIRM_PATH
        : loginReturnPathForSalonRegistration(salonPlan, premiumCheckoutRequired);
    const confirmSurface = isLuxuryNativeAppShell() ? "registrationTab" : "emailLink";

    return (
      <LuxuryRegistrationEmailConfirmScreen
        heroTitle={heroTitle}
        backRow={
          <div className="luxury-search-back-row">
            <button type="button" className="luxury-search-back" aria-label="Torna indietro" onClick={() => goBackFromEmailVerification(navigate)}>
              <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Indietro
            </button>
          </div>
        }
        email={displayEmail}
        accountLabel={accountLabel}
        loginReturnPath={loginReturnPath}
        onEmailCorrected={setEmail}
        confirmContent={
          <LuxuryRegistrationEmailConfirmFlow
            email={displayEmail}
            accountLabel={accountLabel}
            loginReturnPath={loginReturnPath}
            onEmailCorrected={setEmail}
            tokenFromUrl={tokenFromUrl}
            planParam={planParam}
            audience={audience}
            registrationAt={readPendingEmailVerificationAt()}
            surface={confirmSurface}
            onHeroTitleChange={setHeroTitle}
          />
        }
      />
    );
  }

  return (
    <main className="luxury-auth-page">
      <div className="luxury-auth-card">
        <div className="luxury-auth-card-toolbar">
          <button type="button" className="luxury-auth-back" aria-label="Torna indietro" onClick={() => goBackFromEmailVerification(navigate)}>
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
              onSubmit={(event) => {
                event.preventDefault();
                setResendErr(null);
                setResendMsg(null);
                const normalized = email.trim().toLowerCase();
                if (!normalized) {
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
                  onChange={(event) => setEmail(event.target.value)}
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
