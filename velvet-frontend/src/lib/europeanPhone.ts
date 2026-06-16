import {
  DEFAULT_EUROPEAN_COUNTRY_CODE,
  EUROPEAN_PHONE_COUNTRIES,
  europeanCountryByCode,
  europeanCountryByDialCode,
} from "../data/europeanPhonePrefixes";

/** Solo cifre nel numero locale (senza prefisso internazionale). */
export function normalizeEuropeanLocalPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Numero completo E.164-like per API (`+39` + cifre locali). */
export function composeEuropeanPhone(dialCode: string, localNumber: string): string | undefined {
  const local = normalizeEuropeanLocalPhone(localNumber);
  if (!local) return undefined;
  const prefix = dialCode.trim();
  if (!prefix.startsWith("+")) return `+${prefix}${local}`;
  return `${prefix}${local}`;
}

/** Registrazione: ometti `phone` se l’utente non ha digitato cifre locali. */
export function optionalEuropeanPhoneForRegisterApi(dialCode: string, localNumber: string): string | undefined {
  return composeEuropeanPhone(dialCode, localNumber);
}

const DIAL_CODES_LONGEST_FIRST = [...new Set(EUROPEAN_PHONE_COUNTRIES.map((c) => c.dialCode))].sort(
  (a, b) => b.length - a.length,
);

/** Estrae prefisso e parte locale da un numero salvato (best effort). */
export function splitStoredEuropeanPhone(
  stored: string | null | undefined,
  fallbackCountryCode = DEFAULT_EUROPEAN_COUNTRY_CODE,
): { countryCode: string; dialCode: string; localNumber: string } {
  const fallback = europeanCountryByCode(fallbackCountryCode) ?? europeanCountryByCode("IT")!;
  const raw = (stored ?? "").trim();
  if (!raw) {
    return { countryCode: fallback.code, dialCode: fallback.dialCode, localNumber: "" };
  }

  for (const dial of DIAL_CODES_LONGEST_FIRST) {
    if (raw.startsWith(dial)) {
      const country = europeanCountryByDialCode(dial) ?? fallback;
      return {
        countryCode: country.code,
        dialCode: dial,
        localNumber: normalizeEuropeanLocalPhone(raw.slice(dial.length)),
      };
    }
  }

  return {
    countryCode: fallback.code,
    dialCode: fallback.dialCode,
    localNumber: normalizeEuropeanLocalPhone(raw.replace(/^\+/, "")),
  };
}
