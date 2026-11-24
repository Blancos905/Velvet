import { describe, expect, it } from "vitest";
import {
  accountRouteOpensOverlay,
  isNativeAccountHubPath,
  nativeAccountHubFallbackPath,
  normalizeAccountPath,
} from "./nativeAccountHubPaths";

describe("nativeAccountHubPaths", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizeAccountPath("/account/prenotazioni/")).toBe("/account/prenotazioni");
  });

  it("treats /account as consumer hub, not prenotazioni", () => {
    const consumer = { isSalonTitolare: false, isSalonStaff: false };
    expect(isNativeAccountHubPath("/account", consumer)).toBe(true);
    expect(isNativeAccountHubPath("/account/prenotazioni", consumer)).toBe(false);
    expect(isNativeAccountHubPath("/account/chat", consumer)).toBe(false);
  });

  it("keeps salone/staff hubs", () => {
    expect(isNativeAccountHubPath("/salone", { isSalonTitolare: true, isSalonStaff: false })).toBe(
      true,
    );
    expect(isNativeAccountHubPath("/account/staff", { isSalonTitolare: false, isSalonStaff: true })).toBe(
      true,
    );
    expect(isNativeAccountHubPath("/account", { isSalonTitolare: true, isSalonStaff: false })).toBe(false);
  });

  it("fallback hub for consumer is /account", () => {
    expect(
      nativeAccountHubFallbackPath({ isSalonTitolare: false, isSalonStaff: false }),
    ).toBe("/account");
  });

  const consumerWeb = {
    isSalonTitolare: false,
    isSalonStaff: false,
    isNativeApp: false,
  };

  it("opens client bookings, chat and profile as an overlay on the website", () => {
    expect(accountRouteOpensOverlay("/account", consumerWeb)).toBe(false);
    expect(accountRouteOpensOverlay("/account/prenotazioni", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/prenotazioni/abc", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/chat", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/profilo", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/notifiche", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/saloni-di-fiducia", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/feedback-luxury", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/assistenza", consumerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/billing/checkout", consumerWeb)).toBe(false);
    expect(accountRouteOpensOverlay("/account/billing/success", consumerWeb)).toBe(false);
  });

  it("keeps the salon menu overlay and leaves staff website pages in the hub", () => {
    const ownerWeb = { isSalonTitolare: true, isSalonStaff: false, isNativeApp: false };
    expect(accountRouteOpensOverlay("/salone", ownerWeb)).toBe(false);
    expect(accountRouteOpensOverlay("/salone/servizi", ownerWeb)).toBe(true);
    expect(accountRouteOpensOverlay("/account/prenotazioni", ownerWeb)).toBe(true);

    const staffWeb = { isSalonTitolare: false, isSalonStaff: true, isNativeApp: false };
    expect(accountRouteOpensOverlay("/account/staff", staffWeb)).toBe(false);
    expect(accountRouteOpensOverlay("/account/profilo", staffWeb)).toBe(false);

    const staffApp = { ...staffWeb, isNativeApp: true };
    expect(accountRouteOpensOverlay("/account/staff/agenda", staffApp)).toBe(true);
  });
});
