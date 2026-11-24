import type { TopOperatorKindId } from "../data/topOperatorKinds";
import type { UiLocale } from "./locales";

export type TopOperatorKindText = { label: string; heading: string };

const TOP_OPERATOR_KIND_I18N: Partial<
  Record<UiLocale, Record<TopOperatorKindId, TopOperatorKindText>>
> = {
  en: {
    parrucchieri: { label: "Hairdressers", heading: "Top hairdressers" },
    estetisti: { label: "Beauty therapists", heading: "Top beauty therapists" },
    massaggi: { label: "Massage therapists", heading: "Top massage therapists" },
  },
  fr: {
    parrucchieri: { label: "Coiffeurs", heading: "Meilleurs coiffeurs" },
    estetisti: { label: "Esthéticiennes", heading: "Meilleures esthéticiennes" },
    massaggi: { label: "Massothérapeutes", heading: "Meilleurs massothérapeutes" },
  },
  de: {
    parrucchieri: { label: "Friseure", heading: "Top-Friseure" },
    estetisti: { label: "Kosmetiker", heading: "Top-Kosmetiker" },
    massaggi: { label: "Massage-Therapeuten", heading: "Top-Massage-Therapeuten" },
  },
  es: {
    parrucchieri: { label: "Peluqueros", heading: "Mejores peluqueros" },
    estetisti: { label: "Esteticistas", heading: "Mejores esteticistas" },
    massaggi: { label: "Masajistas", heading: "Mejores masajistas" },
  },
  pt: {
    parrucchieri: { label: "Cabeleireiros", heading: "Melhores cabeleireiros" },
    estetisti: { label: "Esteticistas", heading: "Melhores esteticistas" },
    massaggi: { label: "Massagistas", heading: "Melhores massagistas" },
  },
};

export function localizedTopOperatorKind(
  locale: UiLocale,
  kindId: TopOperatorKindId,
  fallback: TopOperatorKindText,
): TopOperatorKindText {
  if (locale === "it") return fallback;
  return TOP_OPERATOR_KIND_I18N[locale]?.[kindId] ?? TOP_OPERATOR_KIND_I18N.en?.[kindId] ?? fallback;
}
