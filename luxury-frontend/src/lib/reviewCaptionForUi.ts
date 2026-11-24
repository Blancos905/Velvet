import type { MessageKey } from "../i18n/messages";
import { intlLocaleForUi } from "../i18n/intlLocaleForUi";
import type { UiLocale } from "../i18n/locales";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Didascalia stelle + conteggio recensioni localizzata (es. «4,8/5 · 12 recensioni»). */
export function formatStarReviewCaption(
  avg: number,
  reviewCount: number,
  locale: UiLocale,
  t: Translate,
): string {
  const avgLabel = avg.toLocaleString(intlLocaleForUi(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const countLabel =
    reviewCount === 1 ? t("home.reviews.one") : t("home.reviews.many", { n: reviewCount });
  return `${avgLabel}/5 · ${countLabel}`;
}
