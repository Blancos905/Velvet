import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { registerConsumerApi } from "../api/registerConsumer";
import { SaloniVelvetLogoMark } from "../components/SaloniVelvetLogoMark";
import { SalonPremiumPlanCardPreview } from "../components/salon/SalonPremiumPlanCardPreview";
import { SalonPremiumOwnerInfoPrivacyModal } from "../components/salon/SalonPremiumOwnerInfoPrivacyModal";
import { partnerContactEmail } from "../config/env";
import { SALON_BUSINESS_TYPE_OPTIONS } from "../data/salonBusinessTypes";
import { SALON_CLIENT_GENDER_OPTIONS } from "../data/salonClientGenders";
import { SALON_PLANS, planDisplayName, type SalonPlanTier } from "../data/salonPlans";
import { DEFAULT_IT_PHONE_PREFIX, optionalPhoneForRegisterApi } from "../lib/itPhoneDefaults";
import { humanizeOidcNetworkError, humanizePostRegistrationAuthError } from "../utils/oidcErrors";
import "../styles/velvet-search-page.css";

function validateRequiredSalonLocation(s: {
  salonAddressLine1: string;
  salonPostalCode: string;
  salonCity: string;
  salonProvince: string;
}): string | null {
  const t = (x: string) => x.trim();
  if (!t(s.salonAddressLine1) || !t(s.salonPostalCode) || !t(s.salonCity) || !t(s.salonProvince)) {
    return "Indica l’indirizzo della sede (via, CAP, città e provincia) così i clienti possono trovarti in ricerca e in vetrina.";
  }
  return null;
}

export default function SalonPlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signUpForSalon, signInWithPassword } = useVelvetAuth();
  const [modalPlan, setModalPlan] = useState<SalonPlanTier | null>(null);
  const [freePlanNoticeOpen, setFreePlanNoticeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [infoHint, setInfoHint] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(DEFAULT_IT_PHONE_PREFIX);
  const [salonName, setSalonName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);

  const [salonAddressLine1, setSalonAddressLine1] = useState("");
  const [salonPostalCode, setSalonPostalCode] = useState("");
  const [salonCity, setSalonCity] = useState("");
  const [salonProvince, setSalonProvince] = useState("");
  const [salonCountry, setSalonCountry] = useState("IT");
  const [salonBusinessTypes, setSalonBusinessTypes] = useState<Set<string>>(() => new Set());
  const [salonClientGenders, setSalonClientGenders] = useState<Set<string>>(() => new Set());

  const formId = useId();
  const salonTypesLegendId = `${formId}-salon-types-legend`;
  const salonClientGendersLegendId = `${formId}-salon-client-genders-legend`;
  const titleId = `${formId}-title`;

  const openRegistration = (tier: SalonPlanTier) => {
    setErrorHint(null);
    setInfoHint(null);
    if (tier === "BASE") {
      setFreePlanNoticeOpen(true);
      return;
    }
    signUpForSalon(tier);
    setModalPlan(tier);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone(DEFAULT_IT_PHONE_PREFIX);
    setSalonName("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAcceptTerms(false);
    setSalonAddressLine1("");
    setSalonPostalCode("");
    setSalonCity("");
    setSalonProvince("");
    setSalonCountry("IT");
    setSalonBusinessTypes(new Set());
    setSalonClientGenders(new Set());
  };

  const closeModal = () => {
    if (submitting) return;
    setShowPassword(false);
    setShowConfirmPassword(false);
    setModalPlan(null);
  };
  const closeFreePlanNotice = () => {
    setFreePlanNoticeOpen(false);
  };

  const onSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalPlan == null) return;
    setErrorHint(null);
    setInfoHint(null);

    /* Evitiamo di dipendere dalla validazione HTML5: con modale overlay il browser spesso non mostra il tooltip nativo
       e sembra che il pulsante «non faccia nulla». */
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
    if (!salonName.trim()) {
      setErrorHint("Indica il nome del salone (come lo vedono i clienti in ricerca e in vetrina).");
      return;
    }

    if (modalPlan === "BASE" || modalPlan === "PREMIUM") {
      if (salonBusinessTypes.size === 0) {
        setErrorHint(
          "Seleziona almeno una tipologia: parrucchiere, estetista e/o massaggio / fisioterapia (puoi combinarle).",
        );
        return;
      }
      if (salonClientGenders.size === 0) {
        setErrorHint("Seleziona almeno un pubblico di riferimento: maschile e/o femminile (puoi indicare entrambi).");
        return;
      }
      const salonErr = validateRequiredSalonLocation({
        salonAddressLine1,
        salonPostalCode,
        salonCity,
        salonProvince,
      });
      if (salonErr) {
        setErrorHint(salonErr);
        return;
      }
    }

    setSubmitting(true);
    void (async () => {
      try {
        const emailNorm = email.trim().toLowerCase();
        await registerConsumerApi({
          email: emailNorm,
          password,
          firstName,
          lastName,
          phone: optionalPhoneForRegisterApi(phone),
          salonName: salonName.trim(),
          planTier: modalPlan,
          ...(modalPlan === "BASE" || modalPlan === "PREMIUM"
            ? {
                salonAddressLine1: salonAddressLine1.trim(),
                salonPostalCode: salonPostalCode.trim(),
                salonCity: salonCity.trim(),
                salonProvince: salonProvince.trim(),
                salonCountry: salonCountry.trim() || "IT",
                salonBusinessTypes: [...salonBusinessTypes].sort(),
                salonClientGenders: [...salonClientGenders].sort(),
              }
            : {}),
        });
        await queryClient.invalidateQueries({ queryKey: ["orgs"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        try {
          await signInWithPassword(emailNorm, password);
          setModalPlan(null);
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

  const modalPlanName = modalPlan != null ? planDisplayName(modalPlan) : "";
  const showLocationSection = modalPlan === "BASE" || modalPlan === "PREMIUM";
  const wideModal = showLocationSection;

  const planModals =
    typeof document !== "undefined"
      ? createPortal(
          <>
            {freePlanNoticeOpen ? (
              <div
                className="velvet-plans-modal-root"
                role="presentation"
                onMouseDown={(ev) => ev.target === ev.currentTarget && closeFreePlanNotice()}
              >
                <div
                  className="velvet-plans-modal velvet-plans-modal--free-notice"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-free-notice`}
                >
                  <div className="velvet-plans-modal__head">
                    <h2 id={`${titleId}-free-notice`} className="velvet-plans-modal__title">
                      Piano Free
                    </h2>
                    <button
                      type="button"
                      className="velvet-plans-modal__close"
                      onClick={closeFreePlanNotice}
                      aria-label="Chiudi"
                    >
                      ×
                    </button>
                  </div>
                  <div className="velvet-plan-premium-preview velvet-plan-premium-preview--modal-free">
                    <p className="velvet-plans-modal__free-body">
                      Per accedere al piano Free scarica e registrati dall&apos;app Saloni Luxury.
                    </p>
                  </div>
                  <div className="velvet-plans-modal__actions">
                    <button type="button" className="velvet-plan-cta" onClick={closeFreePlanNotice}>
                      Chiudi
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {modalPlan != null ? (
              <div className="velvet-plans-modal-root" role="presentation" onMouseDown={(ev) => ev.target === ev.currentTarget && closeModal()}>
                <div
                  className={`velvet-plans-modal velvet-plans-modal--salon-register${modalPlan === "PREMIUM" ? " velvet-plans-modal--salon-register-premium" : ""}${wideModal ? " velvet-plans-modal--wide" : ""}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                >
                  <div className="velvet-plans-modal__head">
                    <h2 id={titleId} className="velvet-plans-modal__title">
                      <span className="velvet-plans-modal__title-kicker">Registrazione</span>
                      <span className="velvet-plans-modal__title-sep" aria-hidden>
                        {" "}
                        —{" "}
                      </span>
                      <span className="velvet-plans-modal__title-plan">piano {modalPlanName}</span>
                    </h2>
                    <button type="button" className="velvet-plans-modal__close" onClick={closeModal} disabled={submitting} aria-label="Chiudi">
                      ×
                    </button>
                  </div>
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
                  <form className="velvet-plans-modal__form" noValidate onSubmit={onSubmitRegistration}>
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
                    <label className="velvet-plans-field velvet-plans-field--full">
                      <span>Telefono</span>
                      <input
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={40}
                        value={phone}
                        onChange={(ev) => setPhone(ev.target.value)}
                        disabled={submitting}
                      />
                    </label>
                    <label className="velvet-plans-field velvet-plans-field--full">
                      <span>Nome del salone</span>
                      <input
                        name="salonName"
                        autoComplete="organization"
                        required
                        maxLength={200}
                        value={salonName}
                        onChange={(ev) => setSalonName(ev.target.value)}
                        disabled={submitting}
                        placeholder="Es. Studio Hair Verdi"
                      />
                    </label>

                    {showLocationSection ? (
                      <>
                        <fieldset
                          className="velvet-plans-fieldset velvet-plans-salon-types velvet-plans-field--full"
                          aria-labelledby={salonTypesLegendId}
                        >
                          <legend id={salonTypesLegendId} className="velvet-plans-salon-types__legend">
                            Di che salone si tratta?
                          </legend>
                          <div className="velvet-plans-salon-types__chips">
                            {SALON_BUSINESS_TYPE_OPTIONS.map((opt) => {
                              const selected = salonBusinessTypes.has(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className={`velvet-plans-salon-type-chip${selected ? " velvet-plans-salon-type-chip--selected" : ""}`}
                                  aria-pressed={selected}
                                  disabled={submitting}
                                  onClick={() => {
                                    setSalonBusinessTypes((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(opt.id)) next.delete(opt.id);
                                      else next.add(opt.id);
                                      return next;
                                    });
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                        <fieldset
                          className="velvet-plans-fieldset velvet-plans-salon-types velvet-plans-field--full"
                          aria-labelledby={salonClientGendersLegendId}
                        >
                          <legend id={salonClientGendersLegendId} className="velvet-plans-salon-types__legend">
                            Per chi è il salone?
                          </legend>
                          <div className="velvet-plans-salon-types__chips">
                            {SALON_CLIENT_GENDER_OPTIONS.map((opt) => {
                              const selected = salonClientGenders.has(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className={`velvet-plans-salon-type-chip${selected ? " velvet-plans-salon-type-chip--selected" : ""}`}
                                  aria-pressed={selected}
                                  disabled={submitting}
                                  onClick={() => {
                                    setSalonClientGenders((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(opt.id)) next.delete(opt.id);
                                      else next.add(opt.id);
                                      return next;
                                    });
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                        <label className="velvet-plans-field velvet-plans-field--full">
                          <span>Indirizzo sede (via e civico)</span>
                          <input
                            name="salonAddressLine1"
                            autoComplete="street-address"
                            required
                            maxLength={200}
                            value={salonAddressLine1}
                            onChange={(ev) => setSalonAddressLine1(ev.target.value)}
                            disabled={submitting}
                          />
                        </label>
                        <label className="velvet-plans-field">
                          <span>CAP</span>
                          <input
                            name="salonPostalCode"
                            autoComplete="postal-code"
                            required
                            maxLength={12}
                            value={salonPostalCode}
                            onChange={(ev) => setSalonPostalCode(ev.target.value)}
                            disabled={submitting}
                          />
                        </label>
                        <label className="velvet-plans-field">
                          <span>Città</span>
                          <input
                            name="salonCity"
                            autoComplete="address-level2"
                            required
                            maxLength={100}
                            value={salonCity}
                            onChange={(ev) => setSalonCity(ev.target.value)}
                            disabled={submitting}
                          />
                        </label>
                        <label className="velvet-plans-field">
                          <span>Provincia (sigla)</span>
                          <input
                            name="salonProvince"
                            autoComplete="address-level1"
                            required
                            maxLength={5}
                            value={salonProvince}
                            onChange={(ev) => setSalonProvince(ev.target.value)}
                            disabled={submitting}
                            placeholder="es. MI"
                          />
                        </label>
                        <label className="velvet-plans-field">
                          <span>Paese (ISO)</span>
                          <input
                            name="salonCountry"
                            autoComplete="country"
                            maxLength={2}
                            value={salonCountry}
                            onChange={(ev) => setSalonCountry(ev.target.value.toUpperCase())}
                            disabled={submitting}
                            placeholder="IT"
                          />
                        </label>
                      </>
                    ) : null}

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
                          Dichiaro di aver letto e accetto i{" "}
                          <Link to="/termini" className="velvet-link-inline" target="_blank" rel="noopener noreferrer">
                            termini di servizio
                          </Link>{" "}
                          e l&apos;
                          <Link to="/privacy" className="velvet-link-inline" target="_blank" rel="noopener noreferrer">
                            informativa privacy
                          </Link>
                          .
                        </span>
                      </label>
                      <button
                        type="button"
                        className="velvet-plans-privacy-open"
                        onClick={() => setPrivacyNoticeOpen(true)}
                        disabled={submitting}
                      >
                        Leggi info e privacy
                      </button>
                    </div>
                    <div className="velvet-plans-modal__actions">
                      <button type="button" className="velvet-plan-cta velvet-plan-cta--secondary" onClick={closeModal} disabled={submitting}>
                        Annulla
                      </button>
                      <button type="submit" className="velvet-plan-cta" disabled={submitting}>
                        {submitting ? "Creazione account…" : "Crea account e continua"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </>,
          document.body
        )
      : null;

  return (
    <>
    <main className="velvet-page-main velvet-search-page velvet-plans-page">
      <div className="velvet-search-back-row">
        <Link to="/partner" className="velvet-search-back" aria-label="Indietro a Perché Saloni Luxury">
          <svg className="velvet-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Indietro
        </Link>
      </div>

      <header className="velvet-search-hero">
        <div className="velvet-search-hero__glow" aria-hidden />
        <SaloniVelvetLogoMark variant="hero" />
        <p className="velvet-plans-page__kicker">Per titolari e saloni</p>
        <h1 className="velvet-page-title">
          <span className="velvet-search-hero__title-text">Scegli il piano e registrati</span>
        </h1>
      </header>

      {errorHint && (
        <p className="velvet-alert velvet-alert--error" role="alert">
          {errorHint}
        </p>
      )}
      {infoHint && (
        <p className="velvet-alert velvet-alert--success" role="status">
          {infoHint}
        </p>
      )}

      <div className="velvet-plans-grid">
        {SALON_PLANS.map((p) => {
          const name = planDisplayName(p.tier);
          return (
            <article
              key={p.tier}
              data-tier={p.tier}
              className={`velvet-plan-card${p.highlighted ? " velvet-plan-card--featured" : ""}`}
            >
              <h2 className="velvet-plan-card__name">{name}</h2>
              <div
                className="velvet-plan-card__price-block"
                aria-label={[p.priceHint, p.pricePeriod].filter(Boolean).join(". ")}
              >
                <div className="velvet-plan-card__price-orbit" aria-hidden />
                <div className="velvet-plan-card__price-row">
                  {p.priceValue != null && p.priceValue !== "" ? (
                    <>
                      <span className="velvet-plan-card__price-value">{p.priceValue}</span>
                      <span className="velvet-plan-card__price-euro">€</span>
                    </>
                  ) : (
                    <span className="velvet-plan-card__price-value velvet-plan-card__price-value--label">{p.priceHint}</span>
                  )}
                </div>
                {p.pricePeriod != null && p.pricePeriod.length > 0 ? (
                  <p className="velvet-plan-card__price-period">{p.pricePeriod}</p>
                ) : null}
              </div>
              <p className="velvet-plan-card__tagline">{p.tagline}</p>
              {p.tier === "PREMIUM" ? (
                <SalonPremiumPlanCardPreview />
              ) : (
                <ul className="velvet-plan-card__list">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="velvet-plan-cta" onClick={() => openRegistration(p.tier)}>
                <span className="velvet-plan-card__cta-line">
                  <span className="velvet-plan-card__cta-lead">Registrati</span>{" "}
                  <span className="velvet-plan-card__cta-mid">con piano</span>{" "}
                  <span className="velvet-plan-card__cta-plan">{name}</span>
                </span>
              </button>
            </article>
          );
        })}
      </div>

    </main>
    {planModals}
    <SalonPremiumOwnerInfoPrivacyModal
      open={privacyNoticeOpen}
      onClose={() => setPrivacyNoticeOpen(false)}
      salonName={salonName.trim() || null}
      supportEmail={partnerContactEmail || null}
      showAccountActions={false}
    />
    </>
  );
}
