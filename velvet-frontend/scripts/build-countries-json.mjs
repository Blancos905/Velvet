/**
 * Scarica l'elenco ISO 3166-1 (alpha-2) con nomi in italiano dove disponibili,
 * e scrive `src/data/countries.json` per il frontend.
 *
 * Uso: da `velvet-frontend/`: `node scripts/build-countries-json.mjs`
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "countries.json");

const url = "https://restcountries.com/v3.1/all?fields=cca2,name,translations";

const res = await fetch(url);
if (!res.ok) {
  console.error(res.status, await res.text());
  process.exit(1);
}
/** @type {unknown} */
const raw = await res.json();
if (!Array.isArray(raw)) {
  console.error("Risposta API non valida");
  process.exit(1);
}

/** @param {Record<string, unknown>} rec */
function displayName(rec) {
  const tr = rec.translations;
  if (tr && typeof tr === "object") {
    const ita = /** @type {Record<string, unknown>} */ (tr).ita;
    if (ita && typeof ita === "object") {
      const c = /** @type {Record<string, unknown>} */ (ita).common;
      if (typeof c === "string" && c.trim()) return c.trim();
    }
  }
  const name = rec.name;
  if (name && typeof name === "object") {
    const c = /** @type {Record<string, unknown>} */ (name).common;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

const rows = [];
for (const item of raw) {
  if (!item || typeof item !== "object") continue;
  const rec = /** @type {Record<string, unknown>} */ (item);
  const code = typeof rec.cca2 === "string" ? rec.cca2.trim().toUpperCase() : "";
  if (code.length !== 2) continue;
  const name = displayName(rec);
  if (!name) continue;
  rows.push({ code, name });
}

const byCode = new Map(rows.map((r) => [r.code, r]));
const deduped = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));

await writeFile(outPath, JSON.stringify(deduped, null, 0) + "\n", "utf8");
console.log("Scritto", outPath, "(" + deduped.length + " paesi)");
