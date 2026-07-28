import { apiFetch } from "../../api/client";
import type { MeSalonNotificationMessage, SuperAdminOverviewResponseDto } from "../../api/types";

function throwFromFailedResponse(status: number, text: string, statusText: string): never {
  const raw = (text || "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(raw.slice(0, 500) || statusText || `Errore HTTP ${status}`);
  }
  if (parsed && typeof parsed === "object") {
    const j = parsed as Record<string, unknown>;
    for (const k of ["message", "detail", "title"] as const) {
      const v = j[k];
      if (typeof v === "string" && v.trim()) throw new Error(v.trim());
    }
  }
  throw new Error(raw.slice(0, 500) || statusText || `Errore HTTP ${status}`);
}

/**
 * Usa lo stesso URL della dashboard: `GET /api/v1/admin/overview?includeSupportInbox=…`
 * così non dipende da path aggiuntivi che in alcuni ambienti rispondono 404.
 */
export async function fetchAdminSupportInbox(
  accessToken: string,
  fromSalons: boolean,
): Promise<MeSalonNotificationMessage[]> {
  const qs = new URLSearchParams({
    includeSupportInbox: "true",
    supportInboxFromSalonsOnly: String(fromSalons),
  });
  const path = `/api/v1/admin/overview?${qs.toString()}`;
  const r = await apiFetch(path, { accessToken });
  const text = await r.text();
  if (r.status === 404) {
    throw new Error(
      "Panoramica super admin (404): le richieste `/api` non raggiungono Spring Luxury o il contesto è errato. In dev: `npm run dev` + proxy verso la porta del backend (`VITE_PROXY_API_TARGET`).",
    );
  }
  if (!r.ok) throwFromFailedResponse(r.status, text, r.statusText);
  const body = JSON.parse(text) as SuperAdminOverviewResponseDto;
  return body.supportInboxMessages ?? [];
}

/** Segna come viste le richieste «Messaggi dai saloni» (azzera il numerino in header). */
export async function markSalonSupportInboxSeen(accessToken: string): Promise<void> {
  const r = await apiFetch("/api/v1/admin/overview/support-inbox/salons/mark-seen", {
    method: "POST",
    accessToken,
  });
  if (r.status === 404) {
    throw new Error("Endpoint segna-visto non trovato: aggiorna il backend Luxury.");
  }
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text?.trim().slice(0, 300) || `Errore HTTP ${r.status}`);
  }
}

export async function deleteAdminSupportInbox(accessToken: string, id: string): Promise<void> {
  const enc = encodeURIComponent(id);
  const paths = [
    `/api/v1/admin/overview/supportmessages/${enc}`,
    `/api/v1/admin/overview/support-inbox/${enc}`,
    `/api/v1/admin/support-inbox/${enc}`,
    `/api/v1/admin/assistenza/inbox/${enc}`,
  ];
  for (const path of paths) {
    const r = await apiFetch(path, { method: "DELETE", accessToken });
    const text = await r.text();
    if (r.status === 404) continue;
    if (!r.ok) throwFromFailedResponse(r.status, text, r.statusText);
    return;
  }
  throw new Error(
    "Archiviazione: 404 su tutti gli URL noti. Aggiorna il backend e verifica proxy / `VITE_API_BASE_URL`.",
  );
}
