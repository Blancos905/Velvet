import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { AppFooter } from "../components/AppFooter";
import { AppHeader } from "../components/AppHeader";
import { CookieConsentBanner } from "../components/CookieConsentBanner";
import { PendingBookingResume } from "../components/PendingBookingResume";
import { ScrollToTop } from "../components/ScrollToTop";
import { VelvetDevBackendBanner } from "../components/VelvetDevBackendBanner";
import { useVelvetNativeAppDocumentClass } from "../hooks/useVelvetNativeAppShell";

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function RootLayout() {
  useVelvetNativeAppDocumentClass();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isEmbeddedPanel = searchParams.get("embed") === "1";
  const hideSiteChrome = isAdminPath(pathname) || isEmbeddedPanel;

  return (
    <>
      <ScrollToTop />
      {!hideSiteChrome ? <VelvetDevBackendBanner /> : null}
      {!hideSiteChrome ? <AppHeader /> : null}
      {!hideSiteChrome ? <PendingBookingResume /> : null}
      <div className={hideSiteChrome ? "velvet-layout-main velvet-layout-main--admin" : "velvet-layout-main"}>
        <Outlet />
      </div>
      {!hideSiteChrome ? <AppFooter /> : null}
      {!hideSiteChrome ? <CookieConsentBanner /> : null}
    </>
  );
}
