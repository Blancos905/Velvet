import { LEGAL_CONTACT_EMAIL } from "../content/legalReferences";
import { isVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";

/** Messaggio neutro in-app: nessun riferimento a pagamenti esterni, Stripe o acquisto sul web (Apple 3.1.1). */
export const NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE =
  `Questo account non dispone di licenze attive per l'accesso a questa sezione. Se fai parte di un'organizzazione, contatta l'amministratore del sistema all'indirizzo ${LEGAL_CONTACT_EMAIL}.`;

/** Paywall funzioni non incluse nel piano Free (stesso tono neutro, senza anti-steering). */
export const NATIVE_PREMIUM_FEATURE_BLOCKED_MESSAGE =
  "Questa sezione non è disponibile con la configurazione attuale del tuo account. Per assistenza contatta l'amministratore del sistema.";

/** True nella shell Flutter WebView (User-Agent custom o canale nativo). */
export function isNativePremiumBillingBlocked(): boolean {
  return isVelvetNativeAppShell();
}
