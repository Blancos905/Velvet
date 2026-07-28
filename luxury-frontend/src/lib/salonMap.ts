import type { MeSalonSummary } from "../api/types";

/** Testo per ricerca Google Maps (prima sede titolare). */
export function salonMapSearchQuery(me: MeSalonSummary): string {
  const line = me.primaryLocationAddressLine?.trim();
  const postalCode = me.primaryLocationPostalCode?.trim();
  const city = me.primaryLocationCity?.trim();
  const name = me.primaryLocationName?.trim();
  const parts = [line, postalCode, city, name].filter(Boolean) as string[];
  if (parts.length === 0) return "";
  return `${[...new Set(parts)].join(", ")}, Italia`;
}

export function googleMapsEmbedSrc(query: string, apiKey: string): string {
  const q = encodeURIComponent(query);
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}&language=it`;
  }
  return `https://maps.google.com/maps?q=${q}&hl=it&z=16&output=embed`;
}
