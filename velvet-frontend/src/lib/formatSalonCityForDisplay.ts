const LOCALE = "it-IT";

/**
 * Normalizza la città del salone solo per la UI: ogni parola con iniziale maiuscola (es. "milano" → "Milano",
 * "REGGIO EMILIA" → "Reggio Emilia"). Non modificare i dati inviati al backend.
 */
export function formatSalonCityForDisplay(city: string | null | undefined): string | null {
  if (city == null) return null;
  const trimmed = city.trim();
  if (!trimmed) return null;
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      const first = word.charAt(0).toLocaleUpperCase(LOCALE);
      const rest = word.slice(1).toLocaleLowerCase(LOCALE);
      return first + rest;
    })
    .join(" ");
}
