import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { VelvetEuropeanContactFields } from "../components/VelvetEuropeanContactFields";
import { VelvetRegistrationEmailConfirmBox } from "../components/VelvetRegistrationEmailConfirmBox";
import { registerClientApi } from "../api/registerClient";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  europeanCountryByCode,
} from "../data/europeanPhonePrefixes";
import { velvetJwtHintsFromAccessToken } from "../lib/velvetJwtHintsFromAccessToken";
import { optionalEuropeanPhoneForRegisterApi } from "../lib/europeanPhone";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { humanizeOidcNetworkError, humanizePostRegistrationAuthError } from "../utils/oidcErrors";
import "../styles/velvet-plans.css";
import "../styles/velvet-search-page.css";
import "../styles/velvet-email-confirm-box.css";
import "../styles/velvet-salon-plans-register.css";
import "../styles/velvet-client-signup-page.css";

/**
 * Registrazione **cliente finale** (consumatore): form in-app + backend (ruolo `CLIENT`) — vedi
 * `docs/INGRESSI-RUOLI-E-PORTALI.md` §5.2. Stesso modello della registrazione salone su `/piani`.
 */
const VELVET_ACCESS_TOKEN_KEY = "velvet_access_token";

export default function ClientSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const superAdminIntent = searchParams.get("superadmin") === "1" || searchParams.get("superadmin") === "true";
  const formId = useId();
  const { signInWithPassword } = useVelvetAuth();
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
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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
        await registerClientApi({
          email: emailNorm,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country: countryCode,
          phone: optionalEuropeanPhoneForRegisterApi(phoneDialCode, phoneLocal),
          bootstrapSuperAdmin: superAdminIntent,
        });
        if (superAdminIntent) {
          try {
            await signInWithPassword(emailNorm, password);
            const tok = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(VELVET_ACCESS_TOKEN_KEY) : null;
            const roles = velvetJwtHintsFromAccessToken(tok ?? undefined).realmRoles;
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
            return;
          } catch (authErr) {
            setErrorHint(humanizePostRegistrationAuthError(authErr));
            return;
          }
        }
        setRegistrationComplete(true);
        setRegisteredEmail(emailNorm);
      } catch (err) {
        setErrorHint(humanizeOidcNetworkError(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const titleId = `${formId}-title`;

  return (
    <main className="velvet-page-main velvet-search-page velvet-plans-wrap velvet-client-signup-page">
      <div className="velvet-search-back-row">
        <Link to="/" className="velvet-search-back">
          <svg className="velvet-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
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

      <div className="velvet-client-signup-shell">
        {registrationComplete ? (
          <VelvetRegistrationEmailConfirmBox
            email={registeredEmail}
            accountLabel="cliente"
            extraNote={superAdminNote}
          />
        ) : (
          <section
            className="velvet-email-confirm-box velvet-salon-register-box velvet-salon-register-box--wide"
            role="region"
            aria-labelledby={titleId}
          >
            <div className="velvet-email-confirm-box__glow" aria-hidden />
            <div className="velvet-email-confirm-box__icon-wrap" aria-hidden>
              <svg className="velvet-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
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
            <p className="velvet-email-confirm-box__kicker">
              {superAdminIntent ? "Prima installazione" : "Registrazione cliente"}
            </p>
            <h1 id={titleId} className="velvet-email-confirm-box__title">
              {superAdminIntent ? "Super admin" : "Crea il tuo account"}
            </h1>
            {superAdminIntent ? (
              <p className="velvet-email-confirm-box__lead">
                Stesso modulo della registrazione cliente: se il sistema <strong>non ha ancora</strong> un super admin
                (nessuna credenziale in configurazione né in database), questo account diventa amministratore e dopo il
                login entri nel <strong>pannello di gestione</strong>. Altrimenti resti un normale account cliente.
              </p>
            ) : null}
            {errorHint ? (
              <p className="velvet-alert velvet-alert--error velvet-salon-register-box__alert" role="alert">
                {errorHint}
              </p>
            ) : null}
            <form className="velvet-salon-register-box__form velvet-plans-modal__form" noValidate onSubmit={onSubmit}>
            <label className="velvet-plans-field">
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
            <label className="velvet-plans-field">
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
            <label className="velvet-plans-field velvet-plans-field--full">
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
            <VelvetEuropeanContactFields
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              dialCode={phoneDialCode}
              onDialCodeChange={setPhoneDialCode}
              phoneLocal={phoneLocal}
              onPhoneLocalChange={setPhoneLocal}
              disabled={submitting}
              countrySelectId={`${formId}-country`}
              prefixSelectId={`${formId}-phone-prefix`}
              phoneInputId={`${formId}-phone-local`}
            />
            <div className="velvet-plans-password-pair">
              <label className="velvet-plans-field">
                <span>Password</span>
                <div className="velvet-plans-password-wrap">
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
                    className="velvet-plans-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={submitting}
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg
                        className="velvet-plans-password-toggle__icon"
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
                        className="velvet-plans-password-toggle__icon"
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
              <label className="velvet-plans-field">
                <span>Ripeti password</span>
                <div className="velvet-plans-password-wrap">
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
                    className="velvet-plans-password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    disabled={submitting}
                    aria-label={showConfirmPassword ? "Nascondi ripeti password" : "Mostra ripeti password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="velvet-plans-password-toggle__icon"
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
                        className="velvet-plans-password-toggle__icon"
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
            <div className="velvet-plans-privacy-terms velvet-plans-field--full">
              <label className="velvet-plans-field velvet-plans-field--check">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(ev) => setAcceptTerms(ev.target.checked)}
                  disabled={submitting}
                />
                <span>
                  Accetto i{" "}
                  <Link to="/termini" className="velvet-link-inline" target="_blank" rel="noopener noreferrer">
                    termini di servizio
                  </Link>{" "}
                  e l&apos;
                  <Link to="/privacy/clienti" className="velvet-link-inline" target="_blank" rel="noopener noreferrer">
                    informativa privacy clienti
                  </Link>
                  .
                </span>
              </label>
              <label className="velvet-plans-field velvet-plans-field--check">
                <input
                  type="checkbox"
                  checked={confirmAdult16}
                  onChange={(ev) => setConfirmAdult16(ev.target.checked)}
                  disabled={submitting}
                />
                <span>Confermo di avere almeno 16 anni.</span>
              </label>
            </div>
            <div className="velvet-salon-register-box__actions velvet-email-confirm-box__actions">
              <button
                type="submit"
                className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--primary"
                disabled={submitting}
              >
                {submitting ? "Registrazione…" : "Crea account cliente"}
              </button>
            </div>
            </form>
            <p className="velvet-client-signup-footnote">
              Hai già un account?{" "}
              <Link
                to="/account"
                className="velvet-link-inline"
                onClick={() => setPostLoginReturnPath("/account")}
              >
                Accedi
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
