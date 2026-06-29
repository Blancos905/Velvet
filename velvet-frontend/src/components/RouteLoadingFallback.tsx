/** Fallback leggero per `React.lazy()` — evita flash bianco in WebView durante il code split. */
export function RouteLoadingFallback() {
  return (
    <div className="luxury-route-loading" role="status" aria-live="polite">
      <div className="luxury-route-loading__spinner" aria-hidden />
      <span className="luxury-route-loading__label">Caricamento…</span>
    </div>
  );
}
