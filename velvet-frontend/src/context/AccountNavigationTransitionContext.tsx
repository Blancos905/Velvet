import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { VelvetLoginSplash } from "../components/VelvetLoginSplash";

const MIN_SPLASH_MS = 480;

type AccountNavigationTransitionContextValue = {
  isTransitioning: boolean;
  beginTransition: () => void;
  endTransition: () => void;
};

const AccountNavigationTransitionContext = createContext<AccountNavigationTransitionContextValue | null>(null);

export function AccountNavigationTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [splashKey, setSplashKey] = useState(0);
  const minVisibleUntilRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  const beginTransition = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    minVisibleUntilRef.current = Date.now() + MIN_SPLASH_MS;
    setSplashKey((key) => key + 1);
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    const delay = Math.max(0, minVisibleUntilRef.current - Date.now());
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      hideTimerRef.current = null;
    }, delay);
  }, []);

  const value = useMemo(
    () => ({ isTransitioning, beginTransition, endTransition }),
    [beginTransition, endTransition, isTransitioning],
  );

  return (
    <AccountNavigationTransitionContext.Provider value={value}>
      {children}
      <VelvetLoginSplash key={splashKey} active={isTransitioning} />
    </AccountNavigationTransitionContext.Provider>
  );
}

export function useAccountNavigationTransition(): AccountNavigationTransitionContextValue {
  const ctx = useContext(AccountNavigationTransitionContext);
  if (!ctx) {
    throw new Error("useAccountNavigationTransition fuori da AccountNavigationTransitionProvider");
  }
  return ctx;
}

/** Hook opzionale per link/nav che possono vivere fuori dal provider in futuro. */
export function useOptionalAccountNavigationTransition(): AccountNavigationTransitionContextValue | null {
  return useContext(AccountNavigationTransitionContext);
}
