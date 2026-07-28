export type SupportInboxMetaLine = {
  label: string;
  value: string;
};

export type ParsedSupportInboxBody = {
  userMessage: string;
  metaLines: SupportInboxMetaLine[];
  /** True se il testo segue il formato assistenza (messaggio + blocco meta dopo `---`). */
  hasStructuredMeta: boolean;
};

const SEP = /\r?\n---\s*\r?\n/;

/**
 * Parsa il corpo delle richieste assistenza (`MeSupportService`): messaggio utente,
 * poi separatore `---` e righe `Etichetta: valore`.
 */
export function parseSupportInboxBody(raw: string): ParsedSupportInboxBody {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { userMessage: "", metaLines: [], hasStructuredMeta: false };
  }

  const parts = trimmed.split(SEP);
  if (parts.length < 2) {
    return { userMessage: trimmed, metaLines: [], hasStructuredMeta: false };
  }

  const userMessage = parts[0].trim();
  const metaBlock = parts.slice(1).join("\n").trim();
  const metaLines: SupportInboxMetaLine[] = [];

  for (const rawLine of metaBlock.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const label = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (label) metaLines.push({ label, value });
  }

  return {
    userMessage,
    metaLines,
    hasStructuredMeta: metaLines.length > 0,
  };
}

const EMAIL_IN_PARENS = /\(\s*([^)\s]+@[^)\s]+)\s*\)/;
const EMAIL_STANDALONE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

/** Estrae l'email dal valore della riga Richiedente, es. `Nome (a@b.it)`. */
export function extractEmailFromRichiedenteValue(value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const fromParens = v.match(EMAIL_IN_PARENS);
  if (fromParens?.[1]) return fromParens[1].trim();
  const standalone = v.match(EMAIL_STANDALONE);
  return standalone?.[0]?.trim() ?? null;
}

const NOTIFICATION_TYPE_IT: Record<string, string> = {
  SUPPORT_REQUEST_TO_LUXURY: "Richiesta assistenza a Luxury",
  ADMIN_PLATFORM_MESSAGE: "Messaggio dalla piattaforma",
};

export function humanizeNotificationType(code: string): string {
  if (!code) return "—";
  return NOTIFICATION_TYPE_IT[code] ?? code.replaceAll("_", " ").toLowerCase();
}

const NOTIFICATION_STATUS_IT: Record<string, string> = {
  PENDING: "In coda",
  SENT: "Inviato",
  CANCELLED: "Annullato",
};

export function humanizeNotificationStatus(code: string): string {
  if (!code) return "—";
  return NOTIFICATION_STATUS_IT[code] ?? code.toLowerCase();
}

/** Etichetta relativa breve in italiano (solo passato). */
export function formatRelativePastIt(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "poco fa";
  const min = Math.floor(sec / 60);
  if (min < 1) return "poco fa";
  if (min < 60) return min === 1 ? "1 minuto fa" : `${min} minuti fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "1 ora fa" : `${h} ore fa`;
  const d = Math.floor(h / 24);
  if (d < 14) return d === 1 ? "1 giorno fa" : `${d} giorni fa`;
  const w = Math.floor(d / 7);
  if (w < 8) return w === 1 ? "1 settimana fa" : `${w} settimane fa`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo <= 1 ? "circa 1 mese fa" : `${mo} mesi fa`;
  const y = Math.floor(d / 365);
  return y <= 1 ? "circa 1 anno fa" : `${y} anni fa`;
}
