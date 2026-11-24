import { NavLink, type NavLinkProps } from "react-router-dom";
import { scrollAccountHubToContent } from "../../lib/accountHubScroll";
import { accountRouteOpensOverlay } from "../../lib/nativeAccountHubPaths";
import { prefetchAccountRoute } from "../../lib/prefetchAccountRoutes";
import { isLuxuryNativeAppShell } from "../../hooks/useLuxuryNativeAppShell";
import { useLuxuryAuth } from "../../auth/LuxuryAuthProvider";

type AccountHubNavLinkProps = NavLinkProps & {
  prefetchPath?: string;
};

/** NavLink hub account con prefetch del chunk della sezione. */
export function AccountHubNavLink({
  prefetchPath,
  onMouseEnter,
  onFocus,
  onTouchStart,
  onClick,
  to,
  children,
  ...rest
}: AccountHubNavLinkProps) {
  const path = prefetchPath ?? (typeof to === "string" ? to : "");
  const { isSalonTitolare, isSalonStaff, isLuxurySuperAdmin } = useLuxuryAuth();
  const isNativeApp = isLuxuryNativeAppShell();

  const warmRoute = () => {
    if (path) prefetchAccountRoute(path);
  };

  return (
    <NavLink
      {...rest}
      to={to}
      onMouseEnter={(event) => {
        warmRoute();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warmRoute();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warmRoute();
        onTouchStart?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Destinazioni overlay (prenotazioni, chat, profilo, …) non scrollano l’hub.
        const opensOverlay =
          Boolean(path) &&
          accountRouteOpensOverlay(path, {
            isNativeApp,
            isSalonTitolare,
            isSalonStaff,
            isLuxurySuperAdmin,
          });
        if (opensOverlay) return;
        window.setTimeout(() => scrollAccountHubToContent(), 0);
      }}
    >
      {children}
    </NavLink>
  );
}
