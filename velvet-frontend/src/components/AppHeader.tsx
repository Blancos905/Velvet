import { Link, NavLink, useLocation } from "react-router-dom";
import { useVelvetAuth } from "../auth/VelvetAuthProvider";
import { useEffectiveSalonPlanTier } from "../hooks/useEffectiveSalonPlanTier";
import { isVelvetNativeAppShell } from "../hooks/useVelvetNativeAppShell";
import {
  CONSUMER_PROFILE_MENU_ITEMS,
  ownerProfileMenuItems,
  STAFF_PROFILE_MENU_ITEMS,
  SUPER_ADMIN_PROFILE_MENU_ITEMS,
} from "../lib/appHeaderProfileMenuItems";
import { useMeSalonSummaryQuery } from "../hooks/useMeSalonSummary";
import { isSalonFreeOwnerBlockedOnWeb } from "../lib/subscription-guards";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { AppHeaderProfileMenu } from "./AppHeaderProfileMenu";
import { PartnerSignupLink } from "./PartnerSignupLink";
import "../styles/app-header.css";

export function AppHeader() {
  const location = useLocation();
  const { isAuthenticated, isSalonTitolare, isSalonStaff, isVelvetSuperAdmin, signOut } = useVelvetAuth();
  const isNativeApp = isVelvetNativeAppShell();
  const salonPlanTier = useEffectiveSalonPlanTier();
  const meSalon = useMeSalonSummaryQuery();
  const hideOwnerSalonHeaderLink =
    isSalonTitolare && !isNativeApp && isSalonFreeOwnerBlockedOnWeb(meSalon.data);
  const adminAreaActive = location.pathname.startsWith("/admin");
  const isConsumerAuthenticated = isAuthenticated && !isSalonTitolare && !isVelvetSuperAdmin && !isSalonStaff;

  return (
    <header className="velvet-site-header">
      <div className="velvet-header-main">
        <Link to="/" className="velvet-brand">
          <img
            src="/logo-saloni-luxury.png"
            alt="Saloni Luxury"
            className="velvet-brand-logo"
            width={100}
            height={100}
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
                isNativeApp ? (
                  <AppHeaderProfileMenu
                    items={SUPER_ADMIN_PROFILE_MENU_ITEMS}
                    ariaLabel="Menu super admin"
                    headerLabel="Amministrazione"
                  />
                ) : (
                  <NavLink
                    to="/admin/dashboard"
                    className={() => (adminAreaActive ? "active" : "")}
                  >
                    Gestione piattaforma
                  </NavLink>
                )
              ) : isSalonTitolare ? (
                isNativeApp || hideOwnerSalonHeaderLink ? (
                  <AppHeaderProfileMenu
                    items={ownerProfileMenuItems(salonPlanTier)}
                    ariaLabel="Menu profilo titolare"
                    headerLabel="Il tuo salone"
                  />
                ) : (
                  <NavLink
                    to="/account/salone"
                    className={({ isActive }) =>
                      `velvet-header-cta-pill velvet-header-btn-primary${isActive ? " active" : ""}`
                    }
                  >
                    Il mio salone
                  </NavLink>
                )
              ) : isSalonStaff ? (
                <AppHeaderProfileMenu
                  items={STAFF_PROFILE_MENU_ITEMS}
                  ariaLabel="Menu profilo staff"
                  headerLabel="Accesso operatore"
                />
              ) : (
                <AppHeaderProfileMenu
                  items={CONSUMER_PROFILE_MENU_ITEMS}
                  ariaLabel="Menu profilo cliente"
                />
              )}
              {isAuthenticated && (isNativeApp || !isConsumerAuthenticated || hideOwnerSalonHeaderLink) ? (
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
