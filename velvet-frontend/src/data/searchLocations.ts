import comuniJson from "comuni-json/comuni.json";
import countriesJson from "./countries.json";

/** ISO 3166-1 alpha-2 (es. `IT`, `DE`). Elenco completo in `countries.json`. */
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

/** Normalizza CAP: solo cifre. */
export function normalizeCapInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

function sortCountriesItFirst(rows: CountryRow[]): CountryRow[] {
  const it = rows.find((r) => r.code === "IT");
  const rest = rows.filter((r) => r.code !== "IT").sort((a, b) => a.name.localeCompare(b.name, "it"));
  return it ? [it, ...rest] : [...rows].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Paesi (ISO alpha-2 + nome in italiano dove disponibile). Generato con `node scripts/build-countries-json.mjs`. */
export const COUNTRIES: { code: CountryCode; name: string }[] = sortCountriesItFirst(
  countriesJson as CountryRow[],
);

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

/** Lunghezza CAP attesa per il paese (per risoluzione tramite servizio pubblico). */
export function expectedCapLength(country: CountryCode): number {
  switch (country) {
    case "CH":
      return 4;
    case "GB":
    case "IE":
    case "MT":
    case "NL":
      return 0;
    case "IT":
    case "SM":
    default:
      return 5;
  }
}
