import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useConsumerNotificationAlerts } from "../hooks/useConsumerNotificationAlerts";

/**
 * Polling inbox cliente + popup/suono: attivo ovunque nell'app (home, ricerca, vetrina, account),
 * non solo sotto `/account` — così la conferma Accetta dell'operatore arriva subito.
 */
export function ConsumerNotificationAlertPoller() {
  const { accessToken, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  useConsumerNotificationAlerts(
    Boolean(accessToken) && !isSalonTitolare && !isSalonStaff && !isLuxurySuperAdmin,
  );
  return null;
}
