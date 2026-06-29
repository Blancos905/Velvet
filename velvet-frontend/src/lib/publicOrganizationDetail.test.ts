import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { OrganizationSummary } from "../api/types";
import {
  findOrganizationSummaryInQueryCache,
  organizationSummaryToDetailPlaceholder,
  resolveOrganizationDetailPlaceholder,
} from "./publicOrganizationDetail";

const sample: OrganizationSummary = {
  id: "org-1",
  slug: "hair-jassa",
  name: "Hair Jassa",
  city: "Roma",
};

describe("publicOrganizationDetail", () => {
  it("maps search summary to detail placeholder", () => {
    const detail = organizationSummaryToDetailPlaceholder(sample);
    expect(detail.name).toBe("Hair Jassa");
    expect(detail.slug).toBe("hair-jassa");
    expect(detail.contactEmail).toBeNull();
  });

  it("finds summary in org search query cache", () => {
    const qc = new QueryClient();
    qc.setQueryData(["orgs", "search", "barbiere"], [sample]);
    expect(findOrganizationSummaryInQueryCache(qc, "hair-jassa")?.name).toBe("Hair Jassa");
  });

  it("prefers navigation preview over cache", () => {
    const qc = new QueryClient();
    const other: OrganizationSummary = { ...sample, id: "org-2", slug: "other", name: "Other" };
    qc.setQueryData(["orgs", "search", "x"], [other]);
    const detail = resolveOrganizationDetailPlaceholder(qc, "hair-jassa", sample);
    expect(detail?.name).toBe("Hair Jassa");
  });
});
