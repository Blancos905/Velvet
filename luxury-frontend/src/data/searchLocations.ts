import comuniJson from "comuni-json/comuni.json";
import countriesJson from "./countries.json";
import { isSearchCountryCode, SEARCH_COUNTRY_CODES } from "./searchCountryCodes";

/** ISO 3166-1 alpha-2 (es. `IT`, `DE`). Catalogo completo in `countries.json`. */
export type CountryCode = string;

export type CityEntry = {
  cap: string;
  /** Testo usato da `findByCityContainingIgnoreCase` lato backend */
  city: string;
  province?: string;
};

type ComuneJsonEntry = {
  nome?: string;
  cap?: string[];
  sigla?: string;
};

type CountryRow = { code: string; name: string };

/** Normalizza CAP: solo cifre (Italia e paesi a cifre). Preferisci `normalizePostalInput` se conosci il paese. */
export function normalizeCapInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Paesi con postcode alfanumerico (Nominatim non va “digit-only”). */
const FREEFORM_POSTAL_COUNTRIES = new Set([
  "GB",
  "IE",
  "NL",
  "MT",
  "CA",
  "AR",
  "BN",
  "JM",
  "SZ",
  "VG",
  "AI",
  "BM",
  "KY",
  "TC",
]);

const DIGIT_LEN: Record<number, readonly string[]> = {
  3: ["IS", "LS"],
  4: ["AT", "AU", "BE", "BG", "CH", "DK", "HU", "LI", "LU", "MD", "NO", "NZ", "SI"],
  5: [
    "AL",
    "BA",
    "CY",
    "CZ",
    "DE",
    "EE",
    "ES",
    "FI",
    "FR",
    "GR",
    "HR",
    "IT",
    "LT",
    "LV",
    "ME",
    "MK",
    "MX",
    "PL",
    "RS",
    "SE",
    "SK",
    "SM",
    "UA",
    "US",
    "XK",
    "DZ",
    "MA",
    "TN",
    "TR",
    "TH",
    "MY",
    "ID",
    "PH",
    "SA",
    "AE",
    "EG",
    "ZA",
  ],
  6: ["IN", "RO", "SG", "RU", "BY", "AM", "AZ", "GE"],
  7: ["PT", "JP", "IL"],
  8: ["BR", "IR"],
  9: ["CN"],
};

const DIGIT_LEN_BY_COUNTRY: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const [lenStr, codes] of Object.entries(DIGIT_LEN)) {
    const len = Number(lenStr);
    for (const code of codes) m[code] = len;
  }
  return m;
})();

export function isFreeformPostalCountry(country: CountryCode): boolean {
  return FREEFORM_POSTAL_COUNTRIES.has(country.trim().toUpperCase());
}

/**
 * Lunghezza CAP attesa (cifre). `0` = postcode alfanumerico / formato libero
 * (GB, IE, NL, …): non forzare lunghezza fissa, resolve via Nominatim con ≥3 caratteri.
 */
export function expectedCapLength(country: CountryCode): number {
  const c = country.trim().toUpperCase();
  if (isFreeformPostalCountry(c)) return 0;
  return DIGIT_LEN_BY_COUNTRY[c] ?? 5;
}

/** Minimo caratteri normalizzati per tentare resolve / anteprima CAP. */
export function minPostalResolveLength(country: CountryCode): number {
  const exact = expectedCapLength(country);
  return exact > 0 ? exact : 3;
}

/** True quando il CAP è abbastanza completo da risolvere in comune. */
export function isPostalComplete(normalized: string, country: CountryCode): boolean {
  const c = country.trim().toUpperCase();
  if (!normalized) return false;
  if (isFreeformPostalCountry(c)) {
    return normalized.replace(/\s/g, "").length >= 3;
  }
  if (c === "PT" && normalized.length === 4) return true;
  if (c === "US" && normalized.length === 5) return true;
  const exact = expectedCapLength(c);
  return exact > 0 ? normalized.length === exact : normalized.length >= 3 && normalized.length <= 12;
}

/**
 * Normalizza CAP/postcode in base al paese (allineato a `PostalCodeFormats` backend).
 */
export function normalizePostalInput(raw: string, country: CountryCode): string {
  const c = country.trim().toUpperCase();
  if (isFreeformPostalCountry(c)) {
    return raw
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  let digits = normalizeCapInput(raw);
  if (c === "US" && digits.length === 9) digits = digits.slice(0, 5);
  return digits;
}

function sortCountriesItFirst(rows: CountryRow[]): CountryRow[] {
  const it = rows.find((r) => r.code === "IT");
  const rest = rows.filter((r) => r.code !== "IT").sort((a, b) => a.name.localeCompare(b.name, "it"));
  return it ? [it, ...rest] : [...rows].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Tutti i paesi ISO (nomi in italiano dove disponibile). Generato con `node scripts/build-countries-json.mjs`. */
export const ALL_COUNTRIES: { code: CountryCode; name: string }[] = sortCountriesItFirst(
  countriesJson as CountryRow[],
);

/**
 * Paesi selezionabili in home («Affina la zona → Nazioni»): Europa + grandi mercati mondiali.
 * @see `searchCountryCodes.ts`
 */
export const SEARCH_COUNTRIES: { code: CountryCode; name: string }[] = sortCountriesItFirst(
  ALL_COUNTRIES.filter((c) => isSearchCountryCode(c.code)),
);

/** Alias per la UI ricerca home (menu Nazioni). */
export const COUNTRIES = SEARCH_COUNTRIES;

export { SEARCH_COUNTRY_CODES, isSearchCountryCode };

/**
 * Emoji bandiera da codice ISO alpha-2 (Regional Indicator Symbols).
 * Su alcuni OS (es. Windows senza font emoji) può mostrare le due lettere invece della bandiera.
 */
export function countryFlagEmoji(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "";
  const base = 0x1f1e6; // Regional Indicator Symbol Letter A
  return String.fromCodePoint(base + (c.charCodeAt(0) - 65), base + (c.charCodeAt(1) - 65));
}

/** Comuni italiani completi (da `comuni-json`) con CAP principale e sigla provincia. */
const ITALIAN_CITY_CATALOG: CityEntry[] = (() => {
  const entries = comuniJson as ComuneJsonEntry[];
  const out: CityEntry[] = [];
  for (const e of entries) {
    const city = typeof e.nome === "string" ? e.nome.trim() : "";
    if (!city) continue;
    const caps = Array.isArray(e.cap) ? e.cap : [];
    let primary = "";
    for (const raw of caps) {
      const n = normalizeCapInput(String(raw ?? ""));
      if (n) {
        primary = n;
        break;
      }
    }
    if (!primary) {
      const raw0 = caps[0];
      if (raw0 == null || String(raw0).trim() === "") continue;
      primary = normalizeCapInput(String(raw0)) || String(raw0).trim();
    }
    const province = typeof e.sigla === "string" ? e.sigla.trim() : undefined;
    out.push({ cap: primary, city, province });
  }
  out.sort((a, b) => a.city.localeCompare(b.city, "it"));
  return out;
})();

/** Liste città locali ridotte (Italia usa `ITALIAN_CITY_CATALOG`). */
export const CITIES_BY_COUNTRY: Partial<Record<CountryCode, CityEntry[]>> = {
  CH: [
    { cap: "8001", city: "Zürich" },
    { cap: "1201", city: "Genève" },
    { cap: "3000", city: "Bern" },
    { cap: "4001", city: "Basel" },
    { cap: "6000", city: "Luzern" },
    { cap: "6900", city: "Lugano" },
    { cap: "8002", city: "Winterthur" },
    { cap: "9000", city: "St. Gallen" },
  ].sort((a, b) => a.city.localeCompare(b.city, "it")),
  SM: [{ cap: "47890", city: "San Marino" }],
};

/** Catalogo statico per suggerimenti città in home (Italia = tutti i comuni `comuni-json`). */
export function getStaticCityEntries(country: CountryCode): CityEntry[] {
  if (country === "IT") return ITALIAN_CITY_CATALOG;
  return CITIES_BY_COUNTRY[country] ?? [];
}

const ITALY_CAP_TO_LOCALITIES = (() => {
  const m = new Map<string, string[]>();
  const entries = comuniJson as ComuneJsonEntry[];
  for (const e of entries) {
    const city = typeof e.nome === "string" ? e.nome.trim() : "";
    if (!city) continue;
    const caps = Array.isArray(e.cap) ? e.cap : [];
    for (const rawCap of caps) {
      const cap = normalizeCapInput(rawCap ?? "");
      if (!cap) continue;
      const list = m.get(cap) ?? [];
      if (!list.some((x) => x.toLowerCase() === city.toLowerCase())) {
        list.push(city);
      }
      m.set(cap, list);
    }
  }
  return m;
})();

const ITALY_CAP_PREFIX_MAX_RESULTS = 120;

/** Comuni italiani per CAP (5 cifre = tutti i comuni con quel CAP; prefisso = anteprima limitata). */
export function italianLocalitiesByCapPrefix(capPrefixRaw: string): { cap: string; city: string }[] {
  const prefix = normalizeCapInput(capPrefixRaw);
  if (!prefix) return [];
  const out: { cap: string; city: string }[] = [];

  if (prefix.length === 5) {
    const cities = ITALY_CAP_TO_LOCALITIES.get(prefix);
    if (cities) {
      for (const city of cities) {
        out.push({ cap: prefix, city });
      }
    }
    out.sort((a, b) => a.city.localeCompare(b.city, "it"));
    return out;
  }

  for (const [cap, cities] of ITALY_CAP_TO_LOCALITIES.entries()) {
    if (!cap.startsWith(prefix)) continue;
    for (const city of cities) {
      out.push({ cap, city });
      if (out.length >= ITALY_CAP_PREFIX_MAX_RESULTS) {
        out.sort((a, b) => {
          if (a.cap !== b.cap) return a.cap.localeCompare(b.cap, "it");
          return a.city.localeCompare(b.city, "it");
        });
        return out;
      }
    }
  }
  out.sort((a, b) => {
    if (a.cap !== b.cap) return a.cap.localeCompare(b.cap, "it");
    return a.city.localeCompare(b.city, "it");
  });
  return out;
}

/** Risolve un CAP italiano completo (5 cifre) senza chiamate di geocodifica esterne. */
export function resolveItalianCityForCap(capDigits: string): string | null {
  const normalized = normalizeCapInput(capDigits);
  if (normalized.length !== 5) return null;
  const rows = italianLocalitiesByCapPrefix(normalized);
  if (rows.length === 0) return null;
  return rows[0]?.city ?? null;
}

/** Etichetta menu «Città». */
export function formatCitySelectLabel(c: CityEntry): string {
  const prov = c.province ? ` (${c.province})` : "";
  return `${c.city}${prov}`;
}

/** Chiave stabile per il valore della `<select>` */
export function cityOptionValue(country: CountryCode, c: CityEntry): string {
  return `${country}|${c.cap}|${c.city}`;
}

export function parseCitySelection(value: string): { country: CountryCode; city: string } | null {
  if (!value) return null;
  const parts = value.split("|");
  if (parts.length < 3) return null;
  const country = parts[0];
  if (!/^[A-Z]{2}$/.test(country)) return null;
  const isKnownCountry = COUNTRIES.some((c) => c.code === country);
  if (!isKnownCountry) return null;
  const city = parts.slice(2).join("|");
  return { country, city };
}
