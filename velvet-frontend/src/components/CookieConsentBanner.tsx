import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  acceptAllCookieConsent,
  defaultCookieConsent,
  hasCookieConsentDecision,
  type CookieConsentPreferences,
  writeCookieConsent,
} from "../lib/cookieConsent";
import "../styles/velvet-legal-public.css";

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

  function persist(prefs: CookieConsentPreferences) {
    writeCookieConsent(prefs);
    setVisible(false);
  }

  function rejectNonEssential() {
    persist(defaultCookieConsent());
  }

  function acceptAll() {
    persist(acceptAllCookieConsent());
  }

  function saveCustom() {
    persist({
      version: 2,
      decidedAt: new Date().toISOString(),
      necessary: true,
      maps,
      editorial,
    });
  }

  if (panel === "customize") {
    return (
      <div className="velvet-cookie-banner velvet-cookie-banner--customize" role="dialog" aria-label="Preferenze cookie">
        <div className="velvet-cookie-banner__panel">
          <div className="velvet-cookie-banner__panel-head">
            <h2 className="velvet-cookie-banner__panel-title">Preferenze cookie</h2>
            <button
              type="button"
              className="velvet-cookie-banner__close"
              aria-label="Chiudi e rifiuta i non necessari"
              onClick={rejectNonEssential}
            >
              ×
            </button>
          </div>
          <p className="velvet-cookie-banner__text">
            Scegli quali tecnologie facoltative attivare. I cookie strettamente necessari al servizio restano sempre attivi.
          </p>
          <ul className="velvet-cookie-banner__categories">
            <li className="velvet-cookie-banner__category velvet-cookie-banner__category--locked">
              <div>
                <strong>Necessari</strong>
                <span>Sessione, sicurezza e funzioni base del sito.</span>
              </div>
              <span className="velvet-cookie-banner__always-on" aria-hidden>
                Sempre attivi
              </span>
            </li>
            <li className="velvet-cookie-banner__category">
              <label className="velvet-cookie-banner__toggle">
                <input type="checkbox" checked={maps} onChange={(e) => setMaps(e.target.checked)} />
                <span>
                  <strong>Mappe e geocodifica</strong>
                  <span>Google Maps e servizi collegati quando apri mappe o indicazioni.</span>
                </span>
              </label>
            </li>
            <li className="velvet-cookie-banner__category">
              <label className="velvet-cookie-banner__toggle">
                <input type="checkbox" checked={editorial} onChange={(e) => setEditorial(e.target.checked)} />
                <span>
                  <strong>Contenuti editoriali</strong>
                  <span>Immagini da terze parti (es. Unsplash) nelle sezioni ispirazione.</span>
                </span>
              </label>
            </li>
          </ul>
          <div className="velvet-cookie-banner__actions">
            <button type="button" className="velvet-cookie-banner__button velvet-cookie-banner__button--ghost" onClick={rejectNonEssential}>
              Rifiuta non necessari
            </button>
            <button type="button" className="velvet-cookie-banner__button" onClick={saveCustom}>
              Salva preferenze
            </button>
          </div>
          <p className="velvet-cookie-banner__fineprint">
            Dettagli in{" "}
            <Link to="/privacy/cookie" className="velvet-cookie-banner__link">
              informativa cookie
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="velvet-cookie-banner" role="dialog" aria-label="Informativa cookie">
      <div className="velvet-cookie-banner__inner">
        <button
          type="button"
          className="velvet-cookie-banner__close velvet-cookie-banner__close--compact"
          aria-label="Chiudi e rifiuta i non necessari"
          onClick={rejectNonEssential}
        >
          ×
        </button>
        <p className="velvet-cookie-banner__text">
          Usiamo cookie e archiviazione locale necessari al servizio. Con il tuo consenso possiamo attivare mappe (Google
          Maps) e immagini editoriali da terze parti. Consulta l&apos;
          <Link to="/privacy/cookie" className="velvet-cookie-banner__link">
            informativa cookie
          </Link>{" "}
          e l&apos;
          <Link to="/privacy/clienti" className="velvet-cookie-banner__link">
            informativa privacy
          </Link>
          .
        </p>
        <div className="velvet-cookie-banner__actions velvet-cookie-banner__actions--compact">
          <button type="button" className="velvet-cookie-banner__button velvet-cookie-banner__button--ghost" onClick={rejectNonEssential}>
            Rifiuta
          </button>
          <button type="button" className="velvet-cookie-banner__button velvet-cookie-banner__button--ghost" onClick={() => setPanel("customize")}>
            Personalizza
          </button>
          <button type="button" className="velvet-cookie-banner__button" onClick={acceptAll}>
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  );
}
