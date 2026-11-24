import type { SalonPlanTier } from "../data/salonPlans";

/** Superficie runtime: browser vs shell WebView Flutter. */
export type SubscriptionSurface = "web" | "nativeApp";

/** Feature Premium del titolare. L’accesso reale resta `hasActivePremium` sul backend. */
export type SubscriptionFeature =
  | "owner.premium.brand"
  | "owner.premium.statistics"
  | "owner.premium.chat"
  | "owner.premium.staff"
  | "owner.premium.clients"
  | "owner.premium.layoutCatalog"
  | "owner.premium.feedbackLuxury";

export interface SubscriptionGuardContext {
  surface: SubscriptionSurface;
  /** Salone già provisionato lato backend (`GET /api/v1/me/salon`). */
  provisioned?: boolean;
}

/** Snapshot serializzabile per WebView Flutter (`window.__LUXURY_SUBSCRIPTION_GUARDS__`). */
export const SUBSCRIPTION_GUARDS_SNAPSHOT = {
  version: 1 as const,
} as const;

export type SubscriptionGuardsSnapshot = typeof SUBSCRIPTION_GUARDS_SNAPSHOT;

const PREMIUM_FEATURES: ReadonlySet<SubscriptionFeature> = new Set([
  "owner.premium.brand",
  "owner.premium.statistics",
  "owner.premium.chat",
  "owner.premium.staff",
  "owner.premium.clients",
  "owner.premium.layoutCatalog",
  "owner.premium.feedbackLuxury",
]);

export function resolveSubscriptionSurface(isNativeApp: boolean): SubscriptionSurface {
  return isNativeApp ? "nativeApp" : "web";
}

export function normalizeSubscriptionPath(path: string): string {
  let normalized = path.trim();
  if (!normalized) return "/";
  const queryIndex = normalized.indexOf("?");
  if (queryIndex >= 0) normalized = normalized.slice(0, queryIndex);
  const hashIndex = normalized.indexOf("#");
  if (hashIndex >= 0) normalized = normalized.slice(0, hashIndex);
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function isFeatureEnabled(
  feature: SubscriptionFeature,
  planType: SalonPlanTier | undefined,
  _context: SubscriptionGuardContext,
): boolean {
  const isPremium = planType === "PREMIUM" || planType === "PLUS";
  if (PREMIUM_FEATURES.has(feature)) {
    return isPremium;
  }
  return false;
}

/** Espone policy e helper sulla WebView (bridge Flutter). */
export function installSubscriptionGuardsWindow(): void {
  if (typeof window === "undefined") return;
  window.__LUXURY_SUBSCRIPTION_GUARDS__ = SUBSCRIPTION_GUARDS_SNAPSHOT;
  window.__luxurySubscriptionGuards = {
    normalizePath: normalizeSubscriptionPath,
    isFeatureEnabled,
  };
}

declare global {
  interface Window {
    __LUXURY_SUBSCRIPTION_GUARDS__?: SubscriptionGuardsSnapshot;
    __luxurySubscriptionGuards?: {
      normalizePath: typeof normalizeSubscriptionPath;
      isFeatureEnabled: typeof isFeatureEnabled;
    };
  }
}
