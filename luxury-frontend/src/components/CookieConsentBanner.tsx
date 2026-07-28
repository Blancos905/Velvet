import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptAllCookieConsent,
  defaultCookieConsent,
  hasCookieConsentDecision,
  type CookieConsentPreferences,
  writeCookieConsent,
} from "../lib/cookieConsent";
import "../styles/luxury-legal-public.css";

type Panel = "compact" | "customize";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<Panel>("compact");
  const [maps, setMaps] = useState(false);
  const [editorial, setEditorial] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieConsentDecision());
  }, []);

  if (!visible) return null;

  function persist(prefs: CookieConsentPreferences, action: "accept_all" | "reject_non_essential" | "custom") {
    writeCookieConsent(prefs, action);
    setVisible(false);
  }

  function rejectNonEssential() {
    persist(defaultCookieConsent(), "reject_non_essential");
  }

  function acceptAll() {
    persist(acceptAllCookieConsent(), "accept_all");
  }

  function saveCustom() {
    persist(
      {
        version: 2,
        decidedAt: new Date().toISOString(),
        necessary: true,
        maps,
        editorial,
      },
      "custom",
    );
  }

  if (panel === "customize") {
    return (
      <div className="luxury-cookie-banner luxury-cookie-banner--customize" role="dialog" aria-label="Preferenze cookie">
        <div className="luxury-cookie-banner__panel">
          <div className="luxury-cookie-banner__panel-head">
            <h2 className="luxury-cookie-banner__panel-title">Preferenze cookie</h2>
            <button
              type="button"
              className="luxury-cookie-banner__close"
              aria-label="Chiudi e rifiuta i non necessari"
              onClick={rejectNonEssential}
            >
              ×
            </button>
          </div>
          <p className="luxury-cookie-banner__text">
            Scegli quali tecnologie facoltative attivare. I cookie strettamente necessari al servizio restano sempre attivi.
          </p>
          <ul className="luxury-cookie-banner__categories">
            <li className="luxury-cookie-banner__category luxury-cookie-banner__category--locked">
              <div>
                <strong>Necessari</strong>
                <span>Sessione, sicurezza e funzioni base del sito.</span>
              </div>
              <span className="luxury-cookie-banner__always-on" aria-hidden>
                Sempre attivi
              </span>
            </li>
            <li className="luxury-cookie-banner__category">
              <label className="luxury-cookie-banner__toggle">
                <input type="checkbox" checked={maps} onChange={(e) => setMaps(e.target.checked)} />
                <span>
                  <strong>Mappe e geocodifica</strong>
                  <span>Google Maps, geolocalizzazione per la ricerca saloni e servizi collegati.</span>
                </span>
              </label>
            </li>
            <li className="luxury-cookie-banner__category">
              <label className="luxury-cookie-banner__toggle">
                <input type="checkbox" checked={editorial} onChange={(e) => setEditorial(e.target.checked)} />
                <span>
                  <strong>Contenuti editoriali</strong>
                  <span>Eventuali media di terze parti in sezioni ispirazione (le foto home sono già sul nostro dominio).</span>
                </span>
              </label>
            </li>
          </ul>
          <div className="luxury-cookie-banner__actions">
            <button type="button" className="luxury-cookie-banner__button luxury-cookie-banner__button--ghost" onClick={rejectNonEssential}>
              Rifiuta non necessari
            </button>
            <button type="button" className="luxury-cookie-banner__button" onClick={saveCustom}>
              Salva preferenze
            </button>
          </div>
          <p className="luxury-cookie-banner__fineprint">
            Dettagli in{" "}
            <Link to="/privacy/cookie" className="luxury-cookie-banner__link">
              informativa cookie
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="luxury-cookie-banner" role="dialog" aria-label="Informativa cookie">
      <div className="luxury-cookie-banner__inner">
        <button
          type="button"
          className="luxury-cookie-banner__close luxury-cookie-banner__close--compact"
          aria-label="Chiudi e rifiuta i non necessari"
          onClick={rejectNonEssential}
        >
          ×
        </button>
        <p className="luxury-cookie-banner__text">
          Usiamo cookie e archiviazione locale necessari al servizio. Con il tuo consenso possiamo attivare mappe (Google
          Maps) e eventuali media editoriali di terze parti. Consulta l&apos;
          <Link to="/privacy/cookie" className="luxury-cookie-banner__link">
            informativa cookie
          </Link>{" "}
          e l&apos;
          <Link to="/privacy/clienti" className="luxury-cookie-banner__link">
            informativa privacy
          </Link>
          .
        </p>
        <div className="luxury-cookie-banner__actions luxury-cookie-banner__actions--compact">
          <button type="button" className="luxury-cookie-banner__button luxury-cookie-banner__button--ghost" onClick={rejectNonEssential}>
            Rifiuta
          </button>
          <button type="button" className="luxury-cookie-banner__button luxury-cookie-banner__button--ghost" onClick={() => setPanel("customize")}>
            Personalizza
          </button>
          <button type="button" className="luxury-cookie-banner__button" onClick={acceptAll}>
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
}
