import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { PartnerSignupLink } from "./PartnerSignupLink";
import "../styles/app-header.css";

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, isSalonTitolare, isVelvetSuperAdmin, signOut } = useVelvetAuth();
  const adminAreaActive = location.pathname.startsWith("/admin");
  const isConsumerAuthenticated = isAuthenticated && !isSalonTitolare && !isVelvetSuperAdmin;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = profileDropdownRef.current;
    if (!el) return;
    if (!profileMenuOpen) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  return (
    <header className="velvet-site-header">
      <div className="velvet-header-main">
        <Link to="/" className="velvet-brand">
          <img
            src="/logo-saloni-velvet.png"
            alt="Saloni Luxury"
            className="velvet-brand-logo"
            width={112}
            height={112}
          />
          <div className="velvet-brand-text">
            <span className="velvet-brand-saloni">Saloni</span>
            <span className="velvet-brand-velvet">Luxury</span>
          </div>
        </Link>
        <nav className="velvet-header-nav" aria-label="Navigazione principale">
          {!isAuthenticated ? (
            <Link to="/registrati" className="velvet-header-cta-pill velvet-header-partner-cta">
              <span className="velvet-header-partner-label">Registrati</span>
            </Link>
          ) : null}
          {!isAuthenticated || isConsumerAuthenticated ? (
            <PartnerSignupLink className="velvet-header-cta-pill velvet-header-partner-cta">
              <svg
                className="velvet-header-partner-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
              </svg>
              <span className="velvet-header-partner-label">Diventa partner</span>
            </PartnerSignupLink>
          ) : null}
          {isAuthenticated && (
            <>
              {isVelvetSuperAdmin ? (
                <NavLink
                  to="/admin/dashboard"
                  className={() => (adminAreaActive ? "active" : "")}
                >
                  Gestione piattaforma
                </NavLink>
              ) : isSalonTitolare ? (
                <NavLink
                  to="/account/salone"
                  className={({ isActive }) =>
                    `velvet-header-cta-pill velvet-header-btn-primary${isActive ? " active" : ""}`
                  }
                >
                  Il mio salone
                </NavLink>
              ) : (
                <div className="velvet-header-profile-menu" ref={profileMenuRef}>
                  <button
                    type="button"
                    className={`velvet-header-cta-pill velvet-header-profile-trigger${profileMenuOpen ? " is-open" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                    aria-controls="velvet-header-profile-dropdown"
                    onClick={() => setProfileMenuOpen((open) => !open)}
                  >
                    Profilo
                    <span aria-hidden className="velvet-header-profile-caret">
                      ▾
                    </span>
                  </button>
                  <div
                    ref={profileDropdownRef}
                    id="velvet-header-profile-dropdown"
                    className={`velvet-header-profile-dropdown${profileMenuOpen ? " is-open" : ""}`}
                    role="menu"
                    aria-label="Menu profilo cliente"
                    aria-hidden={!profileMenuOpen}
                  >
                    <p className="velvet-header-profile-dropdown__header" role="presentation">
                      Il tuo account
                    </p>
                    <Link to="/account/profilo" role="menuitem" className="velvet-header-profile-item">
                      Informazioni
                    </Link>
                    <Link to="/account/prenotazioni" role="menuitem" className="velvet-header-profile-item">
                      Prenotazioni
                    </Link>
                    <Link to="/account/chat" role="menuitem" className="velvet-header-profile-item">
                      Chat
                    </Link>
                    <Link to="/account/notifiche" role="menuitem" className="velvet-header-profile-item">
                      Notifiche
                    </Link>
                    <Link to="/account/saloni-di-fiducia" role="menuitem" className="velvet-header-profile-item">
                      Saloni di fiducia
                    </Link>
                    <Link to="/recensione" role="menuitem" className="velvet-header-profile-item">
                      Recensioni
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="velvet-header-profile-item velvet-header-profile-item--button velvet-header-profile-item--logout"
                      onClick={() => void signOut()}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
              {!isConsumerAuthenticated ? (
                <button
                  type="button"
                  className="velvet-header-cta-pill velvet-header-btn-primary"
                  onClick={() => void signOut()}
                >
                  Esci
                </button>
              ) : null}
            </>
          )}
          {!isAuthenticated && (
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `velvet-header-cta-pill velvet-header-btn-primary${isActive ? " active" : ""}`
              }
              onClick={() => {
                /* «Accedi» porta a /account: dopo login si resta in area account, non sulla pagina pubblica precedente (es. /search). */
                setPostLoginReturnPath("/account");
              }}
            >
              Accedi
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
