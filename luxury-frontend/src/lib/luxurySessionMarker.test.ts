import { describe, expect, it } from "vitest";
import { sessionBootAction } from "./luxurySessionMarker";

describe("sessionBootAction", () => {
  it("resta in sessione quando il marcatore coincide", () => {
    expect(sessionBootAction("epoch-a", "epoch-a", true)).toBe("keep");
  });

  it("rinnova se l'altra superficie ha una sessione e questo tab no", () => {
    expect(sessionBootAction("epoch-a", undefined, false)).toBe("restore");
  });

  it("rinnova se un altro login ha sostituito la sessione", () => {
    expect(sessionBootAction("epoch-b", "epoch-a", true)).toBe("restore");
  });

  it("chiude il tab se il marcatore è stato cancellato dal logout", () => {
    expect(sessionBootAction(undefined, "epoch-a", true)).toBe("clear");
  });

  it("non tocca una sessione solo locale, senza cookie condiviso", () => {
    expect(sessionBootAction(undefined, undefined, true)).toBe("keep");
    expect(sessionBootAction(undefined, undefined, false)).toBe("keep");
  });
});
