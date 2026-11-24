import { describe, expect, it } from "vitest";
import { publicScrollIntent } from "./publicScrollIntent";

describe("publicScrollIntent", () => {
  it("ripristina lo scroll quando si torna indietro", () => {
    expect(
      publicScrollIntent({
        navigationType: "POP",
        accountInternal: false,
        nativeHubReturn: false,
      }),
    ).toBe("restore");
  });

  it("porta in cima su un link nuovo", () => {
    expect(
      publicScrollIntent({
        navigationType: "PUSH",
        accountInternal: false,
        nativeHubReturn: false,
      }),
    ).toBe("top");
  });

  it("lascia lo scroll dentro la stessa area account", () => {
    expect(
      publicScrollIntent({
        navigationType: "PUSH",
        accountInternal: true,
        nativeHubReturn: false,
      }),
    ).toBe("keep");
  });

  it("porta in cima l'hub nativo anche tornando indietro", () => {
    expect(
      publicScrollIntent({
        navigationType: "POP",
        accountInternal: true,
        nativeHubReturn: true,
      }),
    ).toBe("native-top");
  });
});
