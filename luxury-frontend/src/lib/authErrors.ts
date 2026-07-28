/** Errore API tipico quando JWT assente, scaduto o non valido (Spring `LuxuryApiAuthenticationEntryPoint`). */
export function isLuxuryUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes("autenticazione richiesta") ||
    m.includes("sessione non valida") ||
    m.includes("401") ||
    m.includes("unauthorized")
  );
}
