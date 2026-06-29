export function staffFallbackAvatar(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName.trim().charAt(0).toUpperCase();
  const initials = `${a || "S"}${b || "F"}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fb923c"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter,Arial,sans-serif" font-size="42" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
