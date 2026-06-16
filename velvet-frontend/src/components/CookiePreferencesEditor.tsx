import { useState } from "react";
import {
  acceptAllCookieConsent,
  defaultCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from "../lib/cookieConsent";
import { useCookieConsent } from "../hooks/useCookieConsent";

/** Pannello riutilizzabile in /privacy/scelte per aggiornare le preferenze cookie. */
export function CookiePreferencesEditor() {
  const stored = useCookieConsent();
  const [maps, setMaps] = useState(stored?.maps ?? false);
  const [editorial, setEditorial] = useState(stored?.editorial ?? false);
  const [savedAt, setSavedAt] = useState<string | null>(stored?.decidedAt ?? null);

  function syncFromStorage() {
    const prefs = readCookieConsent();
    setMaps(prefs?.maps ?? false);
    setEditorial(prefs?.editorial ?? false);
    setSavedAt(prefs?.decidedAt ?? null);
  }

  function save(prefs: ReturnType<typeof defaultCookieConsent>) {
    writeCookieConsent(prefs);
    setSavedAt(prefs.decidedAt);
    setMaps(prefs.maps);
    setEditorial(prefs.editorial);
  }

  return (
    <div className="velvet-cookie-prefs">
      <p className="velvet-legal-public__text">
        Puoi aggiornare in qualsiasi momento le preferenze su mappe e contenuti editoriali. I cookie strettamente necessari
        restano sempre attivi.
      </p>
      <ul className="velvet-cookie-banner__categories">
        <li className="velvet-cookie-banner__category">
          <label className="velvet-cookie-banner__toggle">
            <input type="checkbox" checked={maps} onChange={(e) => setMaps(e.target.checked)} />
            <span>
              <strong>Mappe e geocodifica</strong>
              <span>Google Maps e servizi collegati.</span>
            </span>
          </label>
        </li>
        <li className="velvet-cookie-banner__category">
          <label className="velvet-cookie-banner__toggle">
            <input type="checkbox" checked={editorial} onChange={(e) => setEditorial(e.target.checked)} />
            <span>
              <strong>Contenuti editoriali</strong>
              <span>Immagini da terze parti nelle sezioni ispirazione.</span>
            </span>
          </label>
        </li>
      </ul>
      <div className="velvet-cookie-banner__actions">
        <button
          type="button"
          className="velvet-cookie-banner__button velvet-cookie-banner__button--ghost"
          onClick={() => save(defaultCookieConsent())}
        >
          Rifiuta non necessari
        </button>
        <button type="button" className="velvet-cookie-banner__button velvet-cookie-banner__button--ghost" onClick={() => save(acceptAllCookieConsent())}>
          Accetta tutti
        </button>
        <button
          type="button"
          className="velvet-cookie-banner__button"
          onClick={() =>
            save({
              version: 2,
              decidedAt: new Date().toISOString(),
              necessary: true,
              maps,
              editorial,
            })
          }
        >
          Salva preferenze
        </button>
      </div>
      {savedAt ? (
        <p className="velvet-cookie-banner__fineprint">Ultimo aggiornamento: {new Date(savedAt).toLocaleString("it-IT")}</p>
      ) : (
        <p className="velvet-cookie-banner__fineprint">
          Nessuna preferenza salvata.{" "}
          <button type="button" className="velvet-cookie-banner__link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={syncFromStorage}>
            Ricarica
          </button>
        </p>
      )}
    </div>
  );
}
