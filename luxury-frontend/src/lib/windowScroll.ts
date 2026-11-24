/** Scroll della finestra (home di ricerca e pagine pubbliche). */
export function readWindowScrollY(): number {
  if (typeof window === "undefined") return 0;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

export function writeWindowScrollY(y: number): void {
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
}

/**
 * Ripristina lo scroll anche se il contenuto (immagini della home) cresce
 * subito dopo il paint. Si ferma appena la pagina è alta abbastanza.
 */
export function scheduleScrollRestore(y: number): () => void {
  let stopped = false;
  const apply = () => {
    if (stopped) return;
    writeWindowScrollY(y);
    const max =
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    if (max + 8 >= y) stopped = true;
  };
  apply();
  const timers = [50, 160, 420].map((ms) => window.setTimeout(apply, ms));
  return () => {
    stopped = true;
    for (const id of timers) window.clearTimeout(id);
  };
}
