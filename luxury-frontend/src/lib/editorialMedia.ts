/** Utility per media editoriali: URL first-party (`/…`) sempre ok; terze parti solo con consenso «editorial». */

function isFirstPartyMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  if (typeof window !== "undefined" && t.startsWith(window.location.origin)) return true;
  return false;
}

export function editorialImageUrl(url: string | undefined, allowed: boolean): string | undefined {
  if (!url?.trim()) return undefined;
  if (isFirstPartyMediaUrl(url)) return url;
  if (!allowed) return undefined;
  return url;
}

export function editorialBackgroundImage(
  gradient: string,
  imageUrl: string | undefined,
  allowed: boolean,
): string {
  const image = editorialImageUrl(imageUrl, allowed);
  if (!image) return gradient;
  return `${gradient}, url(${image})`;
}
