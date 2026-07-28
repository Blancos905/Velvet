type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: { fields?: Record<string, string> };
};

/**
 * Legge il corpo di una risposta errore (JSON {@code ApiError} o testo/HTML) per mostrare un messaggio utile in UI.
 */
export async function httpApiErrorMessage(res: Response, fallbackPrefix: string): Promise<string> {
  let msg = `${fallbackPrefix} (${res.status}).`;
  let text: string;
  try {
    text = await res.text();
  } catch {
    return msg;
  }
  if (!text.trim()) return msg;
  try {
    const j = JSON.parse(text) as ApiErrorBody;
    const fields = j.details?.fields;
    if (fields && typeof fields === "object") {
      const lines = Object.values(fields).filter((v): v is string => typeof v === "string" && v.length > 0);
      if (lines.length > 0) return lines.join(" ");
    }
    if (typeof j.message === "string" && j.message.length > 0) return j.message;
  } catch {
    const t = text.trim();
    return t.length > 400 ? `${t.slice(0, 400)}…` : t;
  }
  return msg;
}
