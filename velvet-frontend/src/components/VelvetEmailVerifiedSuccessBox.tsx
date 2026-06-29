import { Link } from "react-router-dom";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import "../styles/luxury-email-verified-success-box.css";

type VelvetEmailVerifiedSuccessBoxProps = {
  message?: string | null;
  loginReturnPath?: string;
  primaryCtaLabel?: string;
};

export function VelvetEmailVerifiedSuccessBox({
  message = "Ora puoi accedere con le tue credenziali.",
  loginReturnPath = "/account",
  primaryCtaLabel = "Vai all'accesso",
}: VelvetEmailVerifiedSuccessBoxProps) {
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
        Account attivo — puoi accedere
      </div>

      <div className="luxury-email-verified-box__actions">
        <Link
          to={loginReturnPath}
          className="luxury-email-verified-box__cta luxury-email-verified-box__cta--primary"
          onClick={() => setPostLoginReturnPath(loginReturnPath)}
        >
          {primaryCtaLabel}
        </Link>
        <Link to="/" className="luxury-email-verified-box__cta luxury-email-verified-box__cta--secondary">
          Torna alla home
        </Link>
      </div>
    </section>
  );
}

export function VelvetEmailVerificationPendingBox() {
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
