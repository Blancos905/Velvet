import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LuxuryEuropeanContactFields } from "../components/LuxuryEuropeanContactFields";
import { LuxuryRegistrationEmailConfirmScreen } from "../components/LuxuryRegistrationEmailConfirmScreen";
import { LuxuryRegistrationEmailConfirmFlow } from "../components/LuxuryRegistrationEmailConfirmFlow";
import { registerClientApi } from "../api/registerClient";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { localeFromCountryCode } from "../i18n/countryToLocale";
import { useLuxuryLocale } from "../i18n/useLuxuryLocale";
import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  europeanCountryByCode,
} from "../data/europeanPhonePrefixes";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import { optionalEuropeanPhoneForRegisterApi } from "../lib/europeanPhone";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { humanizeAuthNetworkError, humanizePostRegistrationAuthErrorLocalized } from "../utils/authErrors";
import {
  CLIENT_POST_EMAIL_CONFIRM_PATH,
  isValidEmailVerificationToken,
  normalizeTokenFromUrl,
  clearClientSignupAwaiting,
  clearPendingEmailVerification,
  hasPendingEmailVerification,
  markClientSignupAwaiting,
  persistPendingEmailVerification,
  readClientSignupAwaiting,
  readPendingEmailVerification,
  readPendingEmailVerificationAt,
  resolveClientSignupReloadView,
} from "../lib/emailVerificationConfirmShared";
import { clearEmailVerifiedCrossTab, readEmailVerifiedCrossTabPayload } from "../lib/emailVerificationCrossTab";
import { readIntendedSalonPlanFromSession } from "../lib/salonRegistrationPostLogin";
import { PrivacyPolicyConsumerLayeredContent } from "./legal/PrivacyPolicyConsumerLayeredContent";
import { TermsOfServiceLayeredContent } from "./legal/TermsOfServiceLayeredContent";
import "../styles/luxury-search-page.css";
import "../styles/luxury-email-confirm-box.css";
import "../styles/luxury-salon-plans-register.css";
import "../styles/luxury-client-signup-page.css";
import "../styles/luxury-legal-public.css";

/**
 * Registrazione **cliente finale** (consumatore): form in-app + backend (ruolo `CLIENT`) — vedi
 * `docs/INGRESSI-RUOLI-E-PORTALI.md` §5.2. Stesso modello della registrazione salone su `/piani`.
 */
const LUXURY_ACCESS_TOKEN_KEY = "luxury_access_token";

function readRestoredClientSignup() {
  const storedAwaiting = readClientSignupAwaiting();
  const awaiting =
    storedAwaiting ??
    (!readIntendedSalonPlanFromSession() && hasPendingEmailVerification()
      ? { email: readPendingEmailVerification(), at: readPendingEmailVerificationAt() }
      : null);
  const verified = readEmailVerifiedCrossTabPayload();
  const view = resolveClientSignupReloadView({
    awaiting,
    verified: verified
      ? { email: verified.email, audience: verified.audience, registrationAt: verified.registrationAt }
      : null,
  });
  return {
    view,
    email: awaiting?.email ?? "",
    at: awaiting?.at ?? 0,
    message: view === "thank-you" ? verified?.message?.trim() || null : null,
  };
}

function leaveClientSignupConfirm(): void {
  clearClientSignupAwaiting();
  clearPendingEmailVerification();
  clearEmailVerifiedCrossTab();
}

type ConsumerSignupLegalTab = "terms" | "privacy";

function ConsumerSignupLegalModal({
  open,
  onClose,
  initialTab = "terms",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: ConsumerSignupLegalTab;
}) {
  const [tab, setTab] = useState<ConsumerSignupLegalTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="luxury-client-signup-legal-modal-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="luxury-client-signup-legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="luxury-client-signup-legal-title"
      >
        <div className="luxury-client-signup-legal-modal__glow" aria-hidden="true" />
        <div className="luxury-client-signup-legal-modal__shine" aria-hidden="true" />
        <div className="luxury-client-signup-legal-modal__head">
          <div className="luxury-client-signup-legal-modal__head-copy">
            <p id="luxury-client-signup-legal-title" className="luxury-client-signup-legal-modal__eyebrow">
              Documenti legali
            </p>
            <h2 className="luxury-client-signup-legal-modal__title">Termini e privacy</h2>
          </div>
          <button type="button" className="luxury-client-signup-legal-modal__close" onClick={onClose} aria-label="Chiudi">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p className="luxury-client-signup-legal-modal__lead">
          Leggi i documenti qui sotto senza uscire dalla registrazione.
        </p>
        <div className="luxury-client-signup-legal-modal__tabs-shell">
          <div className="luxury-client-signup-legal-modal__tabs" role="tablist" aria-label="Documenti legali">
          <button
            type="button"
            role="tab"
            id="luxury-client-signup-legal-tab-terms"
            aria-selected={tab === "terms"}
            aria-controls="luxury-client-signup-legal-panel"
            className={
              "luxury-client-signup-legal-modal__tab" + (tab === "terms" ? " luxury-client-signup-legal-modal__tab--active" : "")
            }
            onClick={() => setTab("terms")}
          >
            Termini di servizio
          </button>
          <button
            type="button"
            role="tab"
            id="luxury-client-signup-legal-tab-privacy"
            aria-selected={tab === "privacy"}
            aria-controls="luxury-client-signup-legal-panel"
            className={
              "luxury-client-signup-legal-modal__tab" + (tab === "privacy" ? " luxury-client-signup-legal-modal__tab--active" : "")
            }
            onClick={() => setTab("privacy")}
          >
            Informativa privacy clienti
          </button>
          </div>
        </div>
        <div
          id="luxury-client-signup-legal-panel"
          role="tabpanel"
          aria-labelledby={tab === "terms" ? "luxury-client-signup-legal-tab-terms" : "luxury-client-signup-legal-tab-privacy"}
          className="luxury-client-signup-legal-modal__scroll"
        >
          {tab === "terms" ? <TermsOfServiceLayeredContent /> : <PrivacyPolicyConsumerLayeredContent embedded />}
        </div>
        <p className="luxury-client-signup-legal-modal__footnote">
          Tocca una sezione per espanderla. Chiudi per tornare al modulo di registrazione.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export default function ClientSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = normalizeTokenFromUrl(searchParams.get("token"));
  const hasTokenConfirm = isValidEmailVerificationToken(tokenFromUrl);
  const superAdminIntent = searchParams.get("superadmin") === "1" || searchParams.get("superadmin") === "true";
  const formId = useId();
  const { signInWithPassword } = useLuxuryAuth();
  const { setLocaleFromCountryForRegistration, t } = useLuxuryLocale();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_EUROPEAN_COUNTRY_CODE);
  const [phoneDialCode, setPhoneDialCode] = useState(
    () => europeanCountryByCode(DEFAULT_EUROPEAN_COUNTRY_CODE)?.dialCode ?? "+39",
  );
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAdult16, setConfirmAdult16] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [superAdminNote, setSuperAdminNote] = useState<string | null>(null);
  const [restoredSignup] = useState(readRestoredClientSignup);
  const [registrationComplete, setRegistrationComplete] = useState(restoredSignup.view !== "form");
  const [registeredEmail, setRegisteredEmail] = useState(restoredSignup.email);
  const [pendingVerificationAt, setPendingVerificationAt] = useState(restoredSignup.at);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(restoredSignup.message);
  const [postSignupHeroTitle, setPostSignupHeroTitle] = useState("Controlla la tua email");
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<ConsumerSignupLegalTab>("terms");

  useEffect(() => {
    if (restoredSignup.view === "form" || readClientSignupAwaiting()) return;
    if (restoredSignup.email && restoredSignup.at) {
      markClientSignupAwaiting(restoredSignup.email, restoredSignup.at);
    }
  }, [restoredSignup]);

  useEffect(() => {
    if (!hasTokenConfirm) return;
    const qs = new URLSearchParams({ token: tokenFromUrl, audience: "client" });
    const email = searchParams.get("email");
    if (email?.trim()) qs.set("email", email.trim().toLowerCase());
    navigate(`/conferma-email?${qs.toString()}`, { replace: true });
  }, [hasTokenConfirm, tokenFromUrl, searchParams, navigate]);

  const openLegalModal = (tab: ConsumerSignupLegalTab) => {
    setLegalModalTab(tab);
    setPrivacyNoticeOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHint(null);
    setSuperAdminNote(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorHint("Compila nome, cognome ed email.");
      return;
    }
    if (password.length < 8) {
      setErrorHint("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorHint("Le password non coincidono.");
      return;
    }
    if (!acceptTerms) {
      setErrorHint("Per proseguire accetta i termini del servizio.");
      return;
    }
    if (!confirmAdult16) {
      setErrorHint("Per registrarti devi confermare di avere almeno 16 anni.");
      return;
    }

    setSubmitting(true);
    void (async () => {
      try {
        const emailNorm = email.trim().toLowerCase();
        const registrationMessage = await registerClientApi({
          email: emailNorm,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country: countryCode,
          preferredLocale: localeFromCountryCode(countryCode),
          phone: optionalEuropeanPhoneForRegisterApi(phoneDialCode, phoneLocal),
          bootstrapSuperAdmin: superAdminIntent,
        });
        if (superAdminIntent) {
          try {
            await signInWithPassword(emailNorm, password);
            const tok = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY) : null;
            const roles = luxuryJwtHintsFromAccessToken(tok ?? undefined).realmRoles;
            if (roles.includes("ADMIN")) {
              void queryClient.invalidateQueries({ queryKey: ["admin", "status"] });
              navigate("/admin/dashboard", { replace: true });
              return;
            }
            setSuperAdminNote(
              "Account cliente creato, ma il super admin non è stato attivato: su questo ambiente esiste già un super admin in configurazione o in database.",
            );
            setRegistrationComplete(true);
            setRegisteredEmail(emailNorm);
            setRegistrationSuccessMessage(registrationMessage);
            const pendingAt = persistPendingEmailVerification(emailNorm);
            markClientSignupAwaiting(emailNorm, pendingAt);
            setPendingVerificationAt(pendingAt);
            return;
          } catch (authErr) {
            setErrorHint(humanizePostRegistrationAuthErrorLocalized(authErr, t));
            return;
          }
        }
        setRegistrationComplete(true);
        setRegisteredEmail(emailNorm);
        setRegistrationSuccessMessage(registrationMessage);
        const pendingAt = persistPendingEmailVerification(emailNorm);
        markClientSignupAwaiting(emailNorm, pendingAt);
        setPendingVerificationAt(pendingAt);
      } catch (err) {
        setErrorHint(humanizeAuthNetworkError(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const titleId = `${formId}-title`;

  if (registrationComplete) {
    const displayEmail = registeredEmail || searchParams.get("email")?.trim().toLowerCase() || "";
    const registrationAt = pendingVerificationAt || readPendingEmailVerificationAt();
    return (
      <>
        <LuxuryRegistrationEmailConfirmScreen
          heroTitle={postSignupHeroTitle}
          hideHero
          backRow={
            <div className="luxury-search-back-row">
              <Link to="/" className="luxury-search-back" onClick={leaveClientSignupConfirm}>
                <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Torna alla ricerca saloni
              </Link>
            </div>
          }
          errorHint={errorHint}
          email={displayEmail}
          accountLabel="cliente"
          extraNote={superAdminNote}
          loginReturnPath={CLIENT_POST_EMAIL_CONFIRM_PATH}
          onEmailCorrected={setRegisteredEmail}
          confirmContent={
            <LuxuryRegistrationEmailConfirmFlow
              email={displayEmail}
              accountLabel="cliente"
              extraNote={superAdminNote}
              loginReturnPath={CLIENT_POST_EMAIL_CONFIRM_PATH}
              onEmailCorrected={setRegisteredEmail}
              tokenFromUrl={tokenFromUrl}
              planParam={null}
              audience="client"
              registrationAt={registrationAt}
              thankYouMessage={registrationSuccessMessage}
              resumeThankYou={restoredSignup.view === "thank-you"}
              onHeroTitleChange={setPostSignupHeroTitle}
              listenForCrossTab={registrationComplete && !hasTokenConfirm}
              surface="registrationTab"
            />
          }
        />
        <ConsumerSignupLegalModal
          open={privacyNoticeOpen}
          onClose={() => setPrivacyNoticeOpen(false)}
          initialTab={legalModalTab}
        />
      </>
    );
  }

  return (
    <>
    <main className="luxury-page-main luxury-search-page luxury-plans-wrap luxury-client-signup-page">
      <div className="luxury-search-back-row">
        <Link to="/" className="luxury-search-back">
          <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Torna alla ricerca saloni
        </Link>
      </div>

      <div className="luxury-client-signup-shell">
          <section
            className="luxury-email-confirm-box luxury-salon-register-box luxury-salon-register-box--wide"
            role="region"
            aria-labelledby={titleId}
          >
            <div className="luxury-email-confirm-box__glow" aria-hidden />
            <div className="luxury-email-confirm-box__icon-wrap" aria-hidden>
              <svg className="luxury-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8.5V18a2 2 0 002 2h12a2 2 0 002-2V8.5M4 8.5L12 13l8-4.5M4 8.5l8-4.5 8 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 14h6M9 17h4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="luxury-email-confirm-box__kicker">
              {superAdminIntent ? "Prima installazione" : "Registrazione cliente"}
            </p>
            <h1 id={titleId} className="luxury-email-confirm-box__title">
              {superAdminIntent ? "Super admin" : "Crea il tuo account"}
            </h1>
            {superAdminIntent ? (
              <p className="luxury-email-confirm-box__lead">
                Stesso modulo della registrazione cliente: se il sistema <strong>non ha ancora</strong> un super admin
                (nessuna credenziale in configurazione né in database), questo account diventa amministratore e dopo il
                login entri nel <strong>pannello di gestione</strong>. Altrimenti resti un normale account cliente.
              </p>
            ) : null}
            <form className="luxury-salon-register-box__form luxury-plans-modal__form" noValidate onSubmit={onSubmit}>
            <label className="luxury-plans-field">
              <span>Nome</span>
              <input
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={100}
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="luxury-plans-field">
              <span>Cognome</span>
              <input
                name="lastName"
                autoComplete="family-name"
                required
                maxLength={100}
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="luxury-plans-field luxury-plans-field--full">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={submitting}
              />
            </label>
            <LuxuryEuropeanContactFields
              countryCode={countryCode}
              onCountryCodeChange={(code) => {
                setCountryCode(code);
                setLocaleFromCountryForRegistration(code);
              }}
              dialCode={phoneDialCode}
              onDialCodeChange={setPhoneDialCode}
              phoneLocal={phoneLocal}
              onPhoneLocalChange={setPhoneLocal}
              disabled={submitting}
              countrySelectId={`${formId}-country`}
              prefixSelectId={`${formId}-phone-prefix`}
              phoneInputId={`${formId}-phone-local`}
            />
            <div className="luxury-plans-password-pair">
              <label className="luxury-plans-field">
                <span>Password</span>
                <div className="luxury-plans-password-wrap">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={200}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="luxury-plans-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={submitting}
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg
                        className="luxury-plans-password-toggle__icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M3 3l18 18M10.73 10.73a3 3 0 004.24 4.24M9.88 9.88A10.05 10.05 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-4.13 5.41M6.12 6.12A10.02 10.02 0 003.46 12c.77 3.95 4.26 7 8.54 7 1.05 0 2.05-.18 2.98-.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="luxury-plans-password-toggle__icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
              <label className="luxury-plans-field">
                <span>Ripeti password</span>
                <div className="luxury-plans-password-wrap">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={200}
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="luxury-plans-password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={submitting}
                    aria-label={showConfirmPassword ? "Nascondi ripeti password" : "Mostra ripeti password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="luxury-plans-password-toggle__icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M3 3l18 18M10.73 10.73a3 3 0 004.24 4.24M9.88 9.88A10.05 10.05 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-4.13 5.41M6.12 6.12A10.02 10.02 0 003.46 12c.77 3.95 4.26 7 8.54 7 1.05 0 2.05-.18 2.98-.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="luxury-plans-password-toggle__icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </label>
            </div>
            <div className="luxury-plans-privacy-terms luxury-plans-field--full">
              <label className="luxury-plans-field luxury-plans-field--check">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(ev) => setAcceptTerms(ev.target.checked)}
                  disabled={submitting}
                />
                <span>
                  Accetto i{" "}
                  <button
                    type="button"
                    className="luxury-link-inline"
                    onClick={() => openLegalModal("terms")}
                    disabled={submitting}
                  >
                    termini di servizio
                  </button>{" "}
                  e l&apos;
                  <button
                    type="button"
                    className="luxury-link-inline"
                    onClick={() => openLegalModal("privacy")}
                    disabled={submitting}
                  >
                    informativa privacy clienti
                  </button>
                  .
                </span>
              </label>
              <label className="luxury-plans-field luxury-plans-field--check">
                <input
                  type="checkbox"
                  checked={confirmAdult16}
                  onChange={(ev) => setConfirmAdult16(ev.target.checked)}
                  disabled={submitting}
                />
                <span>Confermo di avere almeno 16 anni.</span>
              </label>
              <button
                type="button"
                className="luxury-plans-privacy-open"
                onClick={() => openLegalModal("terms")}
                disabled={submitting}
              >
                Leggi termini e privacy
              </button>
            </div>
            {errorHint ? (
              <p className="luxury-alert luxury-alert--error luxury-salon-register-box__alert" role="alert">
                {errorHint}
              </p>
            ) : null}
            <div className="luxury-salon-register-box__actions luxury-email-confirm-box__actions">
              <button
                type="submit"
                className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--primary"
                disabled={submitting}
              >
                {submitting ? "Registrazione…" : "Crea account cliente"}
              </button>
            </div>
            </form>
            <p className="luxury-client-signup-footnote">
              Hai già un account?{" "}
              <Link
                to="/account"
                className="luxury-link-inline"
                onClick={() => setPostLoginReturnPath("/account")}
              >
                Accedi
              </Link>
            </p>
          </section>
      </div>
    </main>
    <ConsumerSignupLegalModal
      open={privacyNoticeOpen}
      onClose={() => setPrivacyNoticeOpen(false)}
      initialTab={legalModalTab}
    />
    </>
  );
}
