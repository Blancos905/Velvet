import type { UiLocale } from "../locales";
import { deMessages } from "./de";
import { enMessages } from "./en";
import { esMessages } from "./es";
import { frMessages } from "./fr";
import { itMessages, type MessageCatalog, type MessageKey } from "./it";
import { ptMessages } from "./pt";

export type { MessageCatalog, MessageKey };

export const MESSAGE_CATALOGS: Record<UiLocale, MessageCatalog> = {
  it: itMessages,
  en: enMessages,
  fr: frMessages,
  de: deMessages,
  es: esMessages,
  pt: ptMessages,
};

export function translateMessage(
  locale: UiLocale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw = MESSAGE_CATALOGS[locale][key] ?? MESSAGE_CATALOGS.it[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    return v == null ? `{${name}}` : String(v);
  });
}
