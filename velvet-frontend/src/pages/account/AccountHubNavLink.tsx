import { NavLink, type NavLinkProps, useLocation } from "react-router-dom";
import { useOptionalAccountNavigationTransition } from "../../context/AccountNavigationTransitionContext";
import { scrollAccountHubToContent } from "../../lib/accountHubScroll";
import { normalizeAccountPath } from "../../lib/nativeAccountHubPaths";
import { prefetchAccountRoute } from "../../lib/prefetchAccountRoutes";

type AccountHubNavLinkProps = NavLinkProps & {
  prefetchPath?: string;
};

/** NavLink hub account con prefetch del chunk e splash di transizione. */
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
  const location = useLocation();
  const path = prefetchPath ?? (typeof to === "string" ? to : "");
  const transition = useOptionalAccountNavigationTransition();

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

        const targetPath = typeof to === "string" ? normalizeAccountPath(to) : "";
        const currentPath = normalizeAccountPath(location.pathname);
        if (targetPath && targetPath !== currentPath) {
          transition?.beginTransition();
        }

        window.setTimeout(() => scrollAccountHubToContent(), 0);
      }}
    >
      {children}
    </NavLink>
  );
}
