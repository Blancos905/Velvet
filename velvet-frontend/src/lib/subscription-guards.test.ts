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
const flutterGuardsJson = resolve(here, "../../../velvet-app/assets/velvet_subscription_guards.json");

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

  it("consente registrazione Free solo in app nativa", () => {
    expect(
      isFeatureEnabled("owner.web.freeRegistration", "BASE", { surface: "nativeApp" }),
    ).toBe(true);
    expect(isFeatureEnabled("owner.web.freeRegistration", "BASE", { surface: "web" })).toBe(
      false,
    );
    expect(
      isFeatureEnabled("owner.web.freeRegistration", "PREMIUM", { surface: "nativeApp" }),
    ).toBe(false);
  });

  it("blocca checkout billing in app nativa Free owner", () => {
    expect(isNativeFreeOwnerPathAllowed("/account/billing/checkout")).toBe(false);
  });

  it("applica allowlist path Free owner in app", () => {
    expect(isNativeFreeOwnerPathAllowed("/account/prenotazioni")).toBe(true);
    expect(isNativeFreeOwnerPathAllowed("/account/salone/brand")).toBe(false);
    expect(normalizeSubscriptionPath("/account/home/")).toBe("/account/home");
  });
});
