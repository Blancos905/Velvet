import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useLuxuryAuth } from "../auth/LuxuryAuthProvider";
import {
  ensureNativeAccountHubScrolledToTop,
  isAccountInternalNavigation,
  isReturnToNativeAccountHub,
} from "../lib/accountHubScroll";
import { isLuxuryNativeAppShell } from "../hooks/useLuxuryNativeAppShell";
import { publicScrollIntent } from "../lib/publicScrollIntent";
import { readWindowScrollY, scheduleScrollRestore, writeWindowScrollY } from "../lib/windowScroll";

/**
 * Durante Indietro il browser può azzerare lo scroll prima degli effetti React.
 * Il flag è sul modulo perché il listener di popstate va registrato prima del router.
 */
let navigationScrollFrozen = false;
let lastStableScrollY = 0;

function freezeNavigationScroll(): void {
  navigationScrollFrozen = true;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      navigationScrollFrozen = false;
    });
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", freezeNavigationScroll);
}

/**
 * Un link nuovo porta in cima.
 * Indietro (POP) torna allo scroll della pagina da cui si era partiti,
 * così dalla lista idee si rientra sulla home nel punto lasciato.
 */
export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { isSalonTitolare, isSalonStaff } = useLuxuryAuth();
  const positionsRef = useRef(new Map<string, number>());
  const keyRef = useRef<string | null>(null);
  const prevPathRef = useRef(location.pathname);
  const cancelRestoreRef = useRef<() => void>(() => {});

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const remember = () => {
      if (navigationScrollFrozen || keyRef.current == null) return;
      const y = readWindowScrollY();
      // Il cambio pagina azzera lo scroll in un colpo solo: non coprire il punto salvato.
      if (y === 0 && lastStableScrollY > 120) return;
      lastStableScrollY = y;
      positionsRef.current.set(keyRef.current, y);
    };
    const armClick = () => {
      remember();
      freezeNavigationScroll();
    };
    remember();
    window.addEventListener("scroll", remember, { passive: true });
    document.addEventListener("click", armClick, true);
    return () => {
      window.removeEventListener("scroll", remember);
      document.removeEventListener("click", armClick, true);
    };
  }, []);

  useEffect(() => () => cancelRestoreRef.current(), []);

  useLayoutEffect(() => {
    const previousKey = keyRef.current;
    const previousPath = prevPathRef.current;
    const keyChanged = previousKey !== location.key;
    if (!keyChanged) {
      if (
        isLuxuryNativeAppShell()
        && isReturnToNativeAccountHub(previousPath, location.pathname, { isSalonTitolare, isSalonStaff })
      ) {
        ensureNativeAccountHubScrolledToTop();
      }
      return;
    }

    keyRef.current = location.key;
    prevPathRef.current = location.pathname;
    cancelRestoreRef.current();
    cancelRestoreRef.current = () => {};

    const intent = publicScrollIntent({
      navigationType,
      accountInternal: isAccountInternalNavigation(previousPath, location.pathname),
      nativeHubReturn:
        isLuxuryNativeAppShell()
        && isReturnToNativeAccountHub(previousPath, location.pathname, { isSalonTitolare, isSalonStaff }),
    });

    if (intent === "native-top") {
      ensureNativeAccountHubScrolledToTop();
      positionsRef.current.set(location.key, 0);
      return;
    }
    if (intent === "keep") return;
    if (intent === "restore") {
      const y = positionsRef.current.get(location.key) ?? 0;
      cancelRestoreRef.current = scheduleScrollRestore(y);
      return;
    }
    writeWindowScrollY(0);
    positionsRef.current.set(location.key, 0);
  }, [isSalonStaff, isSalonTitolare, location.key, location.pathname, navigationType]);

  return null;
}
