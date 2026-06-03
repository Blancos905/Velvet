#!/usr/bin/env node
/**
 * Prova Base44 da terminale (legge .env.local).
 * Uso: node scripts/base44-smoke.mjs [NomeEntità]
 * Esempio: node scripts/base44-smoke.mjs Clienti
 */
import { createClient } from "@base44/sdk";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

if (!existsSync(envPath)) {
  console.error("Manca .env.local (VITE_BASE44_APP_ID, VITE_BASE44_API_KEY).");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const get = (k) => {
  const m = raw.match(new RegExp("^" + k + "=(.+)$", "m"));
  return m ? m[1].trim() : "";
};

const appId = get("VITE_BASE44_APP_ID");
const apiKey = get("VITE_BASE44_API_KEY");
const serverUrl = get("VITE_BASE44_SERVER_URL") || undefined;

if (!appId || !apiKey) {
  console.error("Valorizza VITE_BASE44_APP_ID e VITE_BASE44_API_KEY in .env.local");
  process.exit(1);
}

const entityName = process.argv[2] || "User";

const client = createClient({
  appId,
  ...(serverUrl ? { serverUrl } : {}),
  headers: { api_key: apiKey },
});

try {
  const handler = client.entities[entityName];
  if (!handler || typeof handler.list !== "function") {
    console.error(`Entità «${entityName}» non disponibile sul client (nome esatto come in Base44 → Data).`);
    process.exit(1);
  }
  const rows = await handler.list();
  const n = Array.isArray(rows) ? rows.length : "?";
  console.log(`OK: entities.${entityName}.list() → ${n} record(s)`);
  if (Array.isArray(rows) && rows.length > 0) {
    console.log(JSON.stringify(rows[0], null, 2).slice(0, 1200));
    if (rows.length > 1) console.log(`… +${rows.length - 1} altri`);
  }
} catch (e) {
  const msg = e?.message || String(e);
  console.error("ERRORE:", msg);
  if (msg.includes("not found") || msg.includes("404")) {
    console.error(`
Suggerimenti:
  • L'appId in .env.local deve essere quello del progetto giusto (URL editor: …/apps/<APP_ID>/editor/…).
  • Se «clienti» è un'altra app Base44, copia l'appId da quella dashboard.
  • Il nome entità deve coincidere con Data → modello (es. Clienti, User, …).`);
  }
  process.exit(1);
}
