import countriesJson from "./countries.json";

type CountryRow = { code: string; name: string };

const ALL_COUNTRIES: CountryRow[] = countriesJson as CountryRow[];

/** Paese europeo con prefisso telefonico internazionale (software EU). */
export type EuropeanPhoneCountry = {
  code: string;
  name: string;
  dialCode: string;
};

/** ISO alpha-2 → prefisso ITU (solo Europa: UE, SEE, EFTA, UK, microstati). */
const EUROPEAN_DIAL_CODES: Record<string, string> = {
  AD: "+376",
  AL: "+355",
  AT: "+43",
  BA: "+387",
  BE: "+32",
  BG: "+359",
  CH: "+41",
  CY: "+357",
  CZ: "+420",
  DE: "+49",
  DK: "+45",
  EE: "+372",
  ES: "+34",
  FI: "+358",
  FR: "+33",
  GB: "+44",
  GR: "+30",
  HR: "+385",
  HU: "+36",
  IE: "+353",
  IS: "+354",
  IT: "+39",
  LI: "+423",
  LT: "+370",
  LU: "+352",
  LV: "+371",
  MC: "+377",
  MD: "+373",
  ME: "+382",
  MK: "+389",
  MT: "+356",
  NL: "+31",
  NO: "+47",
  PL: "+48",
  PT: "+351",
  RO: "+40",
  RS: "+381",
  SE: "+46",
  SI: "+386",
  SK: "+421",
  SM: "+378",
  UA: "+380",
  XK: "+383",
};

function buildEuropeanPhoneCountries(): EuropeanPhoneCountry[] {
  const rows: EuropeanPhoneCountry[] = [];
  for (const c of ALL_COUNTRIES) {
    const dialCode = EUROPEAN_DIAL_CODES[c.code];
    if (!dialCode) continue;
    rows.push({ code: c.code, name: c.name, dialCode });
  }
  const it = rows.find((r) => r.code === "IT");
  const rest = rows.filter((r) => r.code !== "IT").sort((a, b) => a.name.localeCompare(b.name, "it"));
  return it ? [it, ...rest] : rest;
}

export const EUROPEAN_PHONE_COUNTRIES: EuropeanPhoneCountry[] = buildEuropeanPhoneCountries();

export const DEFAULT_EUROPEAN_COUNTRY_CODE = "IT";

export function europeanCountryByCode(code: string): EuropeanPhoneCountry | undefined {
  const norm = code.trim().toUpperCase();
  return EUROPEAN_PHONE_COUNTRIES.find((c) => c.code === norm);
}

export function europeanCountryByDialCode(dialCode: string): EuropeanPhoneCountry | undefined {
  const norm = dialCode.trim();
  return EUROPEAN_PHONE_COUNTRIES.find((c) => c.dialCode === norm);
}
