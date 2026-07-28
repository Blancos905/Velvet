import type { ReactNode } from "react";
import { AccountOutletSuspense } from "./AccountOutletSuspense";

type AccountOutletRegionProps = {
  children: ReactNode;
  variant?: "hub" | "overlay" | "embedded";
};

/** Outlet account con Suspense per i chunk lazy delle sezioni. */
export function AccountOutletRegion({ children }: AccountOutletRegionProps) {
  return <AccountOutletSuspense>{children}</AccountOutletSuspense>;
}
