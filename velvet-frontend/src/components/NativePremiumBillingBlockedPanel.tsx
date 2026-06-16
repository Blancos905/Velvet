import { NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE } from "../lib/nativePremiumUpgradePolicy";

type NativePremiumBillingBlockedPanelProps = {
  title?: string;
};

/** Pannello informativo al posto di Stripe Checkout / portale fatturazione in app mobile. */
export function NativePremiumBillingBlockedPanel({
  title = "Accesso alla sezione",
}: NativePremiumBillingBlockedPanelProps) {
  return (
    <div className="velvet-account-page-shell velvet-account-page-shell--narrow">
      <header className="velvet-account-page-shell__hero">
        <div className="velvet-account-page-shell__hero-inner">
          <h1 className="velvet-account-page-shell__hero-title">{title}</h1>
          <p className="velvet-account-page-shell__hero-sub">{NATIVE_PREMIUM_BILLING_BLOCKED_MESSAGE}</p>
        </div>
      </header>
    </div>
  );
}
