type NativePremiumBillingBlockedPanelProps = {
  title?: string;
  message?: string;
};

/** Pannello informativo legacy — il billing nativo è abilitato; mantenuto per compatibilità. */
export function NativePremiumBillingBlockedPanel({
  title = "Accesso alla sezione",
  message = "Impossibile aprire il pagamento in questo momento. Riprova tra qualche istante o contatta l'assistenza.",
}: NativePremiumBillingBlockedPanelProps) {
  return (
    <div className="luxury-account-page-shell luxury-account-page-shell--narrow">
      <header className="luxury-account-page-shell__hero">
        <div className="luxury-account-page-shell__hero-inner">
          <h1 className="luxury-account-page-shell__hero-title">{title}</h1>
          <p className="luxury-account-page-shell__hero-sub">{message}</p>
        </div>
      </header>
    </div>
  );
}
