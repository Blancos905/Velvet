/** Utility per rispettare il consenso cookie «editorial» (immagini Unsplash / terze parti). */

export function editorialImageUrl(url: string | undefined, allowed: boolean): string | undefined {
  if (!allowed || !url?.trim()) return undefined;
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
