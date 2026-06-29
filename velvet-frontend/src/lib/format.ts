export function formatPriceEUR(priceCents: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}
