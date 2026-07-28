import { useId, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { LUXURY_ACCESS_TOKEN_KEY } from "../auth/adminSession";
import {
  clearPostLoginReturnPath,
  consumePostLoginReturnPath,
  normalizePostLoginReturnPath,
  readPostLoginReturnPath,
  setPostLoginReturnPath,
  LUXURY_POST_LOGIN_RETURN_KEY,
} from "../lib/postLoginReturnPath";
import {
  isPremiumSalonRegistrationPending,
  loginReturnPathForSalonRegistration,
  PREMIUM_SALON_POST_LOGIN_PATH,
  readIntendedSalonPlanFromSession,
} from "../lib/salonRegistrationPostLogin";
import { isSalonPremiumCheckoutRequired, shouldOfferSalonPremiumCheckout } from "../lib/salonPremiumCheckoutPolicy";
import { useSalonPremiumCheckoutPolicyQuery } from "../hooks/useSalonPremiumCheckoutPolicy";
import { useBillingStatusQuery } from "../hooks/useSalonFeaturePlanTier";
import { humanizePostRegistrationAuthError } from "../utils/authErrors";
import { luxuryJwtHintsFromAccessToken } from "../lib/luxuryJwtHintsFromAccessToken";
import { hasPendingBooking } from "./PendingBookingResume";
import { LuxuryEntrySplashGate } from "./LuxuryEntrySplashGate";
import {
  scheduleLuxuryLoginFormDomClear,
  LUXURY_CLEAR_LOGIN_FORM_KEY,
  LUXURY_SESSION_ENDED_EVENT,
} from "../lib/luxuryLoginFormReset";
import {
  clearSavedLoginCredentials,
  isNativeSavedCredentialsAllowed,
  isSavedLoginEmailAllowed,
  isSavedLoginPersistenceAllowed,
  readSavedLoginCredentials,
  writeSavedLoginCredentials,
  writeSavedLoginEmail,
} from "../lib/luxurySavedLoginCredentials";

function shouldSwitchAwayFromSuperAdminSession(premiumCheckoutRequired: boolean): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const pendingReturn = sessionStorage.getItem(LUXURY_POST_LOGIN_RETURN_KEY);
  if (pendingReturn === PREMIUM_SALON_POST_LOGIN_PATH && premiumCheckoutRequired) return true;
  return isPremiumSalonRegistrationPending() && premiumCheckoutRequired;
}

function readInitialLoginFormState(): { email: string; password: string; rememberEmail: boolean } {
  const saved = readSavedLoginCredentials();
  return {
    email: saved?.email ?? "",
    password: saved?.password ?? "",
    rememberEmail: Boolean(saved),
  };
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const formId = useId();
  const emailFieldId = `${formId}-email`;
  const passFieldId = `${formId}-pass`;
  const rememberFieldId = `${formId}-remember`;
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, isLuxurySuperAdmin, isSalonTitolare, signInWithPassword, signOutForAccountSwitch } =
    useLuxuryAuth();
  const initialLoginForm = readInitialLoginFormState();
  const [email, setEmail] = useState(initialLoginForm.email);
  const [password, setPassword] = useState(initialLoginForm.password);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(initialLoginForm.rememberEmail);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginFormKey, setLoginFormKey] = useState(0);
  const checkoutPolicy = useSalonPremiumCheckoutPolicyQuery();
  const premiumCheckoutRequired = isSalonPremiumCheckoutRequired(checkoutPolicy.data);
  const billingStatus = useBillingStatusQuery();
  const checkoutAvailable = shouldOfferSalonPremiumCheckout(
    premiumCheckoutRequired,
    billingStatus.data,
  );
  const switchingSessionRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);

  const applyLoginFormDefaults = () => {
    const saved = readSavedLoginCredentials();
    if (saved) {
      setEmail(saved.email);
      setPassword(saved.password);
      setRememberEmail(true);
    } else {
      setEmail("");
      setPassword("");
      setRememberEmail(false);
    }
    setShowPassword(false);
    setError(null);
    setLoginFormKey((k) => k + 1);
  };

  const clearLoginFields = () => {
    applyLoginFormDefaults();
  };

  useEffect(() => {
    const onSessionEnded = () => clearLoginFields();
    window.addEventListener(LUXURY_SESSION_ENDED_EVENT, onSessionEnded);
    return () => window.removeEventListener(LUXURY_SESSION_ENDED_EVENT, onSessionEnded);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      clearLoginFields();
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    let shouldClear = false;
    try {
      shouldClear = sessionStorage.getItem(LUXURY_CLEAR_LOGIN_FORM_KEY) === "1";
      if (shouldClear) sessionStorage.removeItem(LUXURY_CLEAR_LOGIN_FORM_KEY);
    } catch {
      /* ignore */
    }
    if (!shouldClear) return;
    clearLoginFields();
    scheduleLuxuryLoginFormDomClear(clearLoginFields);
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isLuxurySuperAdmin) return;
    if (!shouldSwitchAwayFromSuperAdminSession(premiumCheckoutRequired)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (switchingSessionRef.current) return;
    switchingSessionRef.current = true;
    void signOutForAccountSwitch().finally(() => {
      switchingSessionRef.current = false;
    });
  }, [isAuthenticated, isLoading, isLuxurySuperAdmin, navigate, signOutForAccountSwitch, premiumCheckoutRequired]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || isLuxurySuperAdmin || !isSalonTitolare) return;
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === PREMIUM_SALON_POST_LOGIN_PATH || path === "/account/billing/success") return;
    if (!checkoutAvailable) return;
    const ret = sessionStorage.getItem(LUXURY_POST_LOGIN_RETURN_KEY);
    if (ret === PREMIUM_SALON_POST_LOGIN_PATH) {
      navigate(PREMIUM_SALON_POST_LOGIN_PATH, { replace: true });
    }
  }, [
    checkoutAvailable,
    isAuthenticated,
    isLoading,
    isSalonTitolare,
    isLuxurySuperAdmin,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const intendedPlan = readIntendedSalonPlanFromSession();
    if (intendedPlan === "PREMIUM") {
      setPostLoginReturnPath(loginReturnPathForSalonRegistration(intendedPlan, premiumCheckoutRequired));
      return;
    }
    const returnTarget = `${location.pathname}${location.search}`;
    const existing = readPostLoginReturnPath();
    if (existing && existing !== "/account" && existing !== returnTarget) return;
    if (returnTarget === "/account" && existing) return;
    setPostLoginReturnPath(returnTarget);
  }, [isAuthenticated, isLoading, location.pathname, location.search, premiumCheckoutRequired]);

  if (isLoading) {
    return (
      <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <p className="luxury-auth-loading">Accesso in corso…</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <LuxuryEntrySplashGate>
        <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <div className="luxury-auth-card-toolbar">
            <button
              type="button"
              className="luxury-auth-back"
              aria-label="Torna indietro"
              onClick={() => navigate(-1)}
            >
              <svg
                className="luxury-auth-back-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
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
          <h1 className="luxury-auth-title">Accedi</h1>
          {error ? (
            <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
              {error}
            </p>
          ) : null}
          <form
            key={loginFormKey}
            className="luxury-auth-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const u = email.trim().toLowerCase();
              if (!u || !password) {
                setError("Inserisci email e password.");
                return;
              }
              setSubmitting(true);
              void (async () => {
                try {
                  await signInWithPassword(u, password);
                  if (rememberEmail && isSavedLoginPersistenceAllowed()) {
                    writeSavedLoginCredentials(u, password);
                  } else {
                    clearSavedLoginCredentials();
                  }
                  clearLoginFields();
                  const tok =
                    typeof sessionStorage !== "undefined"
                      ? sessionStorage.getItem(LUXURY_ACCESS_TOKEN_KEY)
                      : null;
                  if (luxuryJwtHintsFromAccessToken(tok ?? undefined).realmRoles.includes("ADMIN")) {
                    const adminReturn = consumePostLoginReturnPath();
                    navigate(
                      adminReturn && adminReturn.startsWith("/admin") ? adminReturn : "/admin/dashboard",
                      { replace: true },
                    );
                    return;
                  }
                  if (hasPendingBooking()) {
                    clearPostLoginReturnPath();
                  } else {
                    const ret = consumePostLoginReturnPath();
                    if (ret && ret !== "/account") {
                      navigate(normalizePostLoginReturnPath(ret), { replace: true });
                      return;
                    }
                    const intendedPlan = readIntendedSalonPlanFromSession();
                    if (intendedPlan === "PREMIUM") {
                      navigate(PREMIUM_SALON_POST_LOGIN_PATH, { replace: true });
                      return;
                    }
                    if (ret === "/account") {
                      navigate("/account", { replace: true });
                    }
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : humanizePostRegistrationAuthError(err));
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            <div className="luxury-auth-field">
              <label htmlFor={emailFieldId} className="luxury-auth-label">
                Email
              </label>
              <input
                id={emailFieldId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={submitting}
                className="luxury-auth-input"
              />
            </div>
            <div className="luxury-auth-field">
              <label htmlFor={passFieldId} className="luxury-auth-label">
                Password
              </label>
              <div className="luxury-auth-password-wrap">
                <input
                  id={passFieldId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  disabled={submitting}
                  className="luxury-auth-input luxury-auth-input--with-toggle"
                />
                <button
                  type="button"
                  className="luxury-auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting}
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="luxury-auth-password-toggle__icon">
                      <path
                        d="M3 3l18 18M10.73 10.73a3 3 0 004.24 4.24M9.88 9.88A10.05 10.05 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.02 10.02 0 01-4.13 5.41M6.12 6.12A10.02 10.02 0 003.46 12c.77 3.95 4.26 7 8.54 7 1.05 0 2.05-.18 2.98-.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="luxury-auth-password-toggle__icon">
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
            </div>
            <div className="luxury-auth-form-extras">
              {isSavedLoginPersistenceAllowed() ? (
                <label className="luxury-auth-remember" htmlFor={rememberFieldId}>
                  <input
                    id={rememberFieldId}
                    name="remember"
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(ev) => {
                      const checked = ev.target.checked;
                      setRememberEmail(checked);
                      if (!checked) {
                        clearSavedLoginCredentials();
                      } else if (email.trim()) {
                        if (isNativeSavedCredentialsAllowed()) {
                          writeSavedLoginCredentials(email, password);
                        } else {
                          writeSavedLoginEmail(email);
                        }
                      }
                    }}
                    disabled={submitting}
                  />
                  <span>{isNativeSavedCredentialsAllowed() ? "Salva credenziali" : "Ricorda email"}</span>
                </label>
              ) : null}
              <p className="luxury-auth-recover">
                <Link className="luxury-auth-recover-link" to="/reimposta-password">
                  Password dimenticata?
                </Link>
              </p>
            </div>
            <button type="submit" className="luxury-auth-submit" disabled={submitting}>
              {submitting ? "Accesso…" : "Accedi"}
            </button>
          </form>
        </div>
      </main>
      </LuxuryEntrySplashGate>
    );
  }

  if (isAuthenticated && isLuxurySuperAdmin) {
    if (shouldSwitchAwayFromSuperAdminSession(premiumCheckoutRequired)) {
      return (
        <main className="luxury-auth-page">
          <div className="luxury-auth-card">
            <p className="luxury-auth-loading">Accedi con l&apos;account del salone per continuare…</p>
          </div>
        </main>
      );
    }
    return null;
  }

  return <>{children}</>;
}
