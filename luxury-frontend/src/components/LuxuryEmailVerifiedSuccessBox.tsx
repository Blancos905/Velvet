import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import "../styles/luxury-email-verified-success-box.css";
import "../styles/luxury-email-confirmed-celebration.css";

type LuxuryEmailVerifiedSuccessBoxProps = {
  message?: string | null;
  loginReturnPath?: string;
  primaryCtaLabel?: string;
  /** Se impostato, il CTA primario è un pulsante (es. apre checkout Premium). */
  onPrimaryAction?: () => void;
  primaryActionBusy?: boolean;
  /** Nasconde i pulsanti (es. passo successivo gestito altrove). */
  hideActions?: boolean;
  badgeText?: string;
};

export function LuxuryEmailVerifiedSuccessBox({
  message = "Ora puoi accedere con le tue credenziali.",
  loginReturnPath = "/account",
  primaryCtaLabel = "Vai all'accesso",
  onPrimaryAction,
  primaryActionBusy = false,
  hideActions = false,
  badgeText = "Account attivo — puoi accedere",
}: LuxuryEmailVerifiedSuccessBoxProps) {
  return (
    <section className="luxury-email-verified-box" aria-live="polite">
      <div className="luxury-email-verified-box__glow" aria-hidden />
      <div className="luxury-email-verified-box__burst" aria-hidden />

      <div className="luxury-email-verified-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-verified-box__icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8 12.2l2.4 2.4L16 9.2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="luxury-email-verified-box__kicker">Tutto ok</p>
      <h2 className="luxury-email-verified-box__title">Email confermata</h2>
      {message ? <p className="luxury-email-verified-box__lead">{message}</p> : null}

      <div className="luxury-email-verified-box__badge">
        <span className="luxury-email-verified-box__badge-dot" aria-hidden />
        {badgeText}
      </div>

      {hideActions ? null : (
        <div className="luxury-email-verified-box__actions">
          {onPrimaryAction ? (
            <button
              type="button"
              className="luxury-email-verified-box__cta luxury-email-verified-box__cta--primary"
              onClick={onPrimaryAction}
              disabled={primaryActionBusy}
            >
              {primaryActionBusy ? "Apertura…" : primaryCtaLabel}
            </button>
          ) : (
            <Link
              to={loginReturnPath}
              className="luxury-email-verified-box__cta luxury-email-verified-box__cta--primary"
              onClick={() => setPostLoginReturnPath(loginReturnPath)}
            >
              {primaryCtaLabel}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function LuxuryEmailVerificationPendingBox() {
  return (
    <section className="luxury-email-verified-box luxury-email-verified-box--pending" aria-live="polite" aria-busy="true">
      <div className="luxury-email-verified-box__glow" aria-hidden />
      <div className="luxury-email-verified-box__spinner" aria-hidden />
      <p className="luxury-email-verified-box__kicker">Un attimo</p>
      <h2 className="luxury-email-verified-box__title">Verifica in corso…</h2>
      <p className="luxury-email-verified-box__lead">Stiamo confermando il tuo indirizzo email.</p>
    </section>
  );
}

const CELEBRATION_SPIN_MS = 850;
/** Pausa sulla spunta verde prima del passo successivo (registrazione / checkout). */
export const EMAIL_CONFIRMED_CELEBRATION_HOLD_MS = 5200;
const CELEBRATION_HOLD_MS = EMAIL_CONFIRMED_CELEBRATION_HOLD_MS;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type LuxuryEmailConfirmedCelebrationBoxProps = {
  /** Chiamato dopo la pausa sulla spunta (default 3 s). */
  onHoldComplete?: () => void;
  holdMs?: number;
};

/** Box verde minimale: spinner → spunta, poi callback (es. mostra checkout Premium). */
export function LuxuryEmailConfirmedCelebrationBox({
  onHoldComplete,
  holdMs = CELEBRATION_HOLD_MS,
}: LuxuryEmailConfirmedCelebrationBoxProps) {
  const [checked, setChecked] = useState(false);
  const onHoldCompleteRef = useRef(onHoldComplete);

  useEffect(() => {
    onHoldCompleteRef.current = onHoldComplete;
  }, [onHoldComplete]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const spinMs = reduced ? 0 : CELEBRATION_SPIN_MS;
    const totalMs = reduced ? Math.min(2800, holdMs) : holdMs;

    const spinTimer = window.setTimeout(() => setChecked(true), spinMs);
    const holdTimer = window.setTimeout(() => onHoldCompleteRef.current?.(), totalMs);

    return () => {
      window.clearTimeout(spinTimer);
      window.clearTimeout(holdTimer);
    };
  }, [holdMs]);

  return (
    <section
      className={`luxury-email-confirmed-celebration${checked ? " luxury-email-confirmed-celebration--checked" : ""}`}
      aria-live="polite"
      aria-busy={!checked}
    >
      <div className="luxury-email-confirmed-celebration__glow" aria-hidden />
      <div className="luxury-email-confirmed-celebration__burst" aria-hidden />
      <div className="luxury-email-confirmed-celebration__burst luxury-email-confirmed-celebration__burst--delayed" aria-hidden />
      <div className="luxury-email-confirmed-celebration__scan" aria-hidden />

      <div className="luxury-email-confirmed-celebration__icon-stage" aria-hidden>
        <div className="luxury-email-confirmed-celebration__spinner-ring" />
        <div className="luxury-email-confirmed-celebration__spinner-arc" />
        <svg className="luxury-email-confirmed-celebration__mark" viewBox="0 0 52 52" fill="none">
          <circle className="luxury-email-confirmed-celebration__mark-circle" cx="26" cy="26" r="22" />
          <path
            className="luxury-email-confirmed-celebration__mark-tick"
            d="M15 27.2l7.2 7.2L37 18.8"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="luxury-email-confirmed-celebration__title">Email confermata</h2>
    </section>
  );
}
