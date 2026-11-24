import { describe, expect, it } from "vitest";
import { showResultsLoader } from "./showResultsLoader";

const idle = { isPending: false, isFetching: false, isFetched: false, isError: false };

describe("showResultsLoader", () => {
  it("resta acceso finché non ci sono schede", () => {
    expect(showResultsLoader({ ...idle, isPending: true }, 0)).toBe(true);
    expect(showResultsLoader({ ...idle, isFetching: true, isFetched: true }, 0)).toBe(true);
    expect(showResultsLoader(idle, 0)).toBe(true);
  });

  it("si spegne quando le schede ci sono o la richiesta è finita vuota", () => {
    expect(showResultsLoader({ ...idle, isFetched: true }, 3)).toBe(false);
    expect(showResultsLoader({ ...idle, isFetched: true }, 0)).toBe(false);
    expect(showResultsLoader({ ...idle, isError: true, isFetched: true }, 0)).toBe(false);
  });
});
