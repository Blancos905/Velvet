import type { NavigateFunction } from "react-router-dom";

/** Indietro nella history, così la home ritrova lo scroll. Senza history torna alla home. */
export function goBackOrHome(navigate: NavigateFunction): void {
  if (typeof window !== "undefined" && window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate("/");
}
