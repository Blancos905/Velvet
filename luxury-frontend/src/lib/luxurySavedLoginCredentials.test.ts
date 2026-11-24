import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSavedLoginCredentials,
  isNativeSavedCredentialsAllowed,
  isSavedLoginEmailAllowed,
  readSavedLoginCredentials,
  readSavedLoginEmail,
  writeSavedLoginCredentials,
  writeSavedLoginEmail,
} from "./luxurySavedLoginCredentials";

const STORAGE_KEY = "luxury.savedLoginEmail.v1";
const NATIVE_STORAGE_KEY = "luxury.nativeSavedLogin.v1";
const LEGACY_STORAGE_KEY = "luxury.savedLogin.v1";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("luxurySavedLoginCredentials", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores email only on web, never password, and keeps salon and staff apart", () => {
    writeSavedLoginEmail("Owner@Salon.it", "salon");
    writeSavedLoginCredentials("Owner@Salon.it", "secret", "salon");
    writeSavedLoginEmail("staff@salon.it", "staff");
    expect(localStorage.getItem(`${STORAGE_KEY}.salon`)).toBe(JSON.stringify({ email: "owner@salon.it" }));
    expect(readSavedLoginEmail("salon")).toEqual({ email: "owner@salon.it" });
    expect(readSavedLoginCredentials("salon")).toEqual({ email: "owner@salon.it", password: "" });
    expect(readSavedLoginEmail("staff")).toEqual({ email: "staff@salon.it" });
    expect(readSavedLoginCredentials("staff")).toEqual({ email: "staff@salon.it", password: "" });
  });

  it("drops the old shared email so it cannot leak across accounts", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ email: "legacy@test.com", password: "secret" }),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: "operator@salon.it" }));
    expect(readSavedLoginEmail("salon")).toBeNull();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("stores email and password in native app shell", () => {
    vi.stubGlobal("navigator", { userAgent: "SaloniLuxuryApp/1.0" });
    expect(isSavedLoginEmailAllowed()).toBe(false);
    expect(isNativeSavedCredentialsAllowed()).toBe(true);
    writeSavedLoginCredentials("native@test.com", "secret123");
    expect(localStorage.getItem(NATIVE_STORAGE_KEY)).toBe(
      JSON.stringify({ email: "native@test.com", password: "secret123" }),
    );
    expect(readSavedLoginCredentials()).toEqual({
      email: "native@test.com",
      password: "secret123",
    });
    expect(readSavedLoginEmail("salon")).toBeNull();
  });

  it("clears stored credentials", () => {
    writeSavedLoginEmail("clear@test.com", "salon");
    writeSavedLoginEmail("staff@salon.it", "staff");
    clearSavedLoginCredentials("salon");
    expect(readSavedLoginEmail("salon")).toBeNull();
    expect(readSavedLoginEmail("staff")).toEqual({ email: "staff@salon.it" });

    vi.stubGlobal("navigator", { userAgent: "SaloniLuxuryApp/1.0" });
    writeSavedLoginCredentials("native@test.com", "secret");
    clearSavedLoginCredentials();
    expect(readSavedLoginCredentials()).toBeNull();
  });
});
