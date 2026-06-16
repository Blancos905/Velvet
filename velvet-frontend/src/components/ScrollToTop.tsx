import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Riporta la pagina in cima a ogni cambio route (es. ricerca → scheda salone). */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
