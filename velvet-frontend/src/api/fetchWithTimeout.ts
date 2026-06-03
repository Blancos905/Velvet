/** Timeout fetch: in dev fallisce in fretta se Spring non è su :8080 (evita UI bloccata in WebView). */
export const API_FETCH_TIMEOUT_MS = import.meta.env.DEV ? 8_000 : 30_000;

export function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  if (init?.signal) {
    return fetch(url, init);
  }
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(API_FETCH_TIMEOUT_MS),
  });
}

export function isLikelyNetworkFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const name = error.name.toLowerCase();
  const msg = error.message.toLowerCase();
  return (
    name === "aborterror" ||
    name === "timeouterror" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("econnrefused")
  );
}
