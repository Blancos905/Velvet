import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { AppFooter } from "../components/AppFooter";
import { AppHeader } from "../components/AppHeader";
import { CookieConsentBanner } from "../components/CookieConsentBanner";
import { PendingBookingResume } from "../components/PendingBookingResume";
import { ScrollToTop } from "../components/ScrollToTop";
import { LuxuryDevBackendBanner } from "../components/LuxuryDevBackendBanner";
import { useLuxuryNativeAppDocumentClass } from "../hooks/useLuxuryNativeAppShell";

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function RootLayout() {
  useLuxuryNativeAppDocumentClass();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isEmbeddedPanel = searchParams.get("embed") === "1";
  const hideSiteChrome = isAdminPath(pathname) || isEmbeddedPanel;

  return (
    <>
      <ScrollToTop />
      {!hideSiteChrome ? <LuxuryDevBackendBanner /> : null}
      {!hideSiteChrome ? <AppHeader /> : null}
      {!hideSiteChrome ? <PendingBookingResume /> : null}
      <div className={hideSiteChrome ? "luxury-layout-main luxury-layout-main--admin" : "luxury-layout-main"}>
        <Outlet />
      </div>
      {!hideSiteChrome ? <AppFooter /> : null}
      {!hideSiteChrome ? <CookieConsentBanner /> : null}
    </>
  );
}
