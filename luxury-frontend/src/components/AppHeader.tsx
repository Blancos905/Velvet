import { Link, NavLink, useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import {
  CONSUMER_PROFILE_MENU_ITEMS,
  ownerProfileMenuItems,
  STAFF_PROFILE_MENU_ITEMS,
  SUPER_ADMIN_PROFILE_MENU_ITEMS,
} from "../lib/appHeaderProfileMenuItems";
import { setPostLoginReturnPath } from "../lib/postLoginReturnPath";
import { useLuxuryT } from "../i18n/useLuxuryLocale";
import { AppHeaderProfileMenu } from "./AppHeaderProfileMenu";
import { HeaderTrialCountdown } from "./HeaderTrialCountdown";
import { HeaderSponsorRotator } from "./HeaderSponsorRotator";
import { PartnerSignupLink } from "./PartnerSignupLink";
import "../styles/app-header.css";

export function AppHeader() {
  const t = useLuxuryT();
  const location = useLocation();
  const { isAuthenticated, isSalonTitolare, isSalonStaff, isLuxurySuperAdmin, signOut } = useLuxuryAuth();
  const isNativeApp = isLuxuryNativeAppShell();
  const adminAreaActive = location.pathname.startsWith("/admin");
  const onPartnerPage = location.pathname === "/partner";
  const isConsumerAuthenticated = isAuthenticated && !isSalonTitolare && !isLuxurySuperAdmin && !isSalonStaff;

  const showHeaderSponsors = !isNativeApp;

  return (
    <header className="luxury-site-header">
      <div
        className={`luxury-header-main${showHeaderSponsors ? " luxury-header-main--with-sponsors" : ""}`}
      >
        <Link to="/" className="luxury-brand">
          <img
            src="/logo-saloni-luxury.png"
            alt="Saloni Luxury"
            className="luxury-brand-logo"
            width={100}
            height={100}
          />
          <div className="luxury-brand-text">
            <span className="luxury-brand-saloni">Saloni</span>
            <span className="luxury-brand-luxury">Luxury</span>
          </div>
        </Link>
        {showHeaderSponsors ? <HeaderSponsorRotator /> : null}
        <nav className="luxury-header-nav" aria-label={t("header.nav")}>
          {!isAuthenticated ? (
            <Link
              to="/registrati"
              className="luxury-header-cta-pill luxury-header-partner-cta"
            >
              <span className="luxury-header-partner-label">{t("header.register")}</span>
            </Link>
          ) : null}
          {!isAuthenticated || isConsumerAuthenticated ? (
            onPartnerPage ? (
              <Link to="/piani" className="luxury-header-cta-pill luxury-header-partner-cta">
                <svg
                  className="luxury-header-partner-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                </svg>
                <span className="luxury-header-partner-label">{t("header.partnerProceed")}</span>
              </Link>
            ) : (
              <PartnerSignupLink className="luxury-header-cta-pill luxury-header-partner-cta">
                <svg
                  className="luxury-header-partner-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                </svg>
                <span className="luxury-header-partner-label">{t("header.becomePartner")}</span>
              </PartnerSignupLink>
            )
          ) : null}
          {isAuthenticated && (
            <>
              {isSalonTitolare ? <HeaderTrialCountdown /> : null}
              {isLuxurySuperAdmin ? (
                isNativeApp ? (
                  <AppHeaderProfileMenu
                    items={SUPER_ADMIN_PROFILE_MENU_ITEMS}
                    ariaLabel={t("header.menuAdmin")}
                    headerLabel={t("header.adminArea")}
                  />
                ) : (
                  <NavLink
                    to="/admin/dashboard"
                    className={() => (adminAreaActive ? "active" : "")}
                  >
                    {t("header.platformAdmin")}
                  </NavLink>
                )
              ) : isSalonTitolare ? (
                isNativeApp ? (
                  <AppHeaderProfileMenu
                    items={ownerProfileMenuItems(t("account.nav.showcasePreview"))}
                    ariaLabel={t("header.menuOwner")}
                    headerLabel={t("header.ownerSalon")}
                  />
                ) : (
                  <NavLink
                    to="/salone"
                    className={({ isActive }) =>
                      `luxury-header-cta-pill luxury-header-btn-primary${isActive ? " active" : ""}`
                    }
                  >
                    {t("header.mySalon")}
                  </NavLink>
                )
              ) : isSalonStaff ? (
                <AppHeaderProfileMenu
                  items={STAFF_PROFILE_MENU_ITEMS}
                  ariaLabel={t("header.menuStaff")}
                  headerLabel={t("header.staffAccess")}
                />
              ) : (
                <AppHeaderProfileMenu
                  items={CONSUMER_PROFILE_MENU_ITEMS}
                  ariaLabel={t("header.menuClient")}
                />
              )}
              {isAuthenticated && (isNativeApp || !isConsumerAuthenticated) ? (
                <button
                  type="button"
                  className="luxury-header-cta-pill luxury-header-btn-primary"
                  onClick={() => void signOut()}
                >
                  {t("header.logout")}
                </button>
              ) : null}
            </>
          )}
          {!isAuthenticated && (
            <NavLink
              to="/account"
              className={({ isActive }) =>
                `luxury-header-cta-pill luxury-header-btn-primary${isActive ? " active" : ""}`
              }
              onClick={() => {
                setPostLoginReturnPath("/account");
              }}
            >
              {t("header.login")}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
