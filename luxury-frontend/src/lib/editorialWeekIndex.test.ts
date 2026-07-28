import { describe, expect, it } from "vitest";
import { getEditorialWeekIndex, selectWeeklyItems } from "./editorialWeekIndex";

describe("getEditorialWeekIndex", () => {
  it("incrementa ogni 7 giorni dall'ancoraggio", () => {
    const w0 = getEditorialWeekIndex(new Date(Date.UTC(2024, 0, 1)));
    const w1 = getEditorialWeekIndex(new Date(Date.UTC(2024, 0, 8)));
    expect(w1).toBe(w0 + 1);
  });
});

describe("selectWeeklyItems", () => {
  const pool = ["a", "b", "c", "d", "e", "f"];

  it("ruota tre card a settimana", () => {
    expect(selectWeeklyItems(pool, 3, 0)).toEqual(["a", "b", "c"]);
    expect(selectWeeklyItems(pool, 3, 1)).toEqual(["d", "e", "f"]);
    expect(selectWeeklyItems(pool, 3, 2)).toEqual(["a", "b", "c"]);
  });

  it("restituisce tutto il pool se più corto del conteggio visibile", () => {
    expect(selectWeeklyItems(["x", "y"], 3, 0)).toEqual(["x", "y"]);
  });
});
