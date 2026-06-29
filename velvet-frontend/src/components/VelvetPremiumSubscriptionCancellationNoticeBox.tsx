import { SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK } from "../data/salonPlans";
import "../styles/luxury-premium-subscription-cancellation-notice.css";

type VelvetPremiumSubscriptionCancellationNoticeBoxProps = {
  /** Fine periodo Premium (ISO) — fino a questa data il profilo resta pienamente utilizzabile. */
  premiumAccessUntil?: string | null;
  /** Data prevista cancellazione profilo (ISO) se non riattiva. */
  accountDeletionScheduledAt?: string | null;
  onReactivate?: () => void;
  reactivateBusy?: boolean;
};

function formatPremiumEnd(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function VelvetPremiumSubscriptionCancellationNoticeBox({
  premiumAccessUntil,
  accountDeletionScheduledAt,
  onReactivate,
  reactivateBusy = false,
}: VelvetPremiumSubscriptionCancellationNoticeBoxProps) {
  const endLabel = premiumAccessUntil ? formatPremiumEnd(premiumAccessUntil) : null;
  const deletionLabel = accountDeletionScheduledAt ? formatPremiumEnd(accountDeletionScheduledAt) : null;

  return (
    <section className="luxury-premium-cancel-notice" aria-live="polite">
      <div className="luxury-premium-cancel-notice__glow" aria-hidden />

      <div className="luxury-premium-cancel-notice__icon-wrap" aria-hidden>
        <svg className="luxury-premium-cancel-notice__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p className="luxury-premium-cancel-notice__kicker">Disdetta registrata</p>
      <h2 className="luxury-premium-cancel-notice__title">Cosa succede al tuo profilo</h2>

      <div className="luxury-premium-cancel-notice__body">
        {endLabel ? (
          <p>
            L&apos;abbonamento Premium resta attivo fino al <strong>{endLabel}</strong>. Fino a quella data puoi
            continuare a usare il salone normalmente.
          </p>
        ) : (
          <p>
            L&apos;abbonamento Premium resterà attivo fino alla fine del periodo già pagato. Fino ad allora puoi
            continuare a usare il salone normalmente.
          </p>
        )}
        <p>
          <strong>A fine abbonamento</strong> il profilo del salone verrà <strong>bloccato</strong>: non potrai più
          gestire prenotazioni e funzioni Premium.
        </p>
        <p>
          Se non riattivi Premium entro{" "}
          <strong>{SALON_PREMIUM_ACCOUNT_DELETION_DAYS_AFTER_BLOCK} giorni dalla scadenza dell&apos;abbonamento</strong>
          {deletionLabel ? (
            <>
              {" "}
              (entro il <strong>{deletionLabel}</strong>)
            </>
          ) : null}
          , l&apos;account verrà <strong>cancellato automaticamente</strong>, secondo l&apos;informativa privacy.
        </p>
        <p>
          Puoi <strong>riattivare l&apos;abbonamento quando vuoi</strong> e tornare operativo senza perdere i dati del
          salone.
        </p>
      </div>

      {onReactivate ? (
        <div className="luxury-premium-cancel-notice__actions">
          <button
            type="button"
            className="luxury-premium-cancel-notice__cta"
            disabled={reactivateBusy}
            onClick={onReactivate}
          >
            {reactivateBusy ? "Apertura Stripe…" : "Riattiva abbonamento"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
