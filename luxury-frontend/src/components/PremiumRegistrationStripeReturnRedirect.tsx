import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

/** Se Stripe reindirizza con session_id + checkout_token su un path diverso, apri la pagina di ringraziamento. */
export function PremiumRegistrationStripeReturnRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id")?.trim();
    const checkoutToken = searchParams.get("checkout_token")?.trim();
    if (!sessionId || !checkoutToken) {
      return;
    }
    if (location.pathname === "/registrazione/premium/success") {
      return;
    }
    const params = new URLSearchParams({
      session_id: sessionId,
      checkout_token: checkoutToken,
    });
    navigate(`/registrazione/premium/success?${params.toString()}`, { replace: true });
  }, [location.pathname, navigate, searchParams]);

  return null;
}
