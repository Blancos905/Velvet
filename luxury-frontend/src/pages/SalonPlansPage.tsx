import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { saveBillingProfile } from "../api/billing";
import { registerConsumerApi } from "../api/registerConsumer";
import { SaloniLuxuryLogoMark } from "../components/SaloniLuxuryLogoMark";
import { SalonPremiumPlanCardPreview } from "../components/salon/SalonPremiumPlanCardPreview";
import { SalonPlanCardTagline } from "../components/salon/SalonPlanCardTagline";
import { SalonPlanPremiumTrialPanel } from "../components/salon/SalonPlanPremiumTrialPanel";
import { SalonPremiumOwnerInfoPrivacyModal } from "../components/salon/SalonPremiumOwnerInfoPrivacyModal";
import { LuxuryEuropeanContactFields } from "../components/LuxuryEuropeanContactFields";
import { LuxuryFreePlanAppNoticeBox } from "../components/LuxuryFreePlanAppNoticeBox";
import { LuxuryRegistrationEmailConfirmSection } from "../components/LuxuryRegistrationEmailConfirmScreen";
import { LuxuryRegistrationEmailConfirmFlow } from "../components/LuxuryRegistrationEmailConfirmFlow";
import { LuxuryEmailVerifiedSuccessBox } from "../components/LuxuryEmailVerifiedSuccessBox";
import {
  SalonBillingProfileFields,
  type SalonBillingProfileFieldValues,
} from "../components/SalonBillingProfileFields";
import { partnerContactEmail } from "../config/env";
import { SALON_BUSINESS_TYPE_OPTIONS, normalizeSalonBusinessTypeIds } from "../data/salonBusinessTypes";
import { SALON_CLIENT_GENDER_OPTIONS } from "../data/salonClientGenders";
import { SALON_PLANS, premiumTrialDurationLabel, premiumTrialFreeLabel, premiumTrialLeadFootnote, parseSalonPlanTier, planDisplayName, type SalonPlanTier } from "../data/salonPlans";
import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  EUROPEAN_PHONE_COUNTRIES,
  europeanCountryByCode,
} from "../data/europeanPhonePrefixes";
import { optionalEuropeanPhoneForRegisterApi, splitStoredEuropeanPhone } from "../lib/europeanPhone";
import {
  clearIntendedSalonPlan,
  loginReturnPathForSalonRegistration,
  readIntendedSalonPlanFromSession,
  setPostLoginPathForSalonRegistration,
} from "../lib/salonRegistrationPostLogin";
import { isSalonPremiumCheckoutRequired } from "../lib/salonPremiumCheckoutPolicy";
import { useSalonPremiumCheckoutPolicyQuery } from "../hooks/useSalonPremiumCheckoutPolicy";
import { useEffectiveSalonPlanTier } from "../hooks/useEffectiveSalonPlanTier";
import { useMeProfileQuery } from "../hooks/useMeProfile";
import { useMeSalonSummaryQuery } from "../hooks/useMeSalonSummary";
import { toBillingProfilePayload, validateSalonBillingProfileForm } from "../lib/salonBillingProfileValidation";
import { isFeatureEnabled, resolveSubscriptionSurface } from "../lib/subscription-guards";
import { useLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { humanizeAuthNetworkError } from "../utils/authErrors";
import {
  clearPendingEmailVerification,
  clearSalonRegistrationPostSignupActive,
  hasPendingEmailVerification,
  isSalonRegistrationPostSignupActive,
  isValidEmailVerificationToken,
  markSalonRegistrationPostSignupActive,
  normalizeTokenFromUrl,
  persistPendingEmailVerification,
  readPendingEmailVerification,
  readPendingEmailVerificationAt,
} from "../lib/emailVerificationConfirmShared";
import "../styles/luxury-email-confirm-box.css";
import "../styles/luxury-salon-plans-register.css";
import "../styles/luxury-search-page.css";

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
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

function SalonPlansBackIcon() {
  return (
    <svg className="luxury-search-back__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SalonPlansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = normalizeTokenFromUrl(searchParams.get("token"));
  const planParam = searchParams.get("plan");
  const hasTokenConfirm = isValidEmailVerificationToken(tokenFromUrl);
  const queryClient = useQueryClient();
  const { signUpForSalon, signInWithPassword, isAuthenticated, isSalonTitolare, accessToken } = useLuxuryAuth();
  const isNativeApp = useLuxuryNativeAppShell();
  const effectivePlan = useEffectiveSalonPlanTier();
  const meProfile = useMeProfileQuery();
  const meSalon = useMeSalonSummaryQuery();
  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);
  const [modalPlan, setModalPlan] = useState<SalonPlanTier | null>(null);
  const upgradePrefillDoneRef = useRef(false);
  /** Titolare Free già registrato: form Premium = upgrade (prefill), non nuova iscrizione. */
  const isFreeOwnerPremiumUpgrade =
    isAuthenticated && isSalonTitolare && effectivePlan === "BASE" && meSalon.data?.provisioned === true;
  const [freePlanNoticeOpen, setFreePlanNoticeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [pendingVerificationAt, setPendingVerificationAt] = useState(0);
  const [registeredPlanTier, setRegisteredPlanTier] = useState<SalonPlanTier | null>(null);
  const [registrationNeedsEmailConfirm, setRegistrationNeedsEmailConfirm] = useState(true);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<string | null>(null);
  const [postSignupHeroTitle, setPostSignupHeroTitle] = useState("Controlla la tua email");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDialCode, setPhoneDialCode] = useState(
    () => europeanCountryByCode(DEFAULT_EUROPEAN_COUNTRY_CODE)?.dialCode ?? "+39",
  );
  const [phoneLocal, setPhoneLocal] = useState("");
  const [salonName, setSalonName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDpa, setAcceptDpa] = useState(false);
  const [confirmAdult16, setConfirmAdult16] = useState(false);
  const [privacyNoticeOpen, setPrivacyNoticeOpen] = useState(false);

  const [salonAddressLine1, setSalonAddressLine1] = useState("");
  const [salonPostalCode, setSalonPostalCode] = useState("");
  const [salonCity, setSalonCity] = useState("");
  const [salonProvince, setSalonProvince] = useState("");
  const [salonCountry, setSalonCountry] = useState(DEFAULT_EUROPEAN_COUNTRY_CODE);
  const [salonBusinessTypes, setSalonBusinessTypes] = useState<Set<string>>(() => new Set());
  const [salonClientGenders, setSalonClientGenders] = useState<Set<string>>(() => new Set());
  const [billingSameAsSalon, setBillingSameAsSalon] = useState(true);
  const [billing, setBilling] = useState<SalonBillingProfileFieldValues>({
    legalName: "",
    billingEmail: "",
    vatNumber: "",
    fiscalCode: "",
    subjectType: "",
    addressLine1: "",
    postalCode: "",
    city: "",
    province: "",
    country: DEFAULT_EUROPEAN_COUNTRY_CODE,
    sdiCode: "",
    pecEmail: "",
  });

  useEffect(() => {
    if (!hasTokenConfirm) return;
    const qs = new URLSearchParams({ token: tokenFromUrl, audience: "salon" });
    const plan = planParam ?? readIntendedSalonPlanFromSession();
    if (plan) qs.set("plan", plan);
    navigate(`/conferma-email?${qs.toString()}`, { replace: true });
  }, [hasTokenConfirm, tokenFromUrl, planParam, navigate]);

  /** App WebView: ripristina «Controlla email» dopo reload o ritorno da Safari/Mail. */
  useEffect(() => {
    if (!isNativeApp || !hasPendingEmailVerification()) return;

    /* Salone già attivo fuori dal flow live: pending stale → non riaprire confirm. */
    if (isAuthenticated) {
      if (meSalon.isPending) return;
      if (
        isSalonTitolare &&
        meSalon.data?.provisioned === true &&
        !isSalonRegistrationPostSignupActive() &&
        !registrationComplete
      ) {
        clearPendingEmailVerification();
        clearIntendedSalonPlan();
        return;
      }
    }

    const pendingEmail = readPendingEmailVerification();
    const pendingAt = readPendingEmailVerificationAt();
    if (!pendingEmail || !pendingAt) return;

    setRegisteredEmail((prev) => (prev.trim() ? prev : pendingEmail));
    setPendingVerificationAt((prev) => (prev > 0 ? prev : pendingAt));
    setRegistrationComplete(true);
    setRegistrationNeedsEmailConfirm(true);

    const plan = readIntendedSalonPlanFromSession();
    if (plan) {
      setRegisteredPlanTier((prev) => prev ?? plan);
    }
  }, [
    isNativeApp,
    isAuthenticated,
    isSalonTitolare,
    meSalon.isPending,
    meSalon.data?.provisioned,
    registrationComplete,
  ]);

  const formId = useId();
  const salonTypesLegendId = `${formId}-salon-types-legend`;
  const salonClientGendersLegendId = `${formId}-salon-client-genders-legend`;
  const billingLegendId = `${formId}-billing-legend`;
  const titleId = `${formId}-title`;

  const openRegistration = (tier: SalonPlanTier) => {
    setErrorHint(null);
    if (!isFeatureEnabled("owner.web.freeRegistration", tier, { surface: resolveSubscriptionSurface(isNativeApp) })) {
      setFreePlanNoticeOpen(true);
      return;
    }
    signUpForSalon(tier);
    upgradePrefillDoneRef.current = false;
    setModalPlan(tier);
    const upgrading = isAuthenticated && isSalonTitolare && effectivePlan === "BASE" && tier === "PREMIUM";
    if (upgrading) {
      /* Prefill arriva dall’effetto sotto (profilo + salone). Password non serve. */
      upgradePrefillDoneRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ["me", "salon"] });
      void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAcceptTerms(false);
      setAcceptDpa(false);
      setConfirmAdult16(false);
      return;
    }
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneDialCode(europeanCountryByCode(DEFAULT_EUROPEAN_COUNTRY_CODE)?.dialCode ?? "+39");
    setPhoneLocal("");
    setSalonName("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAcceptTerms(false);
    setAcceptDpa(false);
    setConfirmAdult16(false);
    setSalonAddressLine1("");
    setSalonPostalCode("");
    setSalonCity("");
    setSalonProvince("");
    setSalonCountry(DEFAULT_EUROPEAN_COUNTRY_CODE);
    setSalonBusinessTypes(new Set());
    setSalonClientGenders(new Set());
    setBillingSameAsSalon(true);
    setBilling({
      legalName: "",
      billingEmail: "",
      vatNumber: "",
      fiscalCode: "",
      subjectType: "",
      addressLine1: "",
      postalCode: "",
      city: "",
      province: "",
      country: DEFAULT_EUROPEAN_COUNTRY_CODE,
      sdiCode: "",
      pecEmail: "",
    });
  };

  /** Free → Premium: ripristina i campi già compilati in registrazione Free. */
  useEffect(() => {
    if (modalPlan !== "PREMIUM" || !isFreeOwnerPremiumUpgrade) return;
    if (meProfile.isPending || meSalon.isPending) return;
    const profile = meProfile.data;
    const salon = meSalon.data;
    if (!profile || !salon?.provisioned) return;

    const province = (salon.primaryLocationProvince ?? "").trim().toUpperCase();
    const businessTypes = normalizeSalonBusinessTypeIds(salon.primaryLocationSalonBusinessTypes);
    const clientGenders = (salon.primaryLocationSalonClientGenders ?? [])
      .map((g) => g.trim().toUpperCase())
      .filter((g) => SALON_CLIENT_GENDER_OPTIONS.some((o) => o.id === g));

    /* Evita di chiudere il prefill su dati incompleti (es. summary ancora senza tipologie). */
    if (upgradePrefillDoneRef.current) {
      const missingTypes = businessTypes.length > 0 && salonBusinessTypes.size === 0;
      const missingProvince = province.length > 0 && !salonProvince.trim();
      if (!missingTypes && !missingProvince) return;
    }

    upgradePrefillDoneRef.current = true;
    const names = splitDisplayName(profile.displayName);
    setFirstName(names.firstName);
    setLastName(names.lastName);
    setEmail((profile.email ?? "").trim().toLowerCase());
    const phoneParts = splitStoredEuropeanPhone(profile.phone, profile.country ?? DEFAULT_EUROPEAN_COUNTRY_CODE);
    setPhoneDialCode(phoneParts.dialCode);
    setPhoneLocal(phoneParts.localNumber);
    const country = (profile.country ?? "").trim().toUpperCase() || DEFAULT_EUROPEAN_COUNTRY_CODE;
    setSalonCountry(country);
    setSalonName((salon.primaryLocationName ?? "").trim());
    setSalonAddressLine1((salon.primaryLocationAddressLine ?? "").trim());
    setSalonPostalCode((salon.primaryLocationPostalCode ?? "").trim());
    setSalonCity((salon.primaryLocationCity ?? "").trim());
    setSalonProvince(province);
    setSalonBusinessTypes(new Set(businessTypes));
    setSalonClientGenders(new Set(clientGenders));
    setBillingSameAsSalon(true);
    setBilling({
      legalName: (salon.primaryLocationName ?? "").trim(),
      billingEmail: (profile.email ?? "").trim().toLowerCase(),
      vatNumber: "",
      fiscalCode: "",
      subjectType: "",
      addressLine1: (salon.primaryLocationAddressLine ?? "").trim(),
      postalCode: (salon.primaryLocationPostalCode ?? "").trim(),
      city: (salon.primaryLocationCity ?? "").trim(),
      province,
      country,
      sdiCode: "",
      pecEmail: "",
    });
  }, [
    modalPlan,
    isFreeOwnerPremiumUpgrade,
    meProfile.isPending,
    meProfile.data,
    meSalon.isPending,
    meSalon.data,
    salonBusinessTypes.size,
    salonProvince,
  ]);

  /** Deep link `/piani?plan=PREMIUM`: nuovo utente oppure upgrade Free già loggato (non riaprire form a caso). */
  useEffect(() => {
    if (hasTokenConfirm || registrationComplete || modalPlan != null) return;
    if (parseSalonPlanTier(planParam) !== "PREMIUM") return;
    if (isAuthenticated && !isFreeOwnerPremiumUpgrade) return;
    if (hasPendingEmailVerification()) return;
    openRegistration("PREMIUM");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link: apri il form una sola volta
  }, [hasTokenConfirm, registrationComplete, modalPlan, planParam, isAuthenticated, isFreeOwnerPremiumUpgrade]);

  /**
   * Rientro su `/piani` con salone già attivo (fuori dal flow post-signup):
   * non riaprire registrazione/confirm — vai all'hub.
   * Durante celebration / thank-you Free non navigare via (registrationComplete o flag sessione).
   */
  useEffect(() => {
    if (hasTokenConfirm) return;
    if (registrationComplete || isSalonRegistrationPostSignupActive()) return;
    if (!isAuthenticated || !isSalonTitolare || !meSalon.data?.provisioned) return;
    if (parseSalonPlanTier(planParam) === "PREMIUM" && isFreeOwnerPremiumUpgrade) return;

    clearPendingEmailVerification();
    clearSalonRegistrationPostSignupActive();
    clearIntendedSalonPlan();
    setRegistrationComplete(false);
    setRegisteredEmail("");
    setPendingVerificationAt(0);
    setRegisteredPlanTier(null);
    setRegistrationSuccessMessage(null);
    setRegistrationNeedsEmailConfirm(true);
    setModalPlan(null);
    navigate("/account/salone", { replace: true });
  }, [
    hasTokenConfirm,
    registrationComplete,
    isAuthenticated,
    isSalonTitolare,
    meSalon.data?.provisioned,
    planParam,
    isFreeOwnerPremiumUpgrade,
    navigate,
  ]);

  const patchBilling = <K extends keyof SalonBillingProfileFieldValues>(
    key: K,
    value: SalonBillingProfileFieldValues[K],
  ) => {
    setBilling((prev) => ({ ...prev, [key]: value }));
  };

  const resolveBillingForSubmit = (): SalonBillingProfileFieldValues => {
    const base = billingSameAsSalon
      ? {
          ...billing,
          legalName: billing.legalName.trim() || salonName.trim(),
          billingEmail: billing.billingEmail.trim() || email.trim().toLowerCase(),
          addressLine1: salonAddressLine1.trim(),
          postalCode: salonPostalCode.trim(),
          city: salonCity.trim(),
          province: salonProvince.trim().toUpperCase(),
          country: salonCountry.trim() || DEFAULT_EUROPEAN_COUNTRY_CODE,
        }
      : billing;
    return base;
  };

  const closeModal = () => {
    if (submitting) return;
    setShowPassword(false);
    setShowConfirmPassword(false);
    upgradePrefillDoneRef.current = false;
    setModalPlan(null);
  };
  const closeFreePlanNotice = () => {
    setFreePlanNoticeOpen(false);
  };

  const onSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalPlan == null) return;
    setErrorHint(null);
    const upgradingFreeOwner = isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM";

    /* Evitiamo di dipendere dalla validazione HTML5: con modale overlay il browser spesso non mostra il tooltip nativo
       e sembra che il pulsante «non faccia nulla». */
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorHint("Compila nome, cognome ed email.");
      return;
    }

    if (!upgradingFreeOwner) {
      if (password.length < 8) {
        setErrorHint("La password deve avere almeno 8 caratteri.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorHint("Le password non coincidono.");
        return;
      }
    }
    if (!acceptTerms) {
      setErrorHint("Per proseguire accetta i termini del servizio.");
      return;
    }
    if (!acceptDpa) {
      setErrorHint("Per proseguire accetta l'accordo sul trattamento dati (Art. 28 GDPR).");
      return;
    }
    if (!confirmAdult16) {
      setErrorHint("Per registrarti devi confermare di avere almeno 16 anni.");
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

    if (modalPlan === "PREMIUM" && premiumCheckoutRequired) {
      const billingValues = resolveBillingForSubmit();
      const billingErr = validateSalonBillingProfileForm(billingValues);
      if (billingErr) {
        setErrorHint(billingErr);
        return;
      }
    }

    setSubmitting(true);
    void (async () => {
      try {
        if (upgradingFreeOwner) {
          if (!accessToken) {
            setErrorHint("Sessione scaduta. Accedi di nuovo per passare a Premium.");
            return;
          }
          if (premiumCheckoutRequired) {
            await saveBillingProfile(accessToken, toBillingProfilePayload(resolveBillingForSubmit()));
            await queryClient.invalidateQueries({ queryKey: ["me", "billing"] });
          }
          setModalPlan(null);
          navigate("/account/billing/checkout", { replace: true });
          return;
        }

        const emailNorm = email.trim().toLowerCase();
        const billingPayload =
          modalPlan === "PREMIUM" && premiumCheckoutRequired
            ? toBillingProfilePayload(resolveBillingForSubmit())
            : undefined;
        const result = await registerConsumerApi({
          email: emailNorm,
          password,
          firstName,
          lastName,
          phone: optionalEuropeanPhoneForRegisterApi(phoneDialCode, phoneLocal),
          salonName: salonName.trim(),
          planTier: modalPlan,
          ...(modalPlan === "BASE" || modalPlan === "PREMIUM"
            ? {
                salonAddressLine1: salonAddressLine1.trim(),
                salonPostalCode: salonPostalCode.trim(),
                salonCity: salonCity.trim(),
                salonProvince: salonProvince.trim(),
                salonCountry: salonCountry.trim() || DEFAULT_EUROPEAN_COUNTRY_CODE,
                salonBusinessTypes: [...salonBusinessTypes].sort(),
                salonClientGenders: [...salonClientGenders].sort(),
              }
            : {}),
          ...(modalPlan === "PREMIUM" && billingPayload ? { billing: billingPayload } : {}),
        });
        await queryClient.invalidateQueries({ queryKey: ["orgs"] });
        await queryClient.invalidateQueries({ queryKey: ["me"] });
        setPostLoginPathForSalonRegistration(modalPlan, premiumCheckoutRequired);
        if (result.premiumCheckoutToken?.trim() && result.emailVerificationRequired === false) {
          navigate(
            `/registrazione/premium/checkout?token=${encodeURIComponent(result.premiumCheckoutToken.trim())}&start=1`,
            {
              replace: true,
            },
          );
          return;
        }
        if (result.emailVerificationRequired === false) {
          await signInWithPassword(emailNorm, password);
          navigate(loginReturnPathForSalonRegistration(modalPlan, premiumCheckoutRequired), { replace: true });
          setSubmitting(false);
          return;
        }
        setRegisteredPlanTier(modalPlan);
        setRegistrationNeedsEmailConfirm(true);
        setRegistrationSuccessMessage(result.message);
        setModalPlan(null);
        markSalonRegistrationPostSignupActive();
        setRegistrationComplete(true);
        setRegisteredEmail(emailNorm);
        setPendingVerificationAt(persistPendingEmailVerification(emailNorm));
        setErrorHint(null);
      } catch (err) {
        setErrorHint(humanizeAuthNetworkError(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const modalPlanName = modalPlan != null ? planDisplayName(modalPlan) : "";
  const showLocationSection = modalPlan === "BASE" || modalPlan === "PREMIUM";
  const wideModal = showLocationSection;

  const visiblePlans = SALON_PLANS.filter(
    (p) => !isNativeApp || p.tier === "BASE" || (p.tier === "PREMIUM" && premiumCheckoutRequired),
  );
  const displayPlans = isNativeApp
    ? [...visiblePlans].sort((a, b) => (a.tier === "PREMIUM" ? -1 : b.tier === "PREMIUM" ? 1 : 0))
    : visiblePlans;

  const planModals =
    typeof document !== "undefined"
      ? createPortal(
          <>
            {freePlanNoticeOpen ? (
              <div
                className="luxury-plans-modal-root luxury-plans-modal-root--free-notice"
                role="presentation"
                onMouseDown={(ev) => ev.target === ev.currentTarget && closeFreePlanNotice()}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`${titleId}-free-notice`}
                  onMouseDown={(ev) => ev.stopPropagation()}
                >
                  <LuxuryFreePlanAppNoticeBox
                    titleId={`${titleId}-free-notice`}
                    onClose={closeFreePlanNotice}
                  />
                </div>
              </div>
            ) : null}
            {modalPlan != null ? (
              <div
                className="luxury-plans-modal-root luxury-plans-modal-root--salon-register"
                role="presentation"
                onMouseDown={(ev) => ev.target === ev.currentTarget && closeModal()}
              >
                <section
                  className={`luxury-email-confirm-box luxury-salon-register-box${modalPlan === "PREMIUM" ? " luxury-salon-register-box--premium" : ""}${wideModal ? " luxury-salon-register-box--wide" : ""}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                  onMouseDown={(ev) => ev.stopPropagation()}
                >
                  <div className="luxury-email-confirm-box__glow" aria-hidden />
                  <button
                    type="button"
                    className="luxury-salon-register-box__close"
                    onClick={closeModal}
                    disabled={submitting}
                    aria-label="Chiudi"
                  >
                    ×
                  </button>
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
                    {isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM"
                      ? "Passaggio a Premium"
                      : "Registrazione titolare"}
                  </p>
                  <h2 id={titleId} className="luxury-email-confirm-box__title">
                    Piano {modalPlanName}
                  </h2>
                  {isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM" ? (
                    <p className="luxury-email-confirm-box__lead" style={{ marginBottom: "1rem" }}>
                      Abbiamo ripreso i dati della registrazione Free. Controlla, completa fatturazione e provincia sede,
                      poi continua al pagamento.
                    </p>
                  ) : null}
                  <form className="luxury-salon-register-box__form luxury-plans-modal__form" noValidate onSubmit={onSubmitRegistration}>
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
                        disabled={submitting || (isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM")}
                      />
                    </label>
                    <LuxuryEuropeanContactFields
                      countryCode={salonCountry}
                      onCountryCodeChange={setSalonCountry}
                      dialCode={phoneDialCode}
                      onDialCodeChange={setPhoneDialCode}
                      phoneLocal={phoneLocal}
                      onPhoneLocalChange={setPhoneLocal}
                      disabled={submitting}
                      showCountryField={false}
                      prefixSelectId={`${formId}-phone-prefix`}
                      phoneInputId={`${formId}-phone-local`}
                    />
                    <label className="luxury-plans-field luxury-plans-field--full">
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
                          className="luxury-plans-fieldset luxury-plans-salon-types luxury-plans-field--full"
                          aria-labelledby={salonTypesLegendId}
                        >
                          <legend id={salonTypesLegendId} className="luxury-plans-salon-types__legend">
                            Di che salone si tratta?
                          </legend>
                          <div className="luxury-plans-salon-types__chips">
                            {SALON_BUSINESS_TYPE_OPTIONS.map((opt) => {
                              const selected = salonBusinessTypes.has(opt.id);
                              return (
                                <label
                                  key={opt.id}
                                  className={`luxury-plans-salon-type-chip${selected ? " luxury-plans-salon-type-chip--selected" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="luxury-plans-salon-type-chip__check"
                                    checked={selected}
                                    disabled={submitting}
                                    onChange={() => {
                                      setSalonBusinessTypes((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(opt.id)) next.delete(opt.id);
                                        else next.add(opt.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <fieldset
                          className="luxury-plans-fieldset luxury-plans-salon-types luxury-plans-field--full"
                          aria-labelledby={salonClientGendersLegendId}
                        >
                          <legend id={salonClientGendersLegendId} className="luxury-plans-salon-types__legend">
                            Per chi è il salone?
                          </legend>
                          <div className="luxury-plans-salon-types__chips">
                            {SALON_CLIENT_GENDER_OPTIONS.map((opt) => {
                              const selected = salonClientGenders.has(opt.id);
                              return (
                                <label
                                  key={opt.id}
                                  className={`luxury-plans-salon-type-chip${selected ? " luxury-plans-salon-type-chip--selected" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="luxury-plans-salon-type-chip__check"
                                    checked={selected}
                                    disabled={submitting}
                                    onChange={() => {
                                      setSalonClientGenders((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(opt.id)) next.delete(opt.id);
                                        else next.add(opt.id);
                                        return next;
                                      });
                                    }}
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <label className="luxury-plans-field luxury-plans-field--full">
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
                        <label className="luxury-plans-field">
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
                        <label className="luxury-plans-field">
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
                        <label className="luxury-plans-field">
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
                        <label className="luxury-plans-field">
                          <span>Paese</span>
                          <select
                            name="salonCountry"
                            className="luxury-eu-contact-select"
                            value={salonCountry || DEFAULT_EUROPEAN_COUNTRY_CODE}
                            onChange={(ev) => {
                              const nextCode = ev.target.value;
                              setSalonCountry(nextCode);
                              const country = europeanCountryByCode(nextCode);
                              if (country) setPhoneDialCode(country.dialCode);
                            }}
                            disabled={submitting}
                            autoComplete="country"
                          >
                            {EUROPEAN_PHONE_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name} ({c.code})
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : null}

                    {modalPlan === "PREMIUM" && premiumCheckoutRequired ? (
                      <>
                        <label className="luxury-plans-field luxury-plans-field--full luxury-plans-field--check">
                          <input
                            type="checkbox"
                            checked={billingSameAsSalon}
                            onChange={(ev) => setBillingSameAsSalon(ev.target.checked)}
                            disabled={submitting}
                          />
                          <span>Usa lo stesso indirizzo della sede per la fatturazione</span>
                        </label>
                        <SalonBillingProfileFields
                          legendId={billingLegendId}
                          variant="register"
                          disabled={submitting}
                          disableAddressFields={billingSameAsSalon}
                          values={
                            billingSameAsSalon
                              ? {
                                  ...billing,
                                  legalName: billing.legalName.trim() || salonName.trim(),
                                  billingEmail: billing.billingEmail.trim() || email.trim().toLowerCase(),
                                  addressLine1: salonAddressLine1.trim(),
                                  postalCode: salonPostalCode.trim(),
                                  city: salonCity.trim(),
                                  province: salonProvince.trim().toUpperCase(),
                                  country: salonCountry.trim() || DEFAULT_EUROPEAN_COUNTRY_CODE,
                                }
                              : billing
                          }
                          onChange={patchBilling}
                        />
                      </>
                    ) : null}

                    {!(isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM") ? (
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
                    ) : null}
                    <div className="luxury-plans-privacy-terms luxury-plans-field--full">
                      <label className="luxury-plans-field luxury-plans-field--check">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(ev) => setAcceptTerms(ev.target.checked)}
                          disabled={submitting}
                        />
                        <span>
                          Dichiaro di aver letto e accetto i{" "}
                          <Link to="/termini" className="luxury-link-inline" target="_blank" rel="noopener noreferrer">
                            termini di servizio
                          </Link>{" "}
                          e l&apos;
                          <Link to="/privacy" className="luxury-link-inline" target="_blank" rel="noopener noreferrer">
                            informativa privacy
                          </Link>
                          .
                        </span>
                      </label>
                      <label className="luxury-plans-field luxury-plans-field--check">
                        <input
                          type="checkbox"
                          checked={acceptDpa}
                          onChange={(ev) => setAcceptDpa(ev.target.checked)}
                          disabled={submitting}
                        />
                        <span>
                          In qualità di titolare del salone, accetto l&apos;
                          <Link
                            to="/legale/accordo-trattamento"
                            className="luxury-link-inline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            accordo sul trattamento dei dati (Art. 28 GDPR)
                          </Link>{" "}
                          per i dati dei miei clienti trattati tramite Saloni Luxury.
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
                        onClick={() => setPrivacyNoticeOpen(true)}
                        disabled={submitting}
                      >
                        Leggi info e privacy
                      </button>
                    </div>
                    {errorHint ? (
                      <p className="luxury-alert luxury-alert--error luxury-salon-register-box__alert" role="alert">
                        {errorHint}
                      </p>
                    ) : null}
                    <div className="luxury-salon-register-box__actions luxury-email-confirm-box__actions">
                      <button
                        type="button"
                        className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--secondary"
                        onClick={closeModal}
                        disabled={submitting}
                      >
                        Annulla
                      </button>
                      <button
                        type="submit"
                        className="luxury-email-confirm-box__cta luxury-email-confirm-box__cta--primary"
                        disabled={submitting}
                      >
                        {submitting
                          ? isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM"
                            ? "Salvataggio…"
                            : "Creazione account…"
                          : isFreeOwnerPremiumUpgrade && modalPlan === "PREMIUM"
                            ? "Continua a Premium"
                            : "Crea account e continua"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}
          </>,
          document.body
        )
      : null;

  if (hasTokenConfirm) {
    return (
      <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <p className="luxury-auth-loading">Apertura conferma email…</p>
        </div>
      </main>
    );
  }

  const showPostSignupFlow =
    registrationNeedsEmailConfirm &&
    (registrationComplete ||
      isSalonRegistrationPostSignupActive() ||
      (isNativeApp && hasPendingEmailVerification()));
  const emailConfirmPlan = parseSalonPlanTier(planParam) ?? registeredPlanTier ?? undefined;
  const displayEmail =
    registeredEmail || readPendingEmailVerification() || searchParams.get("email")?.trim().toLowerCase() || "";
  const registrationAt = pendingVerificationAt || readPendingEmailVerificationAt();

  const returnToSalonPlanSelection = () => {
    clearPendingEmailVerification();
    setRegistrationComplete(false);
    setRegisteredEmail("");
    setPendingVerificationAt(0);
    setRegisteredPlanTier(null);
    setRegistrationSuccessMessage(null);
    setPostSignupHeroTitle("Controlla la tua email");
    setErrorHint(null);
    setModalPlan(null);
    if (searchParams.toString()) {
      navigate("/piani", { replace: true });
    }
  };

  const plansBackRow = showPostSignupFlow ? (
    <div className="luxury-search-back-row">
      <button
        type="button"
        className="luxury-search-back"
        aria-label="Torna alla scelta piani"
        onClick={returnToSalonPlanSelection}
      >
        <SalonPlansBackIcon />
        Torna indietro
      </button>
    </div>
  ) : (
    <div className="luxury-search-back-row">
      <Link to="/" className="luxury-search-back" aria-label="Indietro alla home">
        <SalonPlansBackIcon />
        Indietro
      </Link>
    </div>
  );

  return (
    <>
    <main className="luxury-page-main luxury-search-page luxury-plans-page">
      {isNativeApp ? (
        <div className="luxury-app-plans-top-row" aria-label="Navigazione e brand">
          {plansBackRow}
          {!showPostSignupFlow ? <SaloniLuxuryLogoMark variant="hero" /> : null}
        </div>
      ) : (
        plansBackRow
      )}

      <header className="luxury-search-hero">
        <div className="luxury-search-hero__glow" aria-hidden />
        {!showPostSignupFlow ? (
          <>
            {!isNativeApp ? <SaloniLuxuryLogoMark variant="hero" /> : null}
            {!isNativeApp ? <p className="luxury-plans-page__kicker">Per titolari e saloni</p> : null}
            <h1 className="luxury-page-title">
              <span className="luxury-search-hero__title-text">
                {showPostSignupFlow || registrationComplete
                  ? "Registrazione completata"
                  : "Scegli il piano e registrati"}
              </span>
            </h1>
            {!isNativeApp && !registrationComplete ? (
              <div className="luxury-plans-page__lead-box">
                <div className="luxury-plans-page__lead-glow" aria-hidden />
                <p className="luxury-plans-page__lead-eyebrow">
                  <span className="luxury-plans-page__lead-badge">{premiumTrialFreeLabel()}</span>
                  <span className="luxury-plans-page__lead-eyebrow-text">Prova Premium senza rischio</span>
                </p>
                <p className="luxury-plans-page__lead">
                  Metti online il tuo salone con <strong>sito dedicato</strong> e <strong>galleria servizi</strong>: tieni
                  le <strong>statistiche</strong> sotto controllo e gestisci lo <strong>staff</strong> da un unico pannello.
                </p>
                <p className="luxury-plans-page__lead-note">{premiumTrialLeadFootnote()}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </header>

      {errorHint && !showPostSignupFlow ? (
        <p className="luxury-alert luxury-alert--error" role="alert">
          {errorHint}
        </p>
      ) : null}
      {showPostSignupFlow ? (
        <LuxuryRegistrationEmailConfirmSection
          heroTitle={postSignupHeroTitle}
          errorHint={errorHint}
          email={displayEmail}
          accountLabel="titolare salone"
          loginReturnPath={loginReturnPathForSalonRegistration(emailConfirmPlan, premiumCheckoutRequired)}
          onEmailCorrected={setRegisteredEmail}
          confirmContent={
            <LuxuryRegistrationEmailConfirmFlow
              email={displayEmail}
              accountLabel="titolare salone"
              loginReturnPath={loginReturnPathForSalonRegistration(emailConfirmPlan, premiumCheckoutRequired)}
              onEmailCorrected={setRegisteredEmail}
              onBackToPlans={returnToSalonPlanSelection}
              tokenFromUrl={tokenFromUrl}
              planParam={planParam}
              audience="salon"
              registrationAt={registrationAt}
              thankYouMessage={registrationSuccessMessage}
              onHeroTitleChange={setPostSignupHeroTitle}
              listenForCrossTab={showPostSignupFlow && !hasTokenConfirm}
              surface="registrationTab"
            />
          }
        />
      ) : registrationComplete ? (
        <div className="luxury-plans-wrap" style={{ maxWidth: "520px", margin: "0 auto 1.5rem" }}>
          <LuxuryEmailVerifiedSuccessBox
              message={
                registrationSuccessMessage ??
                (registeredPlanTier === "PREMIUM"
                  ? premiumCheckoutRequired
                    ? "Salone registrato. Conferma il metodo di pagamento per attivare Premium."
                    : "Salone registrato. Accedi per iniziare con Premium."
                  : "Salone registrato. Accedi con le credenziali del salone.")
              }
              loginReturnPath={loginReturnPathForSalonRegistration(
                registeredPlanTier ?? undefined,
                premiumCheckoutRequired,
              )}
              primaryCtaLabel={
                registeredPlanTier === "PREMIUM"
                  ? !premiumCheckoutRequired
                    ? "Vai al tuo salone"
                    : "Conferma metodo di pagamento"
                  : "Vai all'accesso"
              }
            />
        </div>
      ) : (
      <div className="luxury-plans-grid">
        {displayPlans.map((p) => {
          const name = planDisplayName(p.tier);
          return (
            <article
              key={p.tier}
              data-tier={p.tier}
              className={`luxury-plan-card${p.highlighted ? " luxury-plan-card--featured" : ""}`}
            >
              <h2 className="luxury-plan-card__name">{name}</h2>
              {p.tier === "PREMIUM" ? (
                <SalonPlanPremiumTrialPanel plan={p} variant="card" />
              ) : (
                <div
                  className="luxury-plan-card__price-block"
                  aria-label={[p.priceHint, p.pricePeriod].filter(Boolean).join(". ")}
                >
                  <div className="luxury-plan-card__price-orbit" aria-hidden />
                  <div className="luxury-plan-card__price-row">
                    {p.priceValue != null && p.priceValue !== "" ? (
                      <>
                        <span className="luxury-plan-card__price-value">{p.priceValue}</span>
                        <span className="luxury-plan-card__price-euro">€</span>
                      </>
                    ) : (
                      <span className="luxury-plan-card__price-value luxury-plan-card__price-value--label">{p.priceHint}</span>
                    )}
                  </div>
                  {p.pricePeriod != null && p.pricePeriod.length > 0 ? (
                    <p className="luxury-plan-card__price-period">{p.pricePeriod}</p>
                  ) : null}
                </div>
              )}
              <SalonPlanCardTagline tier={p.tier} content={p.taglineContent} />
              {p.tier === "PREMIUM" ? (
                <SalonPremiumPlanCardPreview />
              ) : (
                <ul className="luxury-plan-card__list">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <button type="button" className="luxury-plan-cta" onClick={() => openRegistration(p.tier)}>
                <span className="luxury-plan-card__cta-line">
                  {p.tier === "PREMIUM" ? (
                    <>
                      <span className="luxury-plan-card__cta-lead">Prova gratis</span>{" "}
                      <span className="luxury-plan-card__cta-mid">{premiumTrialDurationLabel()}</span>{" "}
                      <span className="luxury-plan-card__cta-plan">{name}</span>
                    </>
                  ) : (
                    <>
                      <span className="luxury-plan-card__cta-lead">Registrati</span>{" "}
                      <span className="luxury-plan-card__cta-mid">gratis</span>{" "}
                      <span className="luxury-plan-card__cta-plan">{name}</span>
                    </>
                  )}
                </span>
              </button>
            </article>
          );
        })}
      </div>
      )}

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
