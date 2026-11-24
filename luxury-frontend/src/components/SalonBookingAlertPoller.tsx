import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useSalonBookingRequestAlerts } from "../hooks/useSalonBookingRequestAlerts";
import { currentSurface, readSurfaceLocation } from "../lib/luxurySurfaces";

/** Polling inbox salone + popup/suono: solo nel pannello, mai sulla home clienti. */
export function SalonBookingAlertPoller() {
  const { isSalonTitolare, isSalonStaff, accessToken } = useLuxuryAuth();
  const onClientHome = currentSurface(readSurfaceLocation()) === "public";
  useSalonBookingRequestAlerts(Boolean(accessToken) && (isSalonTitolare || isSalonStaff) && !onClientHome);
  return null;
}
