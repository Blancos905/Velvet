import { NavLink, type NavLinkProps } from "react-router-dom";
import { scrollAccountHubToContent } from "../../lib/accountHubScroll";
import { prefetchAccountRoute } from "../../lib/prefetchAccountRoutes";

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
        window.setTimeout(() => scrollAccountHubToContent(), 0);
      }}
    >
      {children}
    </NavLink>
  );
}
