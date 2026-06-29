import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK } from "../data/salonPlans";
import "../styles/luxury-premium-subscription-cancellation-thankyou-modal.css";

type VelvetPremiumSubscriptionCancellationThankYouModalProps = {
  open: boolean;
  premiumAccessUntil?: string | null;
  accountDeletionScheduledAt?: string | null;
  onClose: () => void;
};

function formatItalianDate(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VelvetPremiumSubscriptionCancellationThankYouModal({
  open,
  premiumAccessUntil,
  accountDeletionScheduledAt,
  onClose,
}: VelvetPremiumSubscriptionCancellationThankYouModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const accessUntilLabel = premiumAccessUntil ? formatItalianDate(premiumAccessUntil) : null;
  const deletionLabel = accountDeletionScheduledAt ? formatItalianDate(accountDeletionScheduledAt) : null;

  return createPortal(
    <div
      className="luxury-premium-cancel-thankyou__backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="luxury-premium-cancel-thankyou__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="luxury-premium-cancel-thankyou__glow" aria-hidden />

        <button
          type="button"
          className="luxury-premium-cancel-thankyou__close"
          onClick={onClose}
          aria-label="Chiudi"
        >
          ×
        </button>

        <div className="luxury-premium-cancel-thankyou__icon-wrap" aria-hidden>
          <svg className="luxury-premium-cancel-thankyou__icon" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="luxury-premium-cancel-thankyou__kicker">Disdetta registrata</p>
        <h2 id={titleId} className="luxury-premium-cancel-thankyou__title">
          Grazie, abbiamo confermato la tua richiesta
        </h2>
        <p className="luxury-premium-cancel-thankyou__lead">
          La disdetta dell&apos;abbonamento Premium è stata accettata. Ecco cosa succede adesso al tuo salone.
        </p>

        <ol className="luxury-premium-cancel-thankyou__timeline" aria-label="Prossimi passaggi">
          <li className="luxury-premium-cancel-thankyou__step luxury-premium-cancel-thankyou__step--active">
            <span className="luxury-premium-cancel-thankyou__step-marker" aria-hidden />
            <div className="luxury-premium-cancel-thankyou__step-body">
              <p className="luxury-premium-cancel-thankyou__step-label">Adesso</p>
              <p className="luxury-premium-cancel-thankyou__step-text">
                Il profilo resta <strong>pienamente attivo</strong> con tutte le funzioni Premium.
              </p>
            </div>
          </li>
          <li className="luxury-premium-cancel-thankyou__step">
            <span className="luxury-premium-cancel-thankyou__step-marker" aria-hidden />
            <div className="luxury-premium-cancel-thankyou__step-body">
              <p className="luxury-premium-cancel-thankyou__step-label">
                {accessUntilLabel ? `Fino al ${accessUntilLabel}` : "Fino a fine abbonamento"}
              </p>
              <p className="luxury-premium-cancel-thankyou__step-text">
                Puoi continuare a gestire prenotazioni, staff e vetrina come fino a oggi.
              </p>
            </div>
          </li>
          <li className="luxury-premium-cancel-thankyou__step">
            <span className="luxury-premium-cancel-thankyou__step-marker" aria-hidden />
            <div className="luxury-premium-cancel-thankyou__step-body">
              <p className="luxury-premium-cancel-thankyou__step-label">Dopo la scadenza</p>
              <p className="luxury-premium-cancel-thankyou__step-text">
                Il profilo verrà <strong>bloccato</strong> sulle funzioni Premium. Avrai{" "}
                <strong>{SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK} giorni</strong> per riattivare l&apos;abbonamento.
              </p>
            </div>
          </li>
          <li className="luxury-premium-cancel-thankyou__step luxury-premium-cancel-thankyou__step--final">
            <span className="luxury-premium-cancel-thankyou__step-marker" aria-hidden />
            <div className="luxury-premium-cancel-thankyou__step-body">
              <p className="luxury-premium-cancel-thankyou__step-label">
                {deletionLabel ? `Entro il ${deletionLabel}` : "Se non riattivi"}
              </p>
              <p className="luxury-premium-cancel-thankyou__step-text">
                Senza riattivazione, il profilo del salone sarà <strong>cancellato automaticamente</strong>, come da
                informativa privacy.
              </p>
            </div>
          </li>
        </ol>

        <p className="luxury-premium-cancel-thankyou__hint">
          Puoi riattivare Premium in qualsiasi momento dal profilo, prima della scadenza o durante i{" "}
          {SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK} giorni successivi.
        </p>

        <button type="button" className="luxury-premium-cancel-thankyou__cta" onClick={onClose}>
          Ho capito
        </button>
      </div>
    </div>,
    document.body,
  );
}
