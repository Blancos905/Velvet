import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SUBSCRIPTION_GUARDS_SNAPSHOT,
  isFeatureEnabled,
  isNativeFreeOwnerPathAllowed,
  isSalonFreeOwnerBlockedOnWeb,
  normalizeSubscriptionPath,
} from "./subscription-guards";

const here = dirname(fileURLToPath(import.meta.url));
const flutterGuardsJson = resolve(here, "../../../luxury-app/assets/luxury_subscription_guards.json");

describe("subscription-guards", () => {
  it("allinea l'asset Flutter al snapshot TypeScript", () => {
    const asset = JSON.parse(readFileSync(flutterGuardsJson, "utf8"));
    expect(asset).toEqual(SUBSCRIPTION_GUARDS_SNAPSHOT);
  });

  it("blocca il pannello web per titolare Free provisioned", () => {
    expect(
      isSalonFreeOwnerBlockedOnWeb(
        { provisioned: true, planTier: "BASE" } as never,
        "web",
      ),
    ).toBe(true);
    expect(
      isSalonFreeOwnerBlockedOnWeb(
        { provisioned: true, planTier: "PREMIUM" } as never,
        "web",
      ),
    ).toBe(false);
    expect(
      isSalonFreeOwnerBlockedOnWeb(
        { provisioned: true, planTier: "BASE" } as never,
        "nativeApp",
      ),
    ).toBe(false);
  });

  it("consente registrazione salone Free e Premium in app nativa", () => {
    expect(
      isFeatureEnabled("owner.web.freeRegistration", "BASE", { surface: "nativeApp" }),
    ).toBe(true);
    expect(
      isFeatureEnabled("owner.web.freeRegistration", "PREMIUM", { surface: "nativeApp" }),
    ).toBe(true);
    expect(isFeatureEnabled("owner.web.freeRegistration", "BASE", { surface: "web" })).toBe(
      false,
    );
  });

  it("consente recupero password e conferma email in app nativa", () => {
    expect(isNativeFreeOwnerPathAllowed("/reimposta-password")).toBe(true);
    expect(isNativeFreeOwnerPathAllowed("/conferma-email")).toBe(true);
  });

  it("consente checkout registrazione Premium in app nativa", () => {
    expect(isNativeFreeOwnerPathAllowed("/registrazione/premium/checkout")).toBe(true);
  });

  it("consente checkout billing in app nativa Free owner", () => {
    expect(isNativeFreeOwnerPathAllowed("/account/billing/checkout")).toBe(true);
  });

  it("applica allowlist path Free owner in app", () => {
    expect(isNativeFreeOwnerPathAllowed("/account/prenotazioni")).toBe(true);
    expect(isNativeFreeOwnerPathAllowed("/account/salone/panoramica")).toBe(true);
    expect(isNativeFreeOwnerPathAllowed("/account/salone/brand")).toBe(false);
    expect(normalizeSubscriptionPath("/account/home/")).toBe("/account/home");
  });
});
