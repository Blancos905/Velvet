import { describe, expect, it } from "vitest";
import {
  CANONICAL_APP_ROUTE_SAMPLES,
  findBugAreaByTag,
  findBugAreasBySurface,
  listBugAreaTags,
  listUnmappedAppRoutes,
  resolveBugAreasFromText,
} from "./bugAreaMap";

describe("bugAreaMap", () => {
  it("risolve @tag e route /piani", () => {
    const fromTag = resolveBugAreasFromText("@piani c'è un bug");
    const fromRoute = resolveBugAreasFromText("bug su /piani");
    expect(fromTag.some((entry) => entry.tag === "piani")).toBe(true);
    expect(fromRoute.some((entry) => entry.tag === "piani")).toBe(true);
  });

  it("risolve route account salone", () => {
    const areas = findBugAreasBySurface("/salone/statistiche");
    expect(areas.some((entry) => entry.tag === "statistiche")).toBe(true);
  });

  it("risolve alias registrazione", () => {
    const areas = resolveBugAreasFromText("controlla registrazione");
    expect(areas.some((entry) => entry.tag === "registrazione")).toBe(true);
  });

  it("espone tag unici", () => {
    const tags = listBugAreaTags();
    expect(tags.length).toBeGreaterThan(70);
    expect(findBugAreaByTag("piani")?.tag).toBe("piani");
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("copre le route campione dell'app", () => {
    expect(listUnmappedAppRoutes()).toEqual([]);
    expect(CANONICAL_APP_ROUTE_SAMPLES.length).toBeGreaterThan(40);
  });

  it("risolve nuovi tag infrastrutturali", () => {
    expect(resolveBugAreasFromText("@storage-vetrina").some((entry) => entry.tag === "storage-vetrina")).toBe(true);
    expect(resolveBugAreasFromText("@provisioning").some((entry) => entry.tag === "provisioning")).toBe(true);
    expect(resolveBugAreasFromText("/dev/bug-map").some((entry) => entry.tag === "dev")).toBe(true);
  });
});
