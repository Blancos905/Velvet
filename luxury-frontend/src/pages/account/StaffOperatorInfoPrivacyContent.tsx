import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { LEGAL_PRIVACY_EMAIL } from "../../content/legalReferences";
import { LEGAL_STAFF_PROCESSING_ROLES_PARAGRAPH } from "../../content/legalSharedCopy";
import { PrivacyPolicyStaffLayeredContent } from "../legal/PrivacyPolicyStaffLayeredContent";

type StaffOperatorInfoPrivacyContentProps = {
  supportEmail?: string | null;
  salonName?: string | null;
};

export function StaffOperatorInfoPrivacyContent({
  supportEmail,
  salonName,
}: StaffOperatorInfoPrivacyContentProps) {
  const [view, setView] = useState<"account" | "gdpr">("account");
  const baseId = useId();
  const accountTabId = `${baseId}-tab-account`;
  const gdprTabId = `${baseId}-tab-gdpr`;
  const accountPanelId = `${baseId}-panel-account`;
  const gdprPanelId = `${baseId}-panel-gdpr`;
  const contactEmail = supportEmail?.trim() || "assistenza@saloniluxury.it";
  const namedSalon = salonName?.trim();

  return (
    <article
      className="luxury-info-privacy-consumer-card luxury-info-privacy-consumer-card--staff luxury-surface-card"
      aria-label="Informativa privacy operatore"
    >
      <div className="luxury-info-privacy-consumer-card__glow" aria-hidden />
      <header className="luxury-info-privacy-consumer-card__head">
        <h2 className="luxury-info-privacy-consumer-card__headline">Trattamento dati e documenti</h2>
        <div
          className="luxury-info-privacy-consumer-card__toggle"
          role="tablist"
          aria-label="Vista informativa privacy operatore"
        >
          <button
            type="button"
            role="tab"
            id={accountTabId}
            aria-selected={view === "account"}
            aria-controls={accountPanelId}
            className={
              "luxury-info-privacy-consumer-card__toggle-btn" +
              (view === "account" ? " luxury-info-privacy-consumer-card__toggle-btn--active" : "")
            }
            onClick={() => setView("account")}
          >
            Area operatore
          </button>
          <button
            type="button"
            role="tab"
            id={gdprTabId}
            aria-selected={view === "gdpr"}
            aria-controls={gdprPanelId}
            className={
              "luxury-info-privacy-consumer-card__toggle-btn" +
              (view === "gdpr" ? " luxury-info-privacy-consumer-card__toggle-btn--active" : "")
            }
            onClick={() => setView("gdpr")}
          >
            GDPR
          </button>
        </div>
      </header>
      <div
        className={
          "luxury-info-privacy-consumer-card__inner" +
          (view === "gdpr" ? " luxury-info-privacy-consumer-card__inner--gdpr" : "")
        }
      >
        {view === "account" ? (
          <div
            id={accountPanelId}
            role="tabpanel"
            aria-labelledby={accountTabId}
            className="luxury-info-privacy__body"
          >
            <section className="luxury-info-privacy__section">
              <h2 className="luxury-section-title luxury-info-privacy__section-title">Documenti ufficiali</h2>
              <p className="luxury-text-muted luxury-info-privacy__text">
                Il testo legalmente vincolante è pubblicato sul sito:{" "}
                <button
                  type="button"
                  className="luxury-link-inline luxury-info-privacy-consumer-card__inline-action"
                  onClick={() => setView("gdpr")}
                >
                  Informativa privacy staff
                </button>
                ,{" "}
                <Link to="/termini" className="luxury-link-inline">
                  Termini di servizio
                </Link>
                ,{" "}
                <Link to="/privacy/cookie" className="luxury-link-inline">
                  Cookie
                </Link>{" "}
                e{" "}
                <Link to="/privacy/staff" className="luxury-link-inline">
                  Privacy staff (pagina pubblica)
                </Link>
                . In app mobile viene mostrato lo stesso pannello web.
              </p>
            </section>
            <section className="luxury-info-privacy__section">
              <h2 className="luxury-section-title luxury-info-privacy__section-title">Ruoli e dati operativi</h2>
              <p className="luxury-text-muted luxury-info-privacy__text">
                {namedSalon ? (
                  <>
                    Per il salone <strong>{namedSalon}</strong>,{" "}
                  </>
                ) : null}
                il <strong>salone che ti ha registrato</strong> è titolare del trattamento dei tuoi dati operativi (turni,
                agenda, foto in vetrina, chat con i clienti ove attiva). {LEGAL_STAFF_PROCESSING_ROLES_PARAGRAPH} Dettagli
                nell&apos;
                <button
                  type="button"
                  className="luxury-link-inline luxury-info-privacy-consumer-card__inline-action"
                  onClick={() => setView("gdpr")}
                >
                  informativa privacy staff
                </button>
                .
              </p>
            </section>
            <section className="luxury-info-privacy__section">
              <h2 className="luxury-section-title luxury-info-privacy__section-title">I tuoi diritti</h2>
              <p className="luxury-text-muted luxury-info-privacy__text">
                Per accesso, rettifica o cancellazione del profilo operatore contatta il <strong>titolare del tuo salone</strong>.
                Per segnalazioni tecniche o sicurezza sulla piattaforma scrivi a{" "}
                <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`} className="luxury-link-inline">
                  {LEGAL_PRIVACY_EMAIL}
                </a>{" "}
                o usa{" "}
                <Link to="/account/assistenza" className="luxury-link-inline">
                  Assistenza
                </Link>
                {contactEmail !== LEGAL_PRIVACY_EMAIL ? (
                  <>
                    {" "}
                    (
                    <a href={`mailto:${contactEmail}`} className="luxury-link-inline">
                      {contactEmail}
                    </a>
                    )
                  </>
                ) : null}
                . Hai diritto a proporre reclamo al{" "}
                <a
                  className="luxury-link-inline"
                  href="https://www.garanteprivacy.it"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Garante per la protezione dei dati personali
                </a>
                . Se usi anche un account cliente, consulta l&apos;
                <Link to="/privacy/clienti" className="luxury-link-inline">
                  informativa privacy clienti (B2C)
                </Link>
                .
              </p>
            </section>
            <section className="luxury-info-privacy__section">
              <h2 className="luxury-section-title luxury-info-privacy__section-title">Aggiornamenti</h2>
              <p className="luxury-text-muted luxury-info-privacy__text">
                Eventuali condizioni legali complete o informative dettagliate possono essere pubblicate sul sito pubblico o
                comunicate per email. Questa pagina riassume l&apos;approccio in area operatore; per il testo legalmente
                vincolante fanno stato i documenti ufficiali del servizio.
              </p>
            </section>
          </div>
        ) : (
          <div
            id={gdprPanelId}
            role="tabpanel"
            aria-labelledby={gdprTabId}
            className="luxury-info-privacy-consumer-card__legal"
          >
            <PrivacyPolicyStaffLayeredContent embedded />
            <p className="luxury-info-privacy-consumer-card__legal-hint">
              Tocca una sezione per espanderla. Altri documenti:{" "}
              <Link to="/termini" className="luxury-link-inline">
                Termini
              </Link>
              ,{" "}
              <Link to="/privacy/cookie" className="luxury-link-inline">
                Cookie
              </Link>
              ,{" "}
              <Link to="/privacy/clienti" className="luxury-link-inline">
                Privacy clienti
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
