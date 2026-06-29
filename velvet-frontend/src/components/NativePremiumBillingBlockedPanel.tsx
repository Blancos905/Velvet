import { NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../lib/nativePremiumUpgradePolicy";

type NativePremiumBillingBlockedPanelProps = {
  title?: string;
};

/** Pannello informativo al posto di Stripe Checkout / portale fatturazione in app mobile. */
export function NativePremiumBillingBlockedPanel({
  title = "Accesso alla sezione",
}: NativePremiumBillingBlockedPanelProps) {
  return (
    <div className="luxury-account-page-shell luxury-account-page-shell--narrow">
      <header className="luxury-account-page-shell__hero">
        <div className="luxury-account-page-shell__hero-inner">
          <h1 className="luxury-account-page-shell__hero-title">{title}</h1>
          <p className="luxury-account-page-shell__hero-sub">{NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE}</p>
        </div>
      </header>
    </div>
  );
}
