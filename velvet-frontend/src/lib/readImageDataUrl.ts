/** Limite predefinito per singolo upload (data URL in localStorage). */
export const READ_IMAGE_FILE_MAX_BYTES = 8 * 1024 * 1024; // 8 MiB

/** Carousel home salone / gallery Esplora: file leggermente più grandi ammessi. */
export const READ_IMAGE_SITE_FILE_MAX_BYTES = 12 * 1024 * 1024; // 12 MiB

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|heic|heif|avif|bmp)$/i;

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function formatMaxMegabytesIt(maxBytes: number): string {
  const mb = maxBytes / (1024 * 1024);
  return mb.toLocaleString("it-IT", { maximumFractionDigits: mb >= 10 ? 0 : 1, minimumFractionDigits: 0 });
}

/** `FileReader` → data URL; rifiuta file troppo grandi (evita quota localStorage). */
export function readImageFileAsDataUrl(file: File, maxBytes = READ_IMAGE_FILE_MAX_BYTES): Promise<string> {
  if (!looksLikeImageFile(file)) {
    return Promise.reject(new Error("Seleziona un file immagine (PNG, JPEG, WebP, …)."));
  }
  if (file.size > maxBytes) {
    return Promise.reject(
      new Error(
        `File troppo grande (max ${formatMaxMegabytesIt(maxBytes)} MB per file). Comprimi l’immagine o scegli un file più piccolo.`,
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const out = r.result;
      if (typeof out === "string") resolve(out);
      else reject(new Error("Lettura file non riuscita."));
    };
    r.onerror = () => reject(new Error("Lettura file non riuscita."));
    r.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(sourceDataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile elaborare l'immagine selezionata."));
    img.src = sourceDataUrl;
  });
}

function applyHighQualityCanvasDraw(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
}

type ResizeImageOptions = {
  maxSide: number;
  quality: number;
  /** Se true, non ricodifica JPEG/WebP già entro `maxSide` (evita perdita generazionale). */
  preserveIfWithinMaxSide?: boolean;
};

/**
 * Ridimensiona solo se supera `maxSide`, altrimenti restituisce l'originale.
 * Output JPEG quando serve elaborazione canvas.
 */
async function resizeImageDataUrl(sourceDataUrl: string, options: ResizeImageOptions): Promise<string> {
  const { maxSide, quality, preserveIfWithinMaxSide = true } = options;

  let image: HTMLImageElement;
  try {
    image = await loadImageFromDataUrl(sourceDataUrl);
  } catch {
    return sourceDataUrl;
  }

  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;
  if (!w || !h) {
    return sourceDataUrl;
  }

  const longest = Math.max(w, h);
  if (preserveIfWithinMaxSide && longest <= maxSide) {
    return sourceDataUrl;
  }

  const scale = Math.min(1, maxSide / longest);
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;

  applyHighQualityCanvasDraw(ctx);
  try {
    ctx.drawImage(image, 0, 0, outW, outH);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return sourceDataUrl;
  }
}

function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name);
}

type StaffPhotoOptions = {
  maxSide?: number;
  quality?: number;
};

/**
 * Versione "avatar": ridimensiona e comprime lato client per evitare payload enormi.
 */
export async function readImageFileAsStaffPhotoDataUrl(
  file: File,
  options: StaffPhotoOptions = {},
): Promise<string> {
  if (!looksLikeImageFile(file)) {
    throw new Error("Seleziona un file immagine (PNG, JPEG, WebP, …).");
  }
  const sourceDataUrl = await readImageFileAsDataUrl(file);
  const maxSide = Math.max(120, Math.min(640, Math.trunc(options.maxSide ?? 320)));
  const quality = Math.max(0.45, Math.min(0.92, options.quality ?? 0.82));

  return resizeImageDataUrl(sourceDataUrl, {
    maxSide,
    quality,
    preserveIfWithinMaxSide: false,
  });
}

type GalleryPhotoOptions = {
  maxSide?: number;
  quality?: number;
  maxBytes?: number;
};

/**
 * Gallery vetrina / Esplora: ridimensiona solo se necessario; non ricomprime file già entro i limiti.
 * SVG resta senza rielaborazione (canvas spesso inadeguato).
 */
export async function readImageFileAsGalleryDataUrl(
  file: File,
  options: GalleryPhotoOptions = {},
): Promise<string> {
  if (!looksLikeImageFile(file)) {
    throw new Error("Seleziona un file immagine (PNG, JPEG, WebP, …).");
  }
  if (isSvgFile(file)) {
    return readImageFileAsDataUrl(file, options.maxBytes ?? READ_IMAGE_SITE_FILE_MAX_BYTES);
  }
  const sourceDataUrl = await readImageFileAsDataUrl(
    file,
    options.maxBytes ?? READ_IMAGE_SITE_FILE_MAX_BYTES,
  );
  const maxSide = Math.max(960, Math.min(3200, Math.trunc(options.maxSide ?? 2560)));
  const quality = Math.max(0.82, Math.min(0.95, options.quality ?? 0.9));

  return resizeImageDataUrl(sourceDataUrl, { maxSide, quality, preserveIfWithinMaxSide: true });
}

type SiteImageOptions = {
  maxSide?: number;
  quality?: number;
};

/**
 * Carousel home salone (5 slot brand): alta qualità, retina-ready, senza ricodifica inutile.
 */
export async function readImageFileAsSiteImageDataUrl(
  file: File,
  options: SiteImageOptions = {},
): Promise<string> {
  if (!looksLikeImageFile(file)) {
    throw new Error("Seleziona un file immagine (PNG, JPEG, WebP, …).");
  }
  if (isSvgFile(file)) {
    return readImageFileAsDataUrl(file, READ_IMAGE_SITE_FILE_MAX_BYTES);
  }
  const sourceDataUrl = await readImageFileAsDataUrl(file, READ_IMAGE_SITE_FILE_MAX_BYTES);
  const maxSide = Math.max(1280, Math.min(3200, Math.trunc(options.maxSide ?? 2560)));
  const quality = Math.max(0.88, Math.min(0.95, options.quality ?? 0.92));

  return resizeImageDataUrl(sourceDataUrl, { maxSide, quality, preserveIfWithinMaxSide: true });
}

type ServicePhotoOptions = {
  maxSide?: number;
  quality?: number;
};

/**
 * Foto servizio: compressione lato client bilanciata (piu' leggera della gallery)
 * per evitare freeze percepiti durante upload/salvataggio.
 */
export function readImageFileAsServicePhotoDataUrl(
  file: File,
  options: ServicePhotoOptions = {},
): Promise<string> {
  return readImageFileAsGalleryDataUrl(file, {
    maxSide: options.maxSide ?? 1600,
    quality: options.quality ?? 0.86,
    maxBytes: READ_IMAGE_FILE_MAX_BYTES,
  });
}
