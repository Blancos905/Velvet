import { Link } from "react-router-dom";
import { PREMIUM_SALON_POST_LOGIN_PATH } from "../lib/salonRegistrationPostLogin";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import "../styles/velvet-email-confirm-box.css";

type VelvetRegistrationEmailConfirmBoxProps = {
  email: string;
  /** Es. «cliente» o «titolare salone» */
  accountLabel?: string;
  /** Messaggio extra (es. avviso super admin) */
  extraNote?: string | null;
  loginReturnPath?: string;
};

export function VelvetRegistrationEmailConfirmBox({
  email,
  accountLabel = "cliente",
  extraNote = null,
  loginReturnPath = "/account",
}: VelvetRegistrationEmailConfirmBoxProps) {
  const resendHref = `/conferma-email?email=${encodeURIComponent(email)}`;

  return (
    <section className="velvet-email-confirm-box" aria-live="polite">
      <div className="velvet-email-confirm-box__glow" aria-hidden />
      <div className="velvet-email-confirm-box__icon-wrap" aria-hidden>
        <svg className="velvet-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M5 7l7 5.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="velvet-email-confirm-box__kicker">Ultimo passo</p>
      <h2 className="velvet-email-confirm-box__title">Controlla la tua email</h2>
      <p className="velvet-email-confirm-box__lead">
        Ti abbiamo mandato un link per attivare l&apos;account {accountLabel}.
      </p>

      <div className="velvet-email-confirm-box__email-row">
        <span className="velvet-email-confirm-box__email-label">Inviato a</span>
        <strong className="velvet-email-confirm-box__email">{email}</strong>
      </div>

      <ol className="velvet-email-confirm-box__steps">
        <li>Apri il messaggio nella casella di posta</li>
        <li>Clicca <strong>Conferma email</strong></li>
        <li>
          {loginReturnPath === PREMIUM_SALON_POST_LOGIN_PATH
            ? "Dopo la conferma usa «Continua al pagamento» per aprire Stripe"
            : "Torna qui e accedi"}
        </li>
      </ol>

      {extraNote ? (
        <p className="velvet-email-confirm-box__extra" role="status">
          {extraNote}
        </p>
      ) : null}

      <div className="velvet-email-confirm-box__actions">
        <Link
          to={loginReturnPath}
          className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--primary"
          onClick={() => setPostLoginReturnPath(loginReturnPath)}
        >
          Vai all&apos;accesso
        </Link>
        <Link to={resendHref} className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--secondary">
          Reinvia email
        </Link>
      </div>

      <p className="velvet-email-confirm-box__hint">
        Non la trovi? Controlla spam e promozioni.
        {import.meta.env.DEV ? " In sviluppo il link compare anche nel log Spring ([Velvet conferma email])." : null}
      </p>
    </section>
  );
}
