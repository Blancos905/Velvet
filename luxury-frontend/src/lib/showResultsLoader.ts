/** True finché l'elenco non è arrivato: niente riquadri vuoti al posto delle schede. */
export function showResultsLoader(
  query: {
    isPending: boolean;
    isFetching: boolean;
    isFetched: boolean;
    isError: boolean;
  },
  resultCount: number,
): boolean {
  if (query.isError || resultCount > 0) return false;
  return query.isPending || query.isFetching || !query.isFetched;
}
