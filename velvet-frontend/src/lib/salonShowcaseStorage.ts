/**
 * Vetrina brand: persistita lato server (PostgreSQL via API) così le immagini caricate dal titolare sono visibili
 * su ogni dispositivo e nella WebView dell'app. IndexedDB resta come cache/fallback offline. Chiave = slug sede pubblica.
 */

import { apiFetch } from "../api/client";
import { isStandardLayoutTemplateId, type StandardLayoutTemplateId } from "../data/standardLayoutCatalog";
import { isWritingStyleId, type WritingStyleId } from "../data/writingStyleCatalog";
import { salonShowcaseIdbGet, salonShowcaseIdbSet } from "./salonShowcaseIdb";

export const SALON_SHOWCASE_STORAGE_VERSION = 1 as const;
export const SALON_SHOWCASE_CUSTOM_LAYOUT_VERSION = 1 as const;

export type ShowcaseCustomLayoutBlockId = "logo" | "title" | "description" | "carousel" | "services" | "position";

export type ShowcaseCustomLayoutBlock = {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
};

export type ShowcaseCustomLayout = {
  version: typeof SALON_SHOWCASE_CUSTOM_LAYOUT_VERSION;
  blocks: Record<ShowcaseCustomLayoutBlockId, ShowcaseCustomLayoutBlock>;
};

export type ShowcaseCustomTextStyles = {
  titleStyleId: WritingStyleId;
  bodyStyleId: WritingStyleId;
  buttonStyleId: WritingStyleId;
  titleColorHex: string | null;
  bodyColorHex: string | null;
  buttonTextColorHex: string | null;
  buttonBgColorHex: string | null;
};

function clampPct(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(min, v));
}

export function defaultShowcaseCustomLayout(): ShowcaseCustomLayout {
  return {
    version: SALON_SHOWCASE_CUSTOM_LAYOUT_VERSION,
    blocks: {
      logo: { x: 2, y: 2, w: 14, h: 20, scale: 1 },
      title: { x: 18, y: 2, w: 44, h: 12, scale: 1 },
      description: { x: 18, y: 14, w: 56, h: 10, scale: 1 },
      carousel: { x: 16, y: 26, w: 68, h: 42, scale: 1 },
      services: { x: 18, y: 66, w: 64, h: 20, scale: 1 },
      position: { x: 6, y: 88, w: 44, h: 10, scale: 1 },
    },
  };
}

export function parseShowcaseCustomLayout(raw: unknown): ShowcaseCustomLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<ShowcaseCustomLayout>;
  if (obj.version !== SALON_SHOWCASE_CUSTOM_LAYOUT_VERSION) return null;
  const src = obj.blocks as Partial<Record<ShowcaseCustomLayoutBlockId, Partial<ShowcaseCustomLayoutBlock>>> | undefined;
  if (!src) return null;
  const ids: ShowcaseCustomLayoutBlockId[] = ["logo", "title", "description", "carousel", "services", "position"];
  const next = defaultShowcaseCustomLayout();
  for (const id of ids) {
    const b = src[id];
    if (!b) continue;
    const x = clampPct(b.x, 0, 94);
    const y = clampPct(b.y, 0, 94);
    const w = clampPct(b.w, 6, 96);
    const h = clampPct(b.h, 6, 96);
    const scale = clampPct((b as { scale?: unknown }).scale ?? 1, 0.5, 2.5);
    if (x === null || y === null || w === null || h === null || scale === null) return null;
    next.blocks[id] = { x, y, w, h, scale };
  }
  return next;
}

export function defaultShowcaseCustomTextStyles(): ShowcaseCustomTextStyles {
  return {
    titleStyleId: "modern-sans",
    bodyStyleId: "modern-sans",
    buttonStyleId: "clean-rounded",
    titleColorHex: null,
    bodyColorHex: null,
    buttonTextColorHex: null,
    buttonBgColorHex: null,
  };
}

export function parseShowcaseCustomTextStyles(raw: unknown): ShowcaseCustomTextStyles | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<ShowcaseCustomTextStyles>;
  if (!isWritingStyleId(o.titleStyleId) || !isWritingStyleId(o.bodyStyleId) || !isWritingStyleId(o.buttonStyleId)) return null;
  return {
    titleStyleId: o.titleStyleId,
    bodyStyleId: o.bodyStyleId,
    buttonStyleId: o.buttonStyleId,
    titleColorHex: normalizeShowcaseHexColor(o.titleColorHex),
    bodyColorHex: normalizeShowcaseHexColor(o.bodyColorHex),
    buttonTextColorHex: normalizeShowcaseHexColor(o.buttonTextColorHex),
    buttonBgColorHex: normalizeShowcaseHexColor(o.buttonBgColorHex),
  };
}

/** Normalizza `#rrggbb` (accetta anche `rrggbb`). Ritorna `null` se non valido. */
export function normalizeShowcaseHexColor(raw: string | null | undefined): string | null {
  const s = raw?.trim() ?? "";
  if (!s) return null;
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  return `#${m[1].toLowerCase()}`;
}

export type SalonShowcaseStored = {
  version: typeof SALON_SHOWCASE_STORAGE_VERSION;
  logoDataUrl: string | null;
  /** Esattamente 5 slot carousel (null = vuoto). */
  siteImageDataUrls: [string | null, string | null, string | null, string | null, string | null];
  /** Testo vetrina sotto nome/città (layout pubblico / anteprima). */
  siteShowcaseDescription: string | null;
  /** Colore testo pill/bottoni servizi quando la vetrina è in contesto scena chiaro (`on-light`) o pagina pubblica (stesso slot dello scuro). */
  showcaseServiceTextHexOnLight: string | null;
  /** Colore testo pill/bottoni servizi in contesto scena scuro (`on-dark`) e sulla pagina `/s/…` senza scena. */
  showcaseServiceTextHexOnDark: string | null;
  /** Colore testo descrizione sito in contesto scena chiaro. */
  showcaseSiteDescHexOnLight: string | null;
  /** Colore testo descrizione sito in contesto scena scuro e sulla pagina `/s/…` senza scena. */
  showcaseSiteDescHexOnDark: string | null;
  /** `serviceId` → data URL foto listino. */
  servicePhotoDataUrls: Record<string, string>;
  /** `serviceId` → object-position CSS (es. `50% 50%`) per evitare crop sfavorevole. */
  servicePhotoObjectPositions: Record<string, string>;
  /** Gallery pagina "Esplora il nostro salone" (separata da Brand/vetrina). */
  exploreGalleryImageDataUrls: [string | null, string | null, string | null, string | null, string | null, string | null];
  /** Template layout vetrina salvato dal titolare (pagina pubblica /s/… su questo browser). */
  publicLayoutTemplateId: StandardLayoutTemplateId | null;
  /** Sfondo scena salvato dal titolare per la pagina pubblica `/s/…` (indice catalogo sfondi). */
  publicAmbientBgIndex: number | null;
  /** Layout libero drag&resize (creator) salvato dal titolare per `/s/…`. */
  publicCustomLayout: ShowcaseCustomLayout | null;
  /** Stili tipografici/colori del creator (titolo/corpo/pulsanti). */
  publicCustomTextStyles: ShowcaseCustomTextStyles | null;
};

const PREFIX = "velvet.salonShowcase.v1:";

const IDB_USABLE = typeof indexedDB !== "undefined";

export function showcaseStorageKey(slug: string): string {
  return `${PREFIX}${slug.trim().toLowerCase()}`;
}

export function emptySalonShowcase(): SalonShowcaseStored {
  return {
    version: SALON_SHOWCASE_STORAGE_VERSION,
    logoDataUrl: null,
    siteImageDataUrls: [null, null, null, null, null],
    siteShowcaseDescription: null,
    showcaseServiceTextHexOnLight: null,
    showcaseServiceTextHexOnDark: null,
    showcaseSiteDescHexOnLight: null,
    showcaseSiteDescHexOnDark: null,
    servicePhotoDataUrls: {},
    servicePhotoObjectPositions: {},
    exploreGalleryImageDataUrls: [null, null, null, null, null, null],
    publicLayoutTemplateId: null,
    publicAmbientBgIndex: null,
    publicCustomLayout: null,
    publicCustomTextStyles: null,
  };
}

export function parseSalonShowcaseJson(raw: string): SalonShowcaseStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SalonShowcaseStored>;
    if (parsed?.version !== SALON_SHOWCASE_STORAGE_VERSION) return null;
    const slots = parsed.siteImageDataUrls;
    const normalizedSlots: SalonShowcaseStored["siteImageDataUrls"] = [
      slots?.[0] ?? null,
      slots?.[1] ?? null,
      slots?.[2] ?? null,
      slots?.[3] ?? null,
      slots?.[4] ?? null,
    ];
    const exploreSlots = parsed.exploreGalleryImageDataUrls;
    const normalizedExploreSlots: SalonShowcaseStored["exploreGalleryImageDataUrls"] = [
      exploreSlots?.[0] ?? null,
      exploreSlots?.[1] ?? null,
      exploreSlots?.[2] ?? null,
      exploreSlots?.[3] ?? null,
      exploreSlots?.[4] ?? null,
      exploreSlots?.[5] ?? null,
    ];
    const layoutRaw = parsed.publicLayoutTemplateId;
    const publicLayoutTemplateId =
      typeof layoutRaw === "string" && isStandardLayoutTemplateId(layoutRaw) ? layoutRaw : null;
    const ambientRaw = parsed.publicAmbientBgIndex;
    const publicAmbientBgIndex =
      typeof ambientRaw === "number" && Number.isFinite(ambientRaw) && ambientRaw >= 0
        ? Math.floor(ambientRaw)
        : null;
    const publicCustomLayout = parseShowcaseCustomLayout(parsed.publicCustomLayout);
    const publicCustomTextStyles = parseShowcaseCustomTextStyles(parsed.publicCustomTextStyles);

    return {
      version: SALON_SHOWCASE_STORAGE_VERSION,
      logoDataUrl: typeof parsed.logoDataUrl === "string" ? parsed.logoDataUrl : null,
      siteImageDataUrls: normalizedSlots,
      siteShowcaseDescription:
        typeof parsed.siteShowcaseDescription === "string" ? parsed.siteShowcaseDescription : null,
      showcaseServiceTextHexOnLight: normalizeShowcaseHexColor(
        typeof parsed.showcaseServiceTextHexOnLight === "string" ? parsed.showcaseServiceTextHexOnLight : null,
      ),
      showcaseServiceTextHexOnDark: normalizeShowcaseHexColor(
        typeof parsed.showcaseServiceTextHexOnDark === "string" ? parsed.showcaseServiceTextHexOnDark : null,
      ),
      showcaseSiteDescHexOnLight: normalizeShowcaseHexColor(
        typeof parsed.showcaseSiteDescHexOnLight === "string" ? parsed.showcaseSiteDescHexOnLight : null,
      ),
      showcaseSiteDescHexOnDark: normalizeShowcaseHexColor(
        typeof parsed.showcaseSiteDescHexOnDark === "string" ? parsed.showcaseSiteDescHexOnDark : null,
      ),
      servicePhotoDataUrls:
        parsed.servicePhotoDataUrls && typeof parsed.servicePhotoDataUrls === "object"
          ? (parsed.servicePhotoDataUrls as Record<string, string>)
          : {},
      servicePhotoObjectPositions:
        parsed.servicePhotoObjectPositions && typeof parsed.servicePhotoObjectPositions === "object"
          ? (parsed.servicePhotoObjectPositions as Record<string, string>)
          : {},
      exploreGalleryImageDataUrls: normalizedExploreSlots,
      publicLayoutTemplateId,
      publicAmbientBgIndex,
      publicCustomLayout,
      publicCustomTextStyles,
    };
  } catch {
    return null;
  }
}

/** Token URL del contenuto vetrina lato server (cfr. backend `SalonSiteContentKind`). */
const SHOWCASE_SITE_CONTENT_KIND = "showcase";

type ServerSiteContentDto = { kind?: string; payload?: string | null; updatedAt?: string };

function normalizeSlugForApi(slug: string): string {
  return encodeURIComponent(slug.trim().toLowerCase());
}

function publicSiteContentPath(slug: string): string {
  return `/api/v1/public/organizations/${normalizeSlugForApi(slug)}/site-content/${SHOWCASE_SITE_CONTENT_KIND}`;
}

function ownerSiteContentPath(slug: string): string {
  return `/api/v1/me/salon/site-content/${normalizeSlugForApi(slug)}/${SHOWCASE_SITE_CONTENT_KIND}`;
}

/** Lettura pubblica dal server: raw JSON della vetrina, oppure `null` se non c'è (404) o offline. */
async function fetchServerShowcaseRaw(slug: string): Promise<string | null> {
  try {
    const r = await apiFetch(publicSiteContentPath(slug));
    if (!r.ok) return null;
    const dto = (await r.json()) as ServerSiteContentDto;
    return typeof dto.payload === "string" && dto.payload.length > 0 ? dto.payload : null;
  } catch {
    return null;
  }
}

/** Salvataggio sul server (titolare autenticato). */
async function putServerShowcaseRaw(
  slug: string,
  payload: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await apiFetch(ownerSiteContentPath(slug), {
      method: "PUT",
      accessToken,
      body: JSON.stringify({ payload }),
    });
    if (!r.ok) {
      if (r.status === 413) {
        return {
          ok: false,
          error:
            "Immagini troppo grandi per il salvataggio sul server: riduci il numero di foto o usa file più leggeri.",
        };
      }
      return { ok: false, error: "Salvataggio sul server non riuscito. Riprova tra poco." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Server non raggiungibile: verifica la connessione e riprova." };
  }
}

function readLegacyLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLegacyLocalStorage(key: string, payload: string): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(key, payload);
    return { ok: true };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return {
        ok: false,
        error:
          "Spazio `localStorage` esaurito: usa un browser aggiornato o svuota i dati del sito. La vetrina preferisce IndexedDB (quota molto più alta).",
      };
    }
    return { ok: false, error: "Salvataggio locale non riuscito." };
  }
}

/** Scrive il raw JSON nella cache locale (IndexedDB, fallback `localStorage`). */
async function writeLocalShowcaseRaw(
  key: string,
  payload: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (IDB_USABLE) {
    try {
      await salonShowcaseIdbSet(key, payload);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return { ok: true };
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
        return {
          ok: false,
          error:
            "Spazio sul dispositivo insufficiente per la cache locale: rimuovi qualche foto o usa file più piccoli.",
        };
      }
      const ls = writeLegacyLocalStorage(key, payload);
      if (ls.ok) return { ok: true };
      return ls;
    }
  }

  return writeLegacyLocalStorage(key, payload);
}

/** Legge la cache locale (IndexedDB, con migrazione automatica da `localStorage` legacy). */
async function readLocalShowcaseRaw(key: string): Promise<string | null> {
  let raw: string | null = null;

  if (IDB_USABLE) {
    try {
      raw = await salonShowcaseIdbGet(key);
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    raw = readLegacyLocalStorage(key);
    if (raw && IDB_USABLE) {
      try {
        await salonShowcaseIdbSet(key, raw);
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      } catch {
        /* resta anche su LS finché IDB non scrive */
      }
    }
  }

  return raw;
}

/**
 * Legge la vetrina: **server prima** (pubblico, visibile su ogni dispositivo/app), con fallback alla cache locale
 * (IndexedDB / `localStorage` legacy). Quando il server risponde, aggiorna anche la cache locale.
 *
 * Migrazione automatica: se passi `accessToken` (titolare autenticato) e il server non ha ancora nulla mentre la
 * cache locale contiene una vetrina salvata prima dello storage server-side, la ripubblica una volta sul server
 * così diventa visibile su ogni dispositivo e nell'app — senza che il titolare debba risalvare a mano.
 */
export async function readSalonShowcaseAsync(
  slug: string,
  accessToken?: string | null,
): Promise<SalonShowcaseStored | null> {
  const key = showcaseStorageKey(slug);

  const [serverRaw, localRaw] = await Promise.all([
    fetchServerShowcaseRaw(slug),
    readLocalShowcaseRaw(key),
  ]);
  const serverParsed = serverRaw ? parseSalonShowcaseJson(serverRaw) : null;
  const localParsed = localRaw ? parseSalonShowcaseJson(localRaw) : null;

  const localForUse = localParsed ? normalizeShowcaseForDisplay(localParsed) : null;
  const serverForUse = serverParsed ? normalizeShowcaseForDisplay(serverParsed) : null;

  if (accessToken && localRaw && localForUse && salonShowcaseHasContent(localForUse)) {
    const shouldPublish =
      !serverRaw || salonShowcaseLocalRicherThanServer(serverForUse, localForUse);
    if (shouldPublish) {
      const payload = JSON.stringify(localForUse);
      const put = await putServerShowcaseRaw(slug, payload, accessToken);
      if (put.ok) {
        void writeLocalShowcaseRaw(key, payload);
        return localForUse;
      }
    }
  }

  if (serverForUse && serverRaw) {
    const cleaned = JSON.stringify(serverForUse);
    void writeLocalShowcaseRaw(key, cleaned);
    return serverForUse;
  }

  return localForUse;
}

/**
 * Salva la vetrina sul **server** (se `accessToken` presente: titolare autenticato) e nella cache locale.
 * Il server è la fonte di verità cross-device; senza token resta solo la cache locale (es. dev/seed).
 */
export async function writeSalonShowcaseAsync(
  slug: string,
  data: SalonShowcaseStored,
  accessToken?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = showcaseStorageKey(slug);
  const payload = JSON.stringify(data);

  const localResult = await writeLocalShowcaseRaw(key, payload);

  if (accessToken) {
    const server = await putServerShowcaseRaw(slug, payload, accessToken);
    // Se la cache locale è piena ma il server ha salvato, va comunque bene: il server è la fonte di verità.
    return server;
  }

  return localResult;
}

/** Placeholder SVG di test/seed (non foto caricate dal titolare). */
function isSvgPlaceholderDataUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("data:image/svg+xml");
}

/** Rimuove logo/carosello/gallery finti (SVG generati) così la UI non mostra immagini fuori contesto. */
export function salonShowcaseWithoutSvgPlaceholders(s: SalonShowcaseStored): SalonShowcaseStored {
  const siteImageDataUrls = s.siteImageDataUrls.map((u) =>
    u && isSvgPlaceholderDataUrl(u) ? null : u,
  ) as SalonShowcaseStored["siteImageDataUrls"];
  const exploreGalleryImageDataUrls = s.exploreGalleryImageDataUrls.map((u) =>
    u && isSvgPlaceholderDataUrl(u) ? null : u,
  ) as SalonShowcaseStored["exploreGalleryImageDataUrls"];
  const logoDataUrl = s.logoDataUrl && isSvgPlaceholderDataUrl(s.logoDataUrl) ? null : s.logoDataUrl;
  return { ...s, logoDataUrl, siteImageDataUrls, exploreGalleryImageDataUrls };
}

function normalizeShowcaseForDisplay(s: SalonShowcaseStored | null): SalonShowcaseStored | null {
  if (!s) return null;
  return salonShowcaseWithoutSvgPlaceholders(s);
}

export function salonShowcaseHasContent(s: SalonShowcaseStored | null | undefined): boolean {
  const n = s ? normalizeShowcaseForDisplay(s) : null;
  if (!n) return false;
  if (n.logoDataUrl) return true;
  if (n.siteImageDataUrls.some(Boolean)) return true;
  if (n.siteShowcaseDescription?.trim()) return true;
  return Object.keys(n.servicePhotoDataUrls).length > 0;
}

/** Logo o immagini carousel (blocco vetrina in cima a `/s/…`). Le sole foto servizio restano nel listino sotto. */
export function salonShowcaseHasHeroOrCarousel(s: SalonShowcaseStored | null | undefined): boolean {
  const n = s ? normalizeShowcaseForDisplay(s) : null;
  if (!n) return false;
  if (n.logoDataUrl) return true;
  return n.siteImageDataUrls.some(Boolean);
}

/** Stima dimensione payload visivo (data URL) per confrontare locale vs server. */
function showcaseVisualPayloadBytes(s: SalonShowcaseStored | null | undefined): number {
  if (!s) return 0;
  let n = 0;
  if (s.logoDataUrl) n += s.logoDataUrl.length;
  for (const u of s.siteImageDataUrls) {
    if (u) n += u.length;
  }
  for (const u of s.exploreGalleryImageDataUrls) {
    if (u) n += u.length;
  }
  for (const u of Object.values(s.servicePhotoDataUrls)) {
    n += u.length;
  }
  return n;
}

/**
 * La cache locale ha contenuto visivo più ricco di quanto pubblicato sul server
 * (es. foto JPEG reali vs vetrina vuota o seed SVG leggero).
 */
export function salonShowcaseLocalRicherThanServer(
  server: SalonShowcaseStored | null,
  local: SalonShowcaseStored | null,
): boolean {
  if (!local || !salonShowcaseHasContent(local)) return false;
  if (!server || !salonShowcaseHasContent(server)) return true;
  const localBytes = showcaseVisualPayloadBytes(local);
  const serverBytes = showcaseVisualPayloadBytes(server);
  if (localBytes >= 20_000 && serverBytes < 8_000) return true;
  if (salonShowcaseHasHeroOrCarousel(local) && !salonShowcaseHasHeroOrCarousel(server)) return true;
  return localBytes > serverBytes * 1.25;
}

/** Mostra il guscio vetrina (carousel/hero) anche solo con descrizione sito, senza immagini. */
export function salonShowcaseShowsVetrinaShell(s: SalonShowcaseStored | null | undefined): boolean {
  if (!s) return false;
  if (salonShowcaseHasHeroOrCarousel(s)) return true;
  return Boolean(s.siteShowcaseDescription?.trim());
}
