import { appStoreUrl, playStoreUrl } from "../config/env";
import "../styles/velvet-email-confirm-box.css";

type VelvetFreePlanAppNoticeBoxProps = {
  onClose: () => void;
  titleId?: string;
};

export function VelvetFreePlanAppNoticeBox({ onClose, titleId }: VelvetFreePlanAppNoticeBoxProps) {
  return (
    <section className="velvet-email-confirm-box velvet-free-plan-app-notice" aria-live="polite">
      <div className="velvet-email-confirm-box__glow" aria-hidden />
      <div className="velvet-email-confirm-box__icon-wrap" aria-hidden>
        <svg className="velvet-email-confirm-box__icon" viewBox="0 0 24 24" fill="none">
          <rect
            x="7"
            y="3.5"
            width="10"
            height="17"
            rx="2.2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M10 6.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="0.85" fill="currentColor" />
        </svg>
      </div>

      <p className="velvet-email-confirm-box__kicker">Piano Free</p>
      <h2 id={titleId} className="velvet-email-confirm-box__title">
        Registrati dall&apos;app
      </h2>
      <p className="velvet-email-confirm-box__lead">
        Per registrarti con il piano Free devi accedere dall&apos;app Saloni Luxury su smartphone.
      </p>

      <div className="velvet-email-confirm-box__email-row">
        <span className="velvet-email-confirm-box__email-label">Disponibile su</span>
        <strong className="velvet-email-confirm-box__email">App Store · Google Play</strong>
      </div>

      <ol className="velvet-email-confirm-box__steps">
        <li>
          Scarica <strong>Saloni Luxury</strong> sul telefono
        </li>
        <li>
          Apri l&apos;app e vai a <strong>Piani</strong>
        </li>
        <li>
          Scegli <strong>Piano Free</strong> e completa la registrazione
        </li>
      </ol>

      <div className="velvet-email-confirm-box__actions">
        <div className="velvet-free-plan-app-notice__store-row">
          <a
            href={playStoreUrl}
            className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Play
          </a>
          <a
            href={appStoreUrl}
            className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            App Store
          </a>
        </div>
        <button
          type="button"
          className="velvet-email-confirm-box__cta velvet-email-confirm-box__cta--secondary"
          onClick={onClose}
        >
          Chiudi
        </button>
      </div>
    </section>
  );
}
