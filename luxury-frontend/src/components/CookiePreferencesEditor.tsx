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

  function save(
    prefs: ReturnType<typeof defaultCookieConsent>,
    action: "accept_all" | "reject_non_essential" | "custom",
  ) {
    writeCookieConsent(prefs, action);
    setSavedAt(prefs.decidedAt);
    setMaps(prefs.maps);
    setEditorial(prefs.editorial);
  }

  return (
    <div className="luxury-cookie-prefs">
      <p className="luxury-legal-public__text">
        Puoi aggiornare in qualsiasi momento le preferenze su mappe e contenuti editoriali di terze parti. Le immagini di
        ispirazione in home sono self-hosted e restano visibili. I cookie strettamente necessari restano sempre attivi.
      </p>
      <ul className="luxury-cookie-banner__categories">
        <li className="luxury-cookie-banner__category">
          <label className="luxury-cookie-banner__toggle">
            <input type="checkbox" checked={maps} onChange={(e) => setMaps(e.target.checked)} />
            <span>
              <strong>Mappe e geocodifica</strong>
              <span>Google Maps e servizi collegati.</span>
            </span>
          </label>
        </li>
        <li className="luxury-cookie-banner__category">
          <label className="luxury-cookie-banner__toggle">
            <input type="checkbox" checked={editorial} onChange={(e) => setEditorial(e.target.checked)} />
            <span>
              <strong>Contenuti editoriali</strong>
              <span>Eventuali media di terze parti (le foto home sono già sul nostro dominio).</span>
            </span>
          </label>
        </li>
      </ul>
      <div className="luxury-cookie-banner__actions">
        <button
          type="button"
          className="luxury-cookie-banner__button luxury-cookie-banner__button--ghost"
          onClick={() => save(defaultCookieConsent(), "reject_non_essential")}
        >
          Rifiuta non necessari
        </button>
        <button type="button" className="luxury-cookie-banner__button luxury-cookie-banner__button--ghost" onClick={() => save(acceptAllCookieConsent(), "accept_all")}>
          Accetta tutti
        </button>
        <button
          type="button"
          className="luxury-cookie-banner__button"
          onClick={() =>
            save(
              {
                version: 2,
                decidedAt: new Date().toISOString(),
                necessary: true,
                maps,
                editorial,
              },
              "custom",
            )
          }
        >
          Salva preferenze
        </button>
      </div>
      {savedAt ? (
        <p className="luxury-cookie-banner__fineprint">Ultimo aggiornamento: {new Date(savedAt).toLocaleString("it-IT")}</p>
      ) : (
        <p className="luxury-cookie-banner__fineprint">
          Nessuna preferenza salvata.{" "}
          <button type="button" className="luxury-cookie-banner__link luxury-cookie-banner__link-button" onClick={syncFromStorage}>
            Ricarica
          </button>
        </p>
      )}
    </div>
  );
}
