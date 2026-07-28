import { LuxuryPremiumCheckoutPromptPanel } from "./LuxuryPremiumCheckoutPromptPanel";
import "../styles/luxury-premium-checkout-prompt-modal.css";

type LuxuryPremiumCheckoutPromptModalProps = {
  open: boolean;
  onContinue: () => void;
  busy?: boolean;
  error?: string | null;
};

/** Popup post-conferma email titolare Premium: un passo prima di Stripe Checkout. */
export function LuxuryPremiumCheckoutPromptModal({
  open,
  onContinue,
  busy = false,
  error = null,
}: LuxuryPremiumCheckoutPromptModalProps) {
  if (!open) return null;

  return (
    <div className="luxury-plans-modal-root luxury-premium-checkout-prompt-root" role="presentation">
      <LuxuryPremiumCheckoutPromptPanel onContinue={onContinue} busy={busy} error={error} />
    </div>
  );
}
