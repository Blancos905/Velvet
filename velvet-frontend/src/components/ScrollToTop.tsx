import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isAccountInternalNavigation } from "../lib/accountHubScroll";

/** Riporta la pagina in cima a ogni cambio route, tranne navigazione interna all'area account. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const previous = prevPathRef.current;
    prevPathRef.current = pathname;
    if (isAccountInternalNavigation(previous, pathname)) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
