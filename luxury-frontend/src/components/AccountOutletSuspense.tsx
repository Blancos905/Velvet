import { Suspense, type ReactNode } from "react";

/** Suspense interno all'area account per i chunk lazy delle sezioni. */
export function AccountOutletSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
