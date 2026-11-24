import { describe, expect, it } from "vitest";
import {
  AGENDA_SPONSOR_DEMOS,
  AGENDA_SPONSOR_SLOTS,
  resolveAgendaSponsors,
  type AgendaSponsor,
} from "./agendaSponsors";

function sponsor(partial: Partial<AgendaSponsor> & Pick<AgendaSponsor, "id" | "brandName">): AgendaSponsor {
  return {
    placement: "client_bookings",
    headline: "Una riga",
    ctaLabel: "Scopri",
    href: "https://example.com",
    imageSrc: "/ads/demo-client-noir-silk.svg",
    sortOrder: 0,
    active: true,
    ...partial,
  };
}

describe("resolveAgendaSponsors", () => {
  it("uses the five demo brands when the agenda has no saved sponsors", () => {
    expect(resolveAgendaSponsors(null)).toHaveLength(AGENDA_SPONSOR_SLOTS);
    expect(resolveAgendaSponsors([])).toEqual(AGENDA_SPONSOR_DEMOS);
  });

  it("keeps only the first five active sponsors saved for the agenda", () => {
    const saved = Array.from({ length: 6 }, (_, index) =>
      sponsor({ id: `s${index}`, brandName: `Brand ${index}`, sortOrder: index }),
    );
    saved[1] = sponsor({ id: "off", brandName: "Spento", active: false, sortOrder: 1 });

    const visible = resolveAgendaSponsors(saved);

    expect(visible.map((item) => item.brandName)).toEqual([
      "Brand 0",
      "Brand 2",
      "Brand 3",
      "Brand 4",
      "Brand 5",
    ]);
  });
});
