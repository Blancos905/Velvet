import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useSalonBookingRequestAlerts } from "../hooks/useSalonBookingRequestAlerts";

/** Polling inbox salone + popup/suono: attivo ovunque nell'app per titolare e operatore. */
export function SalonBookingAlertPoller() {
  const { isSalonTitolare, isSalonStaff, accessToken } = useLuxuryAuth();
  useSalonBookingRequestAlerts(Boolean(accessToken) && (isSalonTitolare || isSalonStaff));
  return null;
}
