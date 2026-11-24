import { describe, expect, it } from "vitest";
import { shouldSkipSharedSessionRestore } from "./publicSurfaceSessionRelease";

describe("shouldSkipSharedSessionRestore", () => {
  it("sulla home di ricerca, dopo il trasporto, non riprende la sessione del pannello", () => {
    expect(shouldSkipSharedSessionRestore("public", true)).toBe(true);
    expect(shouldSkipSharedSessionRestore("public", false)).toBe(false);
    expect(shouldSkipSharedSessionRestore("salon", true)).toBe(false);
    expect(shouldSkipSharedSessionRestore("admin", true)).toBe(false);
  });
});
