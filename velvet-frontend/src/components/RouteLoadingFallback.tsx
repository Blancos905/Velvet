/** Fallback leggero per `React.lazy()` — evita flash bianco in WebView durante il code split. */
export function RouteLoadingFallback() {
  return (
    <div className="velvet-route-loading" role="status" aria-live="polite">
      <div className="velvet-route-loading__spinner" aria-hidden />
      <span className="velvet-route-loading__label">Caricamento…</span>
    </div>
  );
}
