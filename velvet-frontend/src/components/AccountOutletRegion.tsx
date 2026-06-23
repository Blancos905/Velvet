import type { ReactNode } from "react";
import { AccountOutletSuspense } from "./AccountOutletSuspense";

type AccountOutletRegionProps = {
  children: ReactNode;
  variant?: "hub" | "overlay" | "embedded";
};

/** Outlet account — lo splash full-screen è gestito da AccountNavigationTransitionProvider. */
export function AccountOutletRegion({ children }: AccountOutletRegionProps) {
  return <AccountOutletSuspense>{children}</AccountOutletSuspense>;
}
