import { apiFetch } from "../api/client";

export type SalonPersonalPageData = {
  heroTitle: string;
  heroSubtitle: string;
  ownerIntro: string;
  about: string;
  strengths: string;
  openingHours: string;
  bookingNote: string;
  bookingCtaLabel: string;
  instagramUrl: string;
  facebookUrl: string;
  contactsNote: string;
  galleryImageDataUrls: [string | null, string | null, string | null, string | null, string | null, string | null];
};

const PREFIX = "luxury.salonPersonalPage.v1:";

/** Token URL del contenuto sito lato server (cfr. backend `SalonSiteContentKind`). */
const PERSONAL_PAGE_SITE_CONTENT_KIND = "personal-page";

function keyForSlug(slug: string): string {
  return `${PREFIX}${slug.trim().toLowerCase()}`;
}

function normalizeSlugForApi(slug: string): string {
  return encodeURIComponent(slug.trim().toLowerCase());
}

type ServerSiteContentDto = { kind?: string; payload?: string | null; updatedAt?: string };

async function fetchServerPersonalRaw(slug: string): Promise<string | null> {
  try {
    const r = await apiFetch(
      `/api/v1/public/organizations/${normalizeSlugForApi(slug)}/site-content/${PERSONAL_PAGE_SITE_CONTENT_KIND}`,
    );
    if (!r.ok) return null;
    const dto = (await r.json()) as ServerSiteContentDto;
    return typeof dto.payload === "string" && dto.payload.length > 0 ? dto.payload : null;
  } catch {
    return null;
  }
}

async function putServerPersonalRaw(slug: string, payload: string, accessToken: string): Promise<boolean> {
  try {
    const r = await apiFetch(
      `/api/v1/me/salon/site-content/${normalizeSlugForApi(slug)}/${PERSONAL_PAGE_SITE_CONTENT_KIND}`,
      {
        method: "PUT",
        accessToken,
        body: JSON.stringify({ payload }),
      },
    );
    return r.ok;
  } catch {
    return false;
  }
}

function parseSalonPersonalPageJson(raw: string): SalonPersonalPageData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SalonPersonalPageData>;
    return {
      heroTitle: typeof parsed.heroTitle === "string" ? parsed.heroTitle : "Benvenuto nel nostro salone",
      heroSubtitle: typeof parsed.heroSubtitle === "string" ? parsed.heroSubtitle : "",
      ownerIntro: typeof parsed.ownerIntro === "string" ? parsed.ownerIntro : "",
      about: typeof parsed.about === "string" ? parsed.about : "",
      strengths: typeof parsed.strengths === "string" ? parsed.strengths : "",
      openingHours:
        typeof parsed.openingHours === "string" ? parsed.openingHours : "Martedi - Sabato 08:30 - 19:00",
      bookingNote:
        typeof parsed.bookingNote === "string" ? parsed.bookingNote : "Prenota come e quando vuoi con un semplice click.",
      bookingCtaLabel: typeof parsed.bookingCtaLabel === "string" ? parsed.bookingCtaLabel : "Prenota ora",
      instagramUrl: typeof parsed.instagramUrl === "string" ? parsed.instagramUrl : "",
      facebookUrl: typeof parsed.facebookUrl === "string" ? parsed.facebookUrl : "",
      contactsNote: typeof parsed.contactsNote === "string" ? parsed.contactsNote : "",
      galleryImageDataUrls: [
        parsed.galleryImageDataUrls?.[0] ?? null,
        parsed.galleryImageDataUrls?.[1] ?? null,
        parsed.galleryImageDataUrls?.[2] ?? null,
        parsed.galleryImageDataUrls?.[3] ?? null,
        parsed.galleryImageDataUrls?.[4] ?? null,
        parsed.galleryImageDataUrls?.[5] ?? null,
      ],
    };
  } catch {
    return null;
  }
}

export function emptySalonPersonalPageData(): SalonPersonalPageData {
  return {
    heroTitle: "Benvenuto nel nostro salone",
    heroSubtitle: "",
    ownerIntro: "",
    about: "",
    strengths: "",
    openingHours: "Martedi - Sabato 08:30 - 19:00",
    bookingNote: "Prenota come e quando vuoi con un semplice click.",
    bookingCtaLabel: "Prenota ora",
    instagramUrl: "",
    facebookUrl: "",
    contactsNote: "",
    galleryImageDataUrls: [null, null, null, null, null, null],
  };
}

/** Lettura locale (cache `localStorage`). */
export function readSalonPersonalPageData(slug: string): SalonPersonalPageData | null {
  try {
    const raw = localStorage.getItem(keyForSlug(slug));
    if (!raw) return null;
    return parseSalonPersonalPageJson(raw);
  } catch {
    return null;
  }
}

/** Scrittura locale (cache `localStorage`). */
export function writeSalonPersonalPageData(slug: string, data: SalonPersonalPageData): void {
  try {
    localStorage.setItem(keyForSlug(slug), JSON.stringify(data));
  } catch {
    /* ignore storage failures */
  }
}

function salonPersonalPageHasContent(d: SalonPersonalPageData | null | undefined): boolean {
  if (!d) return false;
  if (d.galleryImageDataUrls.some(Boolean)) return true;
  return Boolean(
    d.heroSubtitle.trim() ||
      d.ownerIntro.trim() ||
      d.about.trim() ||
      d.strengths.trim() ||
      d.instagramUrl.trim() ||
      d.facebookUrl.trim() ||
      d.contactsNote.trim(),
  );
}

/**
 * Lettura **server prima** (pubblico, visibile su ogni dispositivo/app), con fallback alla cache `localStorage`.
 * Quando il server risponde, aggiorna anche la cache locale.
 *
 * Migrazione automatica: se passi `accessToken` (titolare) e il server è vuoto mentre la cache locale ha già
 * dati salvati prima dello storage server-side, li ripubblica una volta sul server (visibili anche nell'app).
 */
export async function readSalonPersonalPageDataAsync(
  slug: string,
  accessToken?: string | null,
): Promise<SalonPersonalPageData | null> {
  const serverRaw = await fetchServerPersonalRaw(slug);
  if (serverRaw) {
    const parsed = parseSalonPersonalPageJson(serverRaw);
    if (parsed) {
      try {
        localStorage.setItem(keyForSlug(slug), serverRaw);
      } catch {
        /* ignore */
      }
      return parsed;
    }
  }

  const local = readSalonPersonalPageData(slug);
  if (accessToken && !serverRaw && salonPersonalPageHasContent(local) && local) {
    void putServerPersonalRaw(slug, JSON.stringify(local), accessToken);
  }
  return local;
}

/**
 * Scrittura sul **server** (se `accessToken`: titolare autenticato) e nella cache `localStorage`.
 * Il server è la fonte di verità cross-device.
 */
export async function writeSalonPersonalPageDataAsync(
  slug: string,
  data: SalonPersonalPageData,
  accessToken?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  writeSalonPersonalPageData(slug, data);
  if (accessToken) {
    const ok = await putServerPersonalRaw(slug, JSON.stringify(data), accessToken);
    if (!ok) {
      return { ok: false, error: "Salvataggio del sito sul server non riuscito. Riprova tra poco." };
    }
  }
  return { ok: true };
}
