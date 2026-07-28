import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { startPremiumRegistrationCheckout } from "../api/premiumRegistrationCheckout";
import { LuxuryPremiumCheckoutPromptModal } from "../components/LuxuryPremiumCheckoutPromptModal";
import { RouteLoadingFallback } from "../components/RouteLoadingFallback";

function normalizeToken(raw: string | null): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

/** Checkout Stripe per registrazione Premium prima che esista un account in DB. */
export default function PremiumRegistrationCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => normalizeToken(searchParams.get("token")), [searchParams]);
  const autostart = searchParams.get("start") === "1";
  const hasValidToken = token.length === 64 && /^[a-f0-9]+$/.test(token);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const autostartAttemptedRef = useRef(false);

  const goToStripe = useCallback(() => {
    if (!hasValidToken) {
      setCheckoutError("Link di pagamento non valido. Ripeti la registrazione da /piani.");
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError(null);
    void startPremiumRegistrationCheckout(token).catch((err: unknown) => {
      setCheckoutBusy(false);
      setCheckoutError(err instanceof Error ? err.message : "Impossibile aprire il pagamento.");
    });
  }, [hasValidToken, token]);

  useEffect(() => {
    if (!autostart || !hasValidToken || autostartAttemptedRef.current) {
      return;
    }
    autostartAttemptedRef.current = true;
    goToStripe();
  }, [autostart, goToStripe, hasValidToken]);

  if (!hasValidToken) {
    return (
      <main className="luxury-auth-page">
        <div className="luxury-auth-card">
          <div className="luxury-auth-card-toolbar">
            <button type="button" className="luxury-auth-back" aria-label="Torna alla home" onClick={() => navigate("/")}>
              <span>Home</span>
            </button>
          </div>
          <h1 className="luxury-auth-title">Pagamento Premium</h1>
          <p className="luxury-alert luxury-alert--error luxury-auth-alert" role="alert">
            Link di pagamento non valido. Ripeti la registrazione da /piani.
          </p>
          <p className="luxury-auth-lead">
            <Link className="luxury-link-inline" to="/piani">
              Torna ai piani
            </Link>
            {" · "}
            <Link className="luxury-link-inline" to="/">
              Home
            </Link>
          </p>
        </div>
      </main>
    );
  }

  if (checkoutBusy && !checkoutError) {
    return (
      <main className="luxury-auth-page">
        <RouteLoadingFallback />
      </main>
    );
  }

  return (
    <main className="luxury-auth-page">
      <LuxuryPremiumCheckoutPromptModal
        open
        busy={checkoutBusy}
        error={checkoutError}
        onContinue={goToStripe}
      />
      <div className="luxury-auth-card" aria-hidden={checkoutBusy}>
        <h1 className="luxury-auth-title">Pagamento Premium</h1>
        <p className="luxury-auth-lead">Completa il pagamento per attivare il salone Premium.</p>
      </div>
    </main>
  );
}
