/** Allineare a `luxury.logging.retention-days` nel backend Spring (`luxuryBackendBasePaths.publicLegalMeta`). */
const parsedRetention = Number(import.meta.env.VITE_LOG_RETENTION_DAYS);

export const logRetentionDays =
  Number.isFinite(parsedRetention) && parsedRetention > 0 ? Math.floor(parsedRetention) : 180;
