import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPremiumRegistrationCheckout } from "../api/premiumRegistrationCheckout";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { writeStoredRefreshToken } from "../auth/luxuryRefreshSession";
import { SALON_OWNER_HOME_PATH } from "../lib/salonPremiumCheckoutPolicy";
import { repairNativeDevStripeReturnUrl } from "../lib/nativeAppDevHost";
import { clearPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { clearIntendedSalonPlan } from "../lib/salonRegistrationPostLogin";
import {
  readPendingEmailVerification,
  readPendingEmailVerificationAt,
  clearPendingEmailVerification,
} from "../lib/emailVerificationConfirmShared";
import { notifyPremiumRegistrationPaidCrossTab } from "../lib/premiumRegistrationPaidCrossTab";
import {
  LuxuryPremiumSubscriptionPendingBox,
  LuxuryPremiumSubscriptionSuccessBox,
} from "../components/LuxuryPremiumSubscriptionSuccessBox";

/** Pausa sul box di ringraziamento prima del profilo salone. */
export const PREMIUM_REGISTRATION_SUCCESS_HOLD_MS = 4500;

function normalizeToken(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Ritorno da Stripe dopo registrazione Premium: materializza salone, sessione e profilo. */
export default function PremiumRegistrationSuccessPage() {
  const navigate = useNavigate();
  const { signInWithIssuedToken } = useLuxuryAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() ?? "";
  const checkoutToken = useMemo(() => normalizeToken(searchParams.get("checkout_token")), [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [continueTo, setContinueTo] = useState(SALON_OWNER_HOME_PATH);
  const confirmStartedRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    repairNativeDevStripeReturnUrl();
  }, []);

  useEffect(() => {
    if (confirmStartedRef.current || !sessionId || !checkoutToken) return;
    confirmStartedRef.current = true;
    void confirmPremiumRegistrationCheckout(sessionId, checkoutToken)
      .then(async (body) => {
        if (body.refreshToken?.trim()) {
          writeStoredRefreshToken(body.refreshToken.trim());
        }
        await signInWithIssuedToken(body.accessToken);
        clearPostLoginReturnPath();
        clearIntendedSalonPlan();
        const emailForBroadcast = readPendingEmailVerification();
        const registrationAtForBroadcast = readPendingEmailVerificationAt();
        const nextPath = body.nextPath?.trim() || SALON_OWNER_HOME_PATH;
        setContinueTo(nextPath);
        if (emailForBroadcast && registrationAtForBroadcast) {
          notifyPremiumRegistrationPaidCrossTab({
            email: emailForBroadcast,
            audience: "salon",
            registrationAt: registrationAtForBroadcast,
            message: body.message?.trim() || "Pagamento completato. Il tuo salone Premium è attivo.",
            accessToken: body.accessToken,
            refreshToken: body.refreshToken ?? null,
            nextPath,
          });
        }
        clearPendingEmailVerification();
        setSuccess(true);
      })
      .catch((err: unknown) => {
        confirmStartedRef.current = false;
        setError(err instanceof Error ? err.message : "Impossibile confermare il pagamento.");
      });
  }, [checkoutToken, sessionId, signInWithIssuedToken]);

  const goToProfile = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    const path = continueTo?.trim() || SALON_OWNER_HOME_PATH;
    navigate(path, { replace: true });
  }, [continueTo, navigate]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(goToProfile, PREMIUM_REGISTRATION_SUCCESS_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [goToProfile, success]);

  if (!sessionId || !checkoutToken) {
    return <Navigate to="/piani" replace />;
  }

  return (
    <main className="luxury-auth-page luxury-billing-flow-standalone">
      <div className="luxury-auth-card">
        {error ? (
          <>
            <h1 className="luxury-auth-title">Pagamento</h1>
            <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
              {error}
            </p>
            <p className="luxury-auth-lead">
              <Link className="luxury-link-inline" to={`/registrazione/premium/checkout?token=${checkoutToken}`}>
                Riprova il pagamento
              </Link>
              {" · "}
              <Link className="luxury-link-inline" to="/">
                Home
              </Link>
            </p>
          </>
        ) : success ? (
          <LuxuryPremiumSubscriptionSuccessBox
            activationPending={false}
            continueTo={continueTo}
            onContinue={goToProfile}
          />
        ) : (
          <LuxuryPremiumSubscriptionPendingBox />
        )}
      </div>
    </main>
  );
}
