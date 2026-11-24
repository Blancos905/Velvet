import { describe, expect, it } from "vitest";
import { writeStoredRefreshToken } from "../auth/luxuryRefreshSession";
import { CONSUMER_PROFILE_MENU_ITEMS } from "./appHeaderProfileMenuItems";

describe("security fixes", () => {
  it("la voce Recensioni del cliente apre il feedback dell'account", () => {
    const item = CONSUMER_PROFILE_MENU_ITEMS.find((entry) => entry.label === "Recensioni");
    expect(item?.to).toBe("/account/feedback-luxury");
  });

  it("il refresh non resta in sessionStorage", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    };
    Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true });
    sessionStorage.setItem("luxury_refresh_token", "stale-token");
    writeStoredRefreshToken("rotated-token");
    expect(sessionStorage.getItem("luxury_refresh_token")).toBeNull();
  });
});
