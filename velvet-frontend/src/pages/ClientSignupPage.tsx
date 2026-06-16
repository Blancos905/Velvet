import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { VelvetEuropeanContactFields } from "../components/VelvetEuropeanContactFields";
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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmAdult16, setConfirmAdult16] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [infoHint, setInfoHint] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHint(null);
    setInfoHint(null);

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
        try {
          await signInWithPassword(emailNorm, password);
          if (superAdminIntent) {
            const tok = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(VELVET_ACCESS_TOKEN_KEY) : null;
            const roles = velvetJwtHintsFromAccessToken(tok ?? undefined).realmRoles;
            if (roles.includes("ADMIN")) {
              void queryClient.invalidateQueries({ queryKey: ["admin", "status"] });
              navigate("/admin/dashboard", { replace: true });
              return;
            }
            setInfoHint(
              "Account cliente creato, ma il super admin non è stato attivato: su questo ambiente esiste già un super admin in configurazione o in database. Rimuovi le credenziali predefinite in application.properties / env oppure usa il login admin.",
            );
          }
          navigate("/account", { replace: true });
        } catch (authErr) {
          setErrorHint(humanizePostRegistrationAuthError(authErr));
        }
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

      <header className="velvet-plans-hero velvet-client-signup-hero">
        {superAdminIntent ? <p className="velvet-plans-kicker">Prima installazione</p> : null}
        <h1 id={titleId} className="velvet-plans-title">
          {superAdminIntent ? "Registrati come super admin" : "Registrati come cliente"}
        </h1>
        {superAdminIntent ? (
          <p className="velvet-plans-lead">
            Stesso modulo della registrazione cliente: se il sistema <strong>non ha ancora</strong> un super admin
            (nessuna credenziale in configurazione né in database), questo account diventa amministratore e dopo il login
            entri nel <strong>pannello di gestione</strong>. Altrimenti resti un normale account cliente.
          </p>
        ) : null}
      </header>

      <div className="velvet-plans-modal-root velvet-client-signup-modal-root">
        <div className="velvet-plans-modal velvet-client-signup-modal" role="region" aria-labelledby={titleId}>
          {errorHint ? (
            <p className="velvet-alert velvet-alert--error velvet-plans-modal__alert" role="alert">
              {errorHint}
            </p>
          ) : null}
          {infoHint ? (
            <p className="velvet-alert velvet-alert--success velvet-plans-modal__alert" role="status">
              {infoHint}
            </p>
          ) : null}
          <form className="velvet-plans-modal__form" noValidate onSubmit={onSubmit}>
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
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  disabled={submitting}
                />
              </label>
              <label className="velvet-plans-field">
                <span>Ripeti password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  disabled={submitting}
                />
              </label>
            </div>
            <label className="velvet-plans-field velvet-plans-field--full velvet-plans-field--check">
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
            <label className="velvet-plans-field velvet-plans-field--full velvet-plans-field--check">
              <input
                type="checkbox"
                checked={confirmAdult16}
                onChange={(ev) => setConfirmAdult16(ev.target.checked)}
                disabled={submitting}
              />
              <span>Confermo di avere almeno 16 anni.</span>
            </label>
            <div className="velvet-plans-modal__actions">
              <button type="submit" className="velvet-plan-cta" disabled={submitting}>
                {submitting ? "Registrazione…" : "Crea account cliente"}
              </button>
            </div>
          </form>
          <p className="velvet-plans-footnote" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Hai già un account?{" "}
            <Link
              to="/account"
              className="velvet-link-inline"
              onClick={() => setPostLoginReturnPath("/account")}
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
