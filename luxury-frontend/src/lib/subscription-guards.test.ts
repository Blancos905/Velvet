import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_GUARDS_SNAPSHOT, isFeatureEnabled, normalizeSubscriptionPath } from "./subscription-guards";

const here = dirname(fileURLToPath(import.meta.url));
const flutterGuardsJson = resolve(here, "../../../luxury-app/assets/luxury_subscription_guards.json");

describe("subscription-guards", () => {
  it("allinea l'asset Flutter al snapshot TypeScript", () => {
    const asset = JSON.parse(readFileSync(flutterGuardsJson, "utf8"));
    expect(asset).toEqual(SUBSCRIPTION_GUARDS_SNAPSHOT);
  });

  it("abilita le feature owner.premium solo con piano PREMIUM", () => {
    expect(isFeatureEnabled("owner.premium.chat", "PREMIUM", { surface: "web" })).toBe(true);
    expect(isFeatureEnabled("owner.premium.chat", "BASE", { surface: "web" })).toBe(false);
    expect(isFeatureEnabled("owner.premium.chat", "PLUS", { surface: "web" })).toBe(true);
    expect(isFeatureEnabled("owner.premium.brand", "PREMIUM", { surface: "nativeApp" })).toBe(true);
    expect(isFeatureEnabled("owner.premium.statistics", undefined, { surface: "web" })).toBe(false);
  });

  it("normalizza i path account", () => {
    expect(normalizeSubscriptionPath("/account/home/")).toBe("/account/home");
    expect(normalizeSubscriptionPath("/account/billing/checkout?token=1")).toBe("/account/billing/checkout");
  });
});
