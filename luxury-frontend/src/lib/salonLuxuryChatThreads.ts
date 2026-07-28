import type { SalonClientMembershipDto, SalonLuxuryChatInboxSummaryDto } from "../api/types";

/** Confronto UUID sede / organizationId tollerante al casing. */
export function sameSalonOrganizationId(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? "").trim().toLowerCase();
  const right = (b ?? "").trim().toLowerCase();
  return Boolean(left && right && left === right);
}

export function chatThreadKey(salonClientId: string, staffOperatorId?: string | null): string {
  const client = (salonClientId ?? "").trim().toLowerCase();
  const op = (staffOperatorId ?? "").trim().toLowerCase();
  return op ? `${client}:${op}` : client;
}

/** Etichetta breve per il tipo di conversazione lato cliente. */
export function consumerChatThreadKindLabel(staffOperatorId?: string | null): string {
  return staffOperatorId?.trim() ? "Operatore" : "Salone generale";
}

/** Titolo conversazione lato cliente (sidebar / picker). */
export function consumerChatThreadTitle(
  thread: Pick<SalonLuxuryChatInboxSummaryDto, "staffOperatorId" | "counterpartyLabel">,
  salonName?: string | null,
): string {
  if (thread.staffOperatorId?.trim()) {
    return thread.counterpartyLabel?.trim() || "Operatore";
  }
  return salonName?.trim() || thread.counterpartyLabel?.trim() || "Salone generale";
}

/** Lista conversazioni cliente: unisce membership (es. appena «diventa cliente») con inbox summaries. */
export function mergeConsumerChatThreads(
  memberships: SalonClientMembershipDto[],
  summaries: SalonLuxuryChatInboxSummaryDto[],
): SalonLuxuryChatInboxSummaryDto[] {
  const byThread = new Map<string, SalonLuxuryChatInboxSummaryDto>();

  for (const m of memberships) {
    const salonClientId = m.id?.trim();
    if (!salonClientId) continue;
    const key = chatThreadKey(salonClientId, null);
    byThread.set(key, {
      salonClientId,
      staffOperatorId: null,
      counterpartyLabel: m.name?.trim() || "Salone",
      unreadCount: 0,
      lastPreview: "",
      lastMessageAt: null,
      lastSender: null,
    });
  }

  for (const s of summaries) {
    const salonClientId = s.salonClientId?.trim();
    if (!salonClientId) continue;
    const key = chatThreadKey(salonClientId, s.staffOperatorId);
    const existing = byThread.get(key);
    byThread.set(key, existing ? { ...existing, ...s, counterpartyLabel: s.counterpartyLabel?.trim() || existing.counterpartyLabel } : s);
  }

  return [...byThread.values()].sort((a, b) => {
    const ta = a.lastMessageAt ?? "";
    const tb = b.lastMessageAt ?? "";
    if (ta && tb && ta !== tb) return tb.localeCompare(ta);
    if (ta && !tb) return -1;
    if (!ta && tb) return 1;
    const la = (a.counterpartyLabel ?? "").localeCompare(b.counterpartyLabel ?? "", "it", { sensitivity: "base" });
    if (la !== 0) return la;
    return chatThreadKey(a.salonClientId, null).localeCompare(chatThreadKey(b.salonClientId, null));
  });
}

export function salonChatMessagesQueryKey(
  salonClientId: string,
  staffOperatorId: string | null | undefined,
  accessToken: string,
  catalogLocationId: string,
  listClientsAsSalonSide: boolean,
) {
  return [
    "me",
    "salon-chat",
    "messages",
    salonClientId,
    staffOperatorId ?? "",
    accessToken,
    catalogLocationId,
    listClientsAsSalonSide,
  ] as const;
}

export const SALON_CHAT_INBOX_QUERY_KEY = ["me", "salon-chat", "inbox-summaries"] as const;

export function invalidateSalonLuxuryChatQueries(queryClient: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<unknown> }) {
  void queryClient.invalidateQueries({ queryKey: [...SALON_CHAT_INBOX_QUERY_KEY] });
  void queryClient.invalidateQueries({ queryKey: ["me", "salon-chat", "messages"] });
}
