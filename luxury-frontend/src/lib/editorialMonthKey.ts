/** Fuso orario allineato a {@code PublicOrganizationService#monthlyIdeaSummaries}. */
const EDITORIAL_MONTH_TIME_ZONE = "Europe/Rome";

/** Chiave `YYYY-MM` per invalidare cache client a inizio mese (stesso calendario del backend). */
export function getEditorialMonthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_MONTH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) {
    throw new Error("Impossibile derivare il mese editoriale");
  }
  return `${year}-${month}`;
}
