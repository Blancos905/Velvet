import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import {
  ensureNativeAccountHubScrolledToTop,
  isAccountInternalNavigation,
  isReturnToNativeAccountHub,
} from "../lib/accountHubScroll";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";

/** Riporta la pagina in cima a ogni cambio route (hub nativo: anche al ritorno da overlay). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const { isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const previous = prevPathRef.current;
    prevPathRef.current = pathname;

    const role = { isSalonTitolare, isSalonStaff };
    if (isLuxuryNativeAppShell() && isReturnToNativeAccountHub(previous, pathname, role)) {
      ensureNativeAccountHubScrolledToTop();
      return;
    }

    if (isAccountInternalNavigation(previous, pathname)) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, isSalonStaff, isSalonTitolare]);

  return null;
}
