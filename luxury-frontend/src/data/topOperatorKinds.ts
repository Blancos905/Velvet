/** Verticali classifica operatori — allineate a `SalonIdeaVertical` / `monthlyIdeaSalonKind`. */
export const TOP_OPERATOR_KINDS = [
  { id: "parrucchieri", label: "Parrucchieri", heading: "I migliori parrucchieri" },
  { id: "estetisti", label: "Estetisti", heading: "I migliori estetisti" },
  { id: "massaggi", label: "Massaggiatori", heading: "I migliori massaggiatori" },
] as const;

export const DEFAULT_TOP_OPERATOR_KIND: TopOperatorKindId = "parrucchieri";
export const TOP_OPERATORS_PAGE_LIMIT = 10;

export type TopOperatorKindId = (typeof TOP_OPERATOR_KINDS)[number]["id"];

export function findTopOperatorKind(kind: string | undefined): (typeof TOP_OPERATOR_KINDS)[number] | null {
  if (!kind?.trim()) return null;
  return TOP_OPERATOR_KINDS.find((k) => k.id === kind.trim()) ?? null;
}

export function topRatedOperatorsApiPath(
  kind: TopOperatorKindId,
  limit = TOP_OPERATORS_PAGE_LIMIT,
): string {
  const p = new URLSearchParams();
  p.set("salonKind", kind);
  p.set("limit", String(limit));
  return `/api/v1/public/organizations/top-rated-operators?${p.toString()}`;
}
