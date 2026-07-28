/** Lunedì 1 gennaio 2024 UTC — ancoraggio per rotazioni editoriali settimanali. */
const EDITORIAL_WEEK_EPOCH_MS = Date.UTC(2024, 0, 1);

/** Indice settimana assoluto (0 = prima settimana dal 1 gen 2024). Stesso valore per tutti i client nella stessa settimana solare UTC. */
export function getEditorialWeekIndex(date: Date = new Date()): number {
  return Math.floor((date.getTime() - EDITORIAL_WEEK_EPOCH_MS) / (7 * 24 * 60 * 60 * 1000));
}

/** Seleziona `visibleCount` elementi dal pool, ruotando ogni settimana. */
export function selectWeeklyItems<T>(
  pool: readonly T[],
  visibleCount: number,
  weekIndex: number,
): T[] {
  if (pool.length === 0 || visibleCount <= 0) return [];
  if (pool.length <= visibleCount) return [...pool];
  const start = (weekIndex * visibleCount) % pool.length;
  const out: T[] = [];
  for (let i = 0; i < visibleCount; i++) {
    out.push(pool[(start + i) % pool.length]!);
  }
  return out;
}
