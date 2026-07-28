import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LUXURY_ACCESS_TOKEN_KEY,
  LUXURY_ADMIN_IMPERSONATION_KEY,
  LUXURY_SUPER_ADMIN_TOKEN_KEY,
  clearAdminSession,
  markAdminImpersonationActive,
  resolveValidAdminAccessToken,
  writeAdminAccessToken,
} from "./adminSession";

function createStorageMock(): Storage {
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

function mockJwt(roles: string[], expSec = Math.floor(Date.now() / 1000) + 3600): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ roles, exp: expSec }));
  return `${header}.${payload}.sig`;
}

describe("adminSession.resolveValidAdminAccessToken", () => {
  let localStorageMock: Storage;
  let sessionStorageMock: Storage;

  beforeEach(() => {
    localStorageMock = createStorageMock();
    sessionStorageMock = createStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignora token admin persistito se la sessione app è titolare senza impersonazione", () => {
    writeAdminAccessToken(mockJwt(["ADMIN"]));
    sessionStorageMock.setItem(LUXURY_ACCESS_TOKEN_KEY, mockJwt(["OWNER"]));

    expect(resolveValidAdminAccessToken()).toBeUndefined();
    expect(localStorageMock.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY)).toBeNull();
  });

  it("consente token admin persistito durante impersonazione titolare da super admin", () => {
    const adminToken = mockJwt(["ADMIN"]);
    writeAdminAccessToken(adminToken);
    sessionStorageMock.setItem(LUXURY_ACCESS_TOKEN_KEY, mockJwt(["OWNER"]));
    markAdminImpersonationActive();

    expect(resolveValidAdminAccessToken()).toBe(adminToken);
  });

  it("usa JWT account con ruolo ADMIN come fallback admin", () => {
    const adminToken = mockJwt(["ADMIN"]);
    sessionStorageMock.setItem(LUXURY_ACCESS_TOKEN_KEY, adminToken);

    expect(resolveValidAdminAccessToken()).toBe(adminToken);
    expect(localStorageMock.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY)).toBe(adminToken);
  });

  it("clearAdminSession rimuove anche il flag impersonazione", () => {
    writeAdminAccessToken(mockJwt(["ADMIN"]));
    markAdminImpersonationActive();

    clearAdminSession();

    expect(localStorageMock.getItem(LUXURY_SUPER_ADMIN_TOKEN_KEY)).toBeNull();
    expect(sessionStorageMock.getItem(LUXURY_ADMIN_IMPERSONATION_KEY)).toBeNull();
  });
});
