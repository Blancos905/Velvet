import type { StandardLayoutTemplateId } from "../data/standardLayoutCatalog";

export function showcaseLayoutThemeClass(id: StandardLayoutTemplateId): string {
  return `velvet-salon-showcase--t-${id}`;
}
