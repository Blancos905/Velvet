import "../styles/luxury-email-verified-success-box.css";
import { useLuxuryT } from "../i18n/useLuxuryLocale";

/** Pagina minimale aperta dal link nell'email: niente checkout o login, solo istruzioni per tornare alla registrazione. */
export function LuxuryEmailLinkConfirmSuccessBox() {
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
      <p className="luxury-email-verified-box__lead">
        Torna alla pagina precedente per continuare con i passaggi successivi.
      </p>

      <div className="luxury-email-verified-box__badge">
        <span className="luxury-email-verified-box__badge-dot" aria-hidden />
        Puoi chiudere questa scheda
      </div>
    </section>
  );
}

/** Link email scaduto o già usato: stesso riquadro della conferma, senza tasti. */
export function LuxuryEmailLinkInvalidBox({ alreadyUsed }: { alreadyUsed: boolean }) {
  const t = useLuxuryT();

  return (
    <section className="luxury-email-verified-box luxury-email-verified-box--invalid" role="alert">
      <div className="luxury-email-verified-box__glow" aria-hidden />
      <div className="luxury-email-verified-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-verified-box__icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="luxury-email-verified-box__kicker">{t("auth.emailLink.invalidKicker")}</p>
      <h2 className="luxury-email-verified-box__title">{t("auth.emailLink.invalidTitle")}</h2>
      <p className="luxury-email-verified-box__lead">{t("auth.emailLink.invalidLead")}</p>
      {alreadyUsed ? <p className="luxury-email-verified-box__lead">{t("auth.emailLink.invalidAlready")}</p> : null}
      <div className="luxury-email-verified-box__badge">
        <span className="luxury-email-verified-box__badge-dot" aria-hidden />
        {t("auth.emailLink.invalidClose")}
      </div>
    </section>
  );
}

/** Reinvio del link di registrazione: stesso riquadro della conferma. */
export function LuxuryEmailResentBox() {
  const t = useLuxuryT();

  return (
    <section className="luxury-email-verified-box luxury-email-verified-box--sent" role="status">
      <div className="luxury-email-verified-box__glow" aria-hidden />
      <div className="luxury-email-verified-box__icon-wrap" aria-hidden>
        <svg className="luxury-email-verified-box__icon" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5v-11z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M5 7l7 5.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="luxury-email-verified-box__kicker">{t("auth.emailLink.resentKicker")}</p>
      <h2 className="luxury-email-verified-box__title">{t("auth.emailLink.resentTitle")}</h2>
      <p className="luxury-email-verified-box__lead">{t("auth.emailLink.resentLead")}</p>
      <div className="luxury-email-verified-box__badge">
        <span className="luxury-email-verified-box__badge-dot" aria-hidden />
        {t("auth.emailLink.resentHint")}
      </div>
    </section>
  );
}
