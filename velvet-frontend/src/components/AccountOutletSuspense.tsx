import { Suspense, useLayoutEffect, type ReactNode } from "react";
import { useOptionalAccountNavigationTransition } from "../context/AccountNavigationTransitionContext";

function AccountOutletCommit({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady: () => void;
}) {
  useLayoutEffect(() => {
    onReady();
  }, [children, onReady]);

  return <>{children}</>;
}

/** Suspense interno all'area account — chiude lo splash al commit della nuova sezione. */
export function AccountOutletSuspense({ children }: { children: ReactNode }) {
  const transition = useOptionalAccountNavigationTransition();

  return (
    <Suspense fallback={null}>
      <AccountOutletCommit onReady={() => transition?.endTransition()}>{children}</AccountOutletCommit>
    </Suspense>
  );
}
