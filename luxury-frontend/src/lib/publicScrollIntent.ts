export type HistoryNavigationType = "POP" | "PUSH" | "REPLACE";

/** Cosa fare allo scroll dopo un cambio di route. */
export type PublicScrollIntent = "native-top" | "keep" | "restore" | "top";

/**
 * Indietro (POP) torna al punto salvato.
 * Un link nuovo va in cima. Dentro l'account lo scroll resta com'è.
 * Il ritorno all'hub nativo va sempre in cima.
 */
export function publicScrollIntent(input: {
  navigationType: HistoryNavigationType;
  accountInternal: boolean;
  nativeHubReturn: boolean;
}): PublicScrollIntent {
  if (input.nativeHubReturn) return "native-top";
  if (input.accountInternal) return "keep";
  if (input.navigationType === "POP") return "restore";
  return "top";
}
