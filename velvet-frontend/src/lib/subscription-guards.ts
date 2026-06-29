import type { MeSalonSummary } from "../api/types";
import { parseSalonPlanTier, type SalonPlanTier } from "../data/salonPlans";

/** Superficie runtime: browser vs shell WebView Flutter. */
export type SubscriptionSurface = "web" | "nativeApp";

/** Feature flag nominative per piani salone (titolare). */
export type SubscriptionFeature =
  | "owner.web.accountPanel"
  | "owner.web.freeRegistration"
  | "owner.premium.brand"
  | "owner.premium.statistics"
  | "owner.premium.chat"
  | "owner.premium.staff"
  | "owner.premium.clients"
  | "owner.premium.layoutCatalog"
  | "owner.premium.feedbackVelvet"
  | "owner.free.serviziPhotoUpload";

export interface SubscriptionGuardContext {
  surface: SubscriptionSurface;
  /** Salone già provisionato lato backend (`GET /api/v1/me/salon`). */
  provisioned?: boolean;
}

/** Snapshot serializzabile per WebView Flutter (`window.__VELVET_SUBSCRIPTION_GUARDS__`). */
export const SUBSCRIPTION_GUARDS_SNAPSHOT = {
  version: 1 as const,
  freeOwnerNative: {
    alwaysAllowedPrefixes: [
      "/login",
      "/password-reset",
      "/oidc",
      "/auth",
      "/legal",
      "/piani",
      "/dev",
    ],
    publicExactPaths: ["/"],
    publicPrefixes: ["/s/", "/search"],
    accountAllowedExactPaths: ["/account", "/account/salone"],
    accountAllowedPrefixes: [
      "/account/prenotazioni",
      "/account/notifiche",
      "/account/info-privacy",
      "/account/assistenza",
      "/account/profilo",
      "/account/salone/servizi",
    ],
    blockedPathPrefixes: [
      "/account/billing",
      "/account/salone/staff",
      "/account/feedback-velvet",
      "/account/salone/statistiche",
      "/account/salone/brand",
      "/account/salone/posizione",
      "/account/chat",
      "/admin",
    ],
    allowedNavLabels: [
      "aggiungi servizi",
      "agenda",
      "notifiche",
      "info e privacy",
      "assistenza",
      "profilo",
    ],
    blockedNavLabels: ["staff", "recensioni"],
    paywallBannerMessage:
      "Piano Free — in app: Agenda, Notifiche, Aggiungi servizi (senza foto), Profilo, Info e privacy, Assistenza. Altre sezioni richiedono una configurazione account diversa.",
  },
  messages: {
    freeOwnerWebPanel: {
      kicker: "Piano Free · Il tuo salone",
      title: "Il pannello web è incluso in Premium",
      lead:
        "Hai attivato il piano Free dall'app Saloni Luxury. Da smartphone puoi già gestire agenda, servizi e profilo del salone.",
      premiumHint:
        "La gestione completa da browser — vetrina personalizzata, brand, statistiche, staff e strumenti avanzati — è riservata al piano Premium.",
      freeAppFeatures: ["Agenda e appuntamenti", "Catalogo servizi", "Profilo, privacy e assistenza"],
    },
  },
} as const;

export type SubscriptionGuardsSnapshot = typeof SUBSCRIPTION_GUARDS_SNAPSHOT;

const { lead, premiumHint } = SUBSCRIPTION_GUARDS_SNAPSHOT.messages.freeOwnerWebPanel;

export const SALON_FREE_OWNER_WEB_PANEL_MESSAGE = `${lead} ${premiumHint}`;

const PREMIUM_FEATURES: ReadonlySet<SubscriptionFeature> = new Set([
  "owner.premium.brand",
  "owner.premium.statistics",
  "owner.premium.chat",
  "owner.premium.staff",
  "owner.premium.clients",
  "owner.premium.layoutCatalog",
  "owner.premium.feedbackVelvet",
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

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function pathMatchesAnyPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathMatchesPrefix(path, prefix));
}

/** Percorso consentito al titolare Free nella shell app nativa. */
export function isNativeFreeOwnerPathAllowed(path: string): boolean {
  const normalized = normalizeSubscriptionPath(path);
  const policy = SUBSCRIPTION_GUARDS_SNAPSHOT.freeOwnerNative;

  if (normalized === "/account" || normalized === "/account/") {
    return true;
  }

  if (pathMatchesAnyPrefix(normalized, policy.alwaysAllowedPrefixes)) {
    return true;
  }

  if (policy.publicExactPaths.includes(normalized as "/")) {
    return true;
  }

  if (pathMatchesAnyPrefix(normalized, policy.publicPrefixes)) {
    return true;
  }

  if (pathMatchesAnyPrefix(normalized, policy.blockedPathPrefixes)) {
    return false;
  }

  if ((policy.accountAllowedExactPaths as readonly string[]).includes(normalized)) {
    return true;
  }

  if (pathMatchesAnyPrefix(normalized, policy.accountAllowedPrefixes)) {
    return true;
  }

  return false;
}

export function usesNativeFreeAccountProfileTheme(path: string): boolean {
  const normalized = normalizeSubscriptionPath(path);
  return normalized === "/account" || normalized.startsWith("/account/");
}

/** Titolare Free su browser web: blocca l'hub account (gate Premium). */
export function isSalonFreeOwnerBlockedOnWeb(
  salon: MeSalonSummary | undefined,
  surface: SubscriptionSurface = "web",
): boolean {
  return !isFeatureEnabled("owner.web.accountPanel", parseSalonPlanTier(salon?.planTier), {
    surface,
    provisioned: salon?.provisioned,
  });
}

export function isFeatureEnabled(
  feature: SubscriptionFeature,
  planType: SalonPlanTier | undefined,
  context: SubscriptionGuardContext,
): boolean {
  const tier = planType ?? "BASE";
  const isPremium = tier === "PREMIUM";

  switch (feature) {
    case "owner.web.accountPanel":
      if (context.surface === "nativeApp") return true;
      if (!context.provisioned) return true;
      return isPremium;
    case "owner.web.freeRegistration":
      if (context.surface === "nativeApp") {
        return tier === "BASE";
      }
      return isPremium;
    case "owner.free.serviziPhotoUpload":
      return isPremium || context.surface === "web";
    default:
      if (PREMIUM_FEATURES.has(feature)) {
        return isPremium;
      }
      return false;
  }
}

/** Espone policy e helper sulla WebView (bridge Flutter). */
export function installSubscriptionGuardsWindow(): void {
  if (typeof window === "undefined") return;
  window.__VELVET_SUBSCRIPTION_GUARDS__ = SUBSCRIPTION_GUARDS_SNAPSHOT;
  window.__velvetSubscriptionGuards = {
    isNativeFreeOwnerPathAllowed,
    normalizePath: normalizeSubscriptionPath,
    usesNativeFreeAccountProfileTheme,
    isFeatureEnabled,
  };
}

declare global {
  interface Window {
    __VELVET_SUBSCRIPTION_GUARDS__?: SubscriptionGuardsSnapshot;
    __velvetSubscriptionGuards?: {
      isNativeFreeOwnerPathAllowed: typeof isNativeFreeOwnerPathAllowed;
      normalizePath: typeof normalizeSubscriptionPath;
      usesNativeFreeAccountProfileTheme: typeof usesNativeFreeAccountProfileTheme;
      isFeatureEnabled: typeof isFeatureEnabled;
    };
  }
}
