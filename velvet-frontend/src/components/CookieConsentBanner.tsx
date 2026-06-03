import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/velvet-legal-public.css";

const STORAGE_KEY = "velvet.cookie-consent.v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "acknowledged");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="velvet-cookie-banner" role="dialog" aria-label="Informativa cookie">
      <div className="velvet-cookie-banner__inner">
        <p className="velvet-cookie-banner__text">
          Usiamo cookie e archiviazione locale necessari al servizio e, per alcune funzioni, servizi di terze parti
          (es. mappe e font). Consulta l&apos;
          <Link to="/privacy/cookie" className="velvet-cookie-banner__link">
            informativa cookie
          </Link>{" "}
          e l&apos;
          <Link to="/privacy/clienti" className="velvet-cookie-banner__link">
            informativa privacy
          </Link>
          .
        </p>
        <button type="button" className="velvet-cookie-banner__button" onClick={acknowledge}>
          Ho capito
        </button>
      </div>
    </div>
  );
}
