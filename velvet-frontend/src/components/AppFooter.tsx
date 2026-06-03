import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { appStoreUrl, playStoreUrl } from "../config/env";
import { useVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import "../styles/velvet-site-footer.css";

function AppleStoreIcon() {
  return (
    <svg className="velvet-footer-store-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg className="velvet-footer-store-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.609 1.814 13.792 12 3.61 22.186a1.86 1.86 0 0 1-.372-1.08V2.894a1.86 1.86 0 0 1 .371-1.08m2.983 1.35 9.88 5.74v2.192l-9.88 5.74-2.6-1.51v-10.66l2.6-1.502M15.608 13.43l2.983 1.73 2.6 1.51 1.86 1.08a1.86 1.86 0 0 0 1.48 0l-6.943-4.02v-2.78" />
    </svg>
  );
}

export function AppFooter() {
  const [legalOpen, setLegalOpen] = useState(false);
  const legalLinksId = useId();
  const isNativeApp = useVelvetNativeAppShell();

  return (
    <footer className="velvet-site-footer" aria-label="Piè di pagina">
      <div className="velvet-footer-inner">
        {!isNativeApp ? (
        <section className="velvet-footer-app-block velvet-footer-app-block--interactive" aria-labelledby="velvet-footer-app-heading">
          <div className="velvet-footer-app-logo-wrap">
            <img
              src="/logo-saloni-velvet.png"
              alt=""
              className="velvet-footer-app-logo"
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="velvet-footer-app-copy">
            <div className="velvet-footer-download-panel">
              <h2 id="velvet-footer-app-heading" className="velvet-footer-app-title">
                Scarica l&apos;app Saloni Luxury
              </h2>
              <p className="velvet-footer-app-lead">
                Prenota dal salone preferito, gestisci i tuoi appuntamenti e registrati al piano Free direttamente
                dall&apos;app ufficiale per Android e iPhone.
              </p>
              <div className="velvet-footer-store-row">
                <a
                  href={playStoreUrl}
                  className="velvet-footer-store-badge velvet-footer-store-badge--google"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GooglePlayIcon />
                  <span className="velvet-footer-store-text">
                    <span className="velvet-footer-store-line1">Disponibile su</span>
                    <span className="velvet-footer-store-line2">Google Play</span>
                  </span>
                </a>
                <a
                  href={appStoreUrl}
                  className="velvet-footer-store-badge velvet-footer-store-badge--apple"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AppleStoreIcon />
                  <span className="velvet-footer-store-text">
                    <span className="velvet-footer-store-line1">Scarica su</span>
                    <span className="velvet-footer-store-line2">App Store</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        <nav
          className={`velvet-site-footer__legal${legalOpen ? " velvet-site-footer__legal--open" : ""}`}
          aria-label="Documenti legali"
        >
          <button
            type="button"
            className="velvet-site-footer__legal-toggle"
            aria-expanded={legalOpen}
            aria-controls={legalLinksId}
            onClick={() => setLegalOpen((open) => !open)}
          >
            <span className="velvet-site-footer__legal-toggle-label">Documenti legali</span>
            <span className="velvet-site-footer__legal-toggle-chevron" aria-hidden="true" />
          </button>
          <div id={legalLinksId} className="velvet-site-footer__legal-panel" hidden={!legalOpen}>
            <ul className="velvet-site-footer__legal-links">
              <li>
                <Link to="/privacy/clienti" className="velvet-site-footer__legal-link">
                  Privacy clienti (B2C)
                </Link>
              </li>
              <li>
                <Link to="/privacy/staff" className="velvet-site-footer__legal-link">
                  Privacy staff
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="velvet-site-footer__legal-link">
                  Privacy saloni (B2B)
                </Link>
              </li>
              <li>
                <Link to="/termini" className="velvet-site-footer__legal-link">
                  Termini di servizio
                </Link>
              </li>
              <li>
                <Link to="/privacy/scelte" className="velvet-site-footer__legal-link">
                  Scelte privacy
                </Link>
              </li>
              <li>
                <Link to="/privacy/cookie" className="velvet-site-footer__legal-link">
                  Informativa cookie
                </Link>
              </li>
              <li>
                <Link to="/privacy/elimina-account" className="velvet-site-footer__legal-link">
                  Elimina account
                </Link>
              </li>
              <li>
                <Link to="/legale" className="velvet-site-footer__legal-link">
                  Requisiti store
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </footer>
  );
}
