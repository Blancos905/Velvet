import { useEffect } from "react";
import { Outlet, useLocation, useSearchParams } from "react-router-dom";
import { AppFooter } from "../components/AppFooter";
import { AppHeader } from "../components/AppHeader";
import { CookieConsentBanner } from "../components/CookieConsentBanner";
import { PendingBookingResume } from "../components/PendingBookingResume";
import { ScrollToTop } from "../components/ScrollToTop";
import { LuxuryDevBackendBanner } from "../components/LuxuryDevBackendBanner";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import { useLuxuryNativeAppDocumentClass } from "../hooks/useLuxuryNativeAppShell";
import { currentSurface, isEmailVerificationLinkPage, readSurfaceLocation } from "../lib/luxurySurfaces";

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function RootLayout() {
  useLuxuryNativeAppDocumentClass();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useLuxuryAuth();
  const isEmbeddedPanel = searchParams.get("embed") === "1";
  const panelSurface = currentSurface(readSurfaceLocation()) !== "public";
  const hideSiteChrome = isAdminPath(pathname) || isEmbeddedPanel || panelSurface;
  const hideCookieBanner = isAdminPath(pathname) || isEmbeddedPanel || (panelSurface && !isAuthenticated);
  const emailLinkLocked = isEmailVerificationLinkPage(pathname, searchParams.toString());

  useEffect(() => {
    const nodes = [document.querySelector(".luxury-site-header"), document.querySelector(".luxury-site-footer")];
    const targets = nodes.filter((node): node is HTMLElement => node instanceof HTMLElement);
    for (const node of targets) {
      node.inert = emailLinkLocked;
      node.classList.toggle("luxury-chrome--email-link-locked", emailLinkLocked);
    }
    return () => {
      for (const node of targets) {
        node.inert = false;
        node.classList.remove("luxury-chrome--email-link-locked");
      }
    };
  }, [emailLinkLocked]);

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
      {!hideCookieBanner ? <CookieConsentBanner /> : null}
    </>
  );
}
